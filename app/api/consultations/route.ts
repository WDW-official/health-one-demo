import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import Consultation from '@/lib/models/Consultation';
import Doctor from '@/lib/models/Doctor';
import Patient from '@/lib/models/Patient';
import { getNextAppointmentNumber } from '@/lib/appointment-number';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';
import { getPagination, getRequestUser } from '../_lib/request-auth';
import { getApiErrorMessage } from '../_lib/error-message';
import {
  buildBillingItemsFromProcedures,
  upsertBillingForConsultation,
} from '../billing/_helpers';
import { deductConsultationConsumables, estimateConsultationConsumables } from '@/lib/consumable-usage';

function toAppConsultation(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    presentingComplaints: plain.presentingComplaints ?? '',
    examination: plain.examination ?? '',
    treatmentPlan: plain.treatmentPlan ?? '',
    prescription: plain.prescription ?? plain.prescriptions ?? '',
    prescriptions: plain.prescriptions ?? plain.prescription ?? '',
    nextVisitDate: plain.nextVisitDate ?? plain.followUpDate ?? null,
    followUpDate: plain.followUpDate ?? plain.nextVisitDate ?? null,
    procedures: plain.procedures ?? [],
    estimatedConsumables: plain.estimatedConsumables ?? [],
    actualConsumables: plain.actualConsumables ?? [],
    consumablesDeductedAt: plain.consumablesDeductedAt ?? null,
    paymentAmount: plain.paymentAmount ?? 0,
    paymentStatus: plain.paymentStatus ?? 'unpaid',
    chartBlocks: plain.chartBlocks ?? [],
    attachments: plain.attachments ?? [],
  };
}

function getNextVisitDateTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

function normalizeProcedureStatuses(procedures: any[] = []) {
  return procedures.map((procedure) => ({
    ...procedure,
    status: procedure.status || 'completed',
  }));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 20, 200);
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    const user = getRequestUser(request);

    let query: any = {};

    if (patientId) query.patientId = patientId;
    if (user?.role === 'doctor') {
      if (doctorId && doctorId !== user.doctorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (user.doctorId) {
        query.doctorId = user.doctorId;
      }
    } else if (doctorId) {
      query.doctorId = doctorId;
    }

    const consultations = await Consultation.find(query)
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Consultation.countDocuments(query);

    const normalized = consultations.map(toAppConsultation);
    return jsonOk(normalized, { consultations: normalized, total, limit, skip });
  } catch (error) {
    console.error('Get consultations error:', error);
    return jsonError('Failed to fetch consultations');
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const required = ['patientId', 'doctorId', 'diagnosis', 'treatment'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Get doctor and patient names
    const [doctor, patient] = await Promise.all([
      Doctor.findById(body.doctorId),
      Patient.findById(body.patientId),
    ]);

    const procedures = normalizeProcedureStatuses(body.procedures ?? []);
    const estimatedConsumables = await estimateConsultationConsumables(procedures);

    const consultation = new Consultation({
      ...body,
      appointmentId: body.appointmentId || '',
      presentingComplaints: body.presentingComplaints ?? '',
      examination: body.examination ?? '',
      treatmentPlan: body.treatmentPlan ?? '',
      procedures,
      estimatedConsumables,
      actualConsumables: body.actualConsumables ?? [],
      prescriptions: body.prescriptions ?? body.prescription ?? '',
      paymentAmount: Number(body.paymentAmount || 0),
      paymentStatus: body.paymentStatus || 'unpaid',
      followUpDate: body.followUpDate ?? body.nextVisitDate ?? null,
      chartBlocks: body.chartBlocks ?? [],
      attachments: body.attachments ?? [],
      doctorName: doctor?.name,
      patientName: patient?.firstName + ' ' + patient?.lastName,
    });

    await consultation.save();

    const nextVisitDateTime = getNextVisitDateTime(body.nextVisitDate ?? body.followUpDate);
    let nextAppointment = null;
    if (nextVisitDateTime && nextVisitDateTime.getTime() >= Date.now()) {
      const appointmentNumber = await getNextAppointmentNumber(body.patientId, patient?.mrn);
      nextAppointment = await Appointment.create({
        appointmentNumber,
        patientId: body.patientId,
        doctorId: body.doctorId,
        doctorName: doctor?.name,
        patientName: patient?.firstName + ' ' + patient?.lastName,
        dateTime: nextVisitDateTime,
        duration: 60,
        type: body.procedures?.[0]?.procedure || 'Dental Consultation',
        status: 'scheduled',
        notes: `Follow-up from consultation ${consultation.id || consultation._id}`,
      });

      if (!body.appointmentId) {
        consultation.appointmentId = String(nextAppointment._id);
        await consultation.save();
      }
    }

    const billing = await upsertBillingForConsultation(
      consultation,
      buildBillingItemsFromProcedures(consultation.procedures || [])
    );
    const deduction = await deductConsultationConsumables(consultation, getRequestUser(request));
    if (deduction.deducted) {
      consultation.consumablesDeductedAt = new Date();
      await consultation.save();
    }

    return jsonCreated(toAppConsultation(consultation), {
      message: 'Consultation created successfully',
      consultation: toAppConsultation(consultation),
      nextAppointment,
      billing,
    });
  } catch (error) {
    console.error('Create consultation error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to create consultation'), 400);
  }
}
