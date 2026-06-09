import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import Doctor from '@/lib/models/Doctor';
import Patient from '@/lib/models/Patient';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';
import { getPagination, getRequestUser } from '../_lib/request-auth';
import { getApiErrorMessage } from '../_lib/error-message';

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
    chartBlocks: plain.chartBlocks ?? [],
    attachments: plain.attachments ?? [],
  };
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

    const consultation = new Consultation({
      ...body,
      appointmentId: body.appointmentId || '',
      presentingComplaints: body.presentingComplaints ?? '',
      examination: body.examination ?? '',
      treatmentPlan: body.treatmentPlan ?? '',
      prescriptions: body.prescriptions ?? body.prescription ?? '',
      followUpDate: body.followUpDate ?? body.nextVisitDate ?? null,
      chartBlocks: body.chartBlocks ?? [],
      attachments: body.attachments ?? [],
      doctorName: doctor?.name,
      patientName: patient?.firstName + ' ' + patient?.lastName,
    });

    await consultation.save();

    return jsonCreated(toAppConsultation(consultation), {
      message: 'Consultation created successfully',
      consultation: toAppConsultation(consultation),
    });
  } catch (error) {
    console.error('Create consultation error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to create consultation'), 400);
  }
}
