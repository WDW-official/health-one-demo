import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import { Types } from 'mongoose';
import { buildHospitalQuery, getRequestUser, hasSuperAdminAccess } from '../../_lib/request-auth';
import { jsonError, jsonOk } from '../../_lib/response';
import { getApiErrorMessage } from '../../_lib/error-message';
import {
  buildBillingItemsFromProcedures,
  upsertBillingForConsultation,
} from '../../billing/_helpers';
import { deductConsultationConsumables, estimateConsultationConsumables } from '@/lib/consumable-usage';

function toAppConsultation(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    clinicType: plain.clinicType ?? 'dental',
    specialtyFields: plain.specialtyFields ?? {},
    presentingComplaints: plain.presentingComplaints ?? '',
    examination: plain.examination ?? '',
    treatmentPlan: plain.treatmentPlan ?? '',
    clinicalNotes:
      plain.clinicalNotes && plain.clinicalNotes.length > 0
        ? plain.clinicalNotes
        : buildLegacyClinicalNotes(plain),
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

function buildClinicalNoteSnapshot(source: any, user: any) {
  return {
    enteredAt: new Date(),
    enteredByUserId: user?.id || '',
    enteredByName: user?.name || user?.email || '',
    clinicType: source.clinicType ?? 'dental',
    specialtyFields: source.specialtyFields ?? {},
    presentingComplaints: source.presentingComplaints ?? '',
    impressionDiagnosis: source.diagnosis ?? source.impressionDiagnosis ?? '',
    treatmentPlan: source.treatmentPlan ?? '',
    notes: source.notes ?? '',
  };
}

function buildLegacyClinicalNotes(source: any) {
  const hasClinicalContent = [
    source.presentingComplaints,
    source.diagnosis,
    source.treatmentPlan,
    source.notes,
  ].some((value) => String(value || '').trim().length > 0);

  if (!hasClinicalContent) return [];

  return [
    {
      enteredAt: source.createdAt || source.updatedAt || new Date(),
      enteredByUserId: '',
      enteredByName: source.doctorName || '',
      clinicType: source.clinicType ?? 'dental',
      specialtyFields: source.specialtyFields ?? {},
      presentingComplaints: source.presentingComplaints ?? '',
      impressionDiagnosis: source.diagnosis ?? '',
      treatmentPlan: source.treatmentPlan ?? '',
      notes: source.notes ?? '',
    },
  ];
}

function clinicalNoteChanged(previous: any, next: any) {
  const fields = [
    ['presentingComplaints', 'presentingComplaints'],
    ['diagnosis', 'diagnosis'],
    ['treatmentPlan', 'treatmentPlan'],
    ['notes', 'notes'],
    ['clinicType', 'clinicType'],
    ['specialtyFields', 'specialtyFields'],
  ];

    return fields.some(([previousKey, nextKey]) => {
    if (!(nextKey in next)) return false;
    return JSON.stringify(previous?.[previousKey] || '') !== JSON.stringify(next?.[nextKey] || '');
  });
}

function normalizeProcedureStatuses(procedures: any[] = []) {
  return procedures.map((procedure) => ({
    ...procedure,
    status: procedure.status || 'completed',
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = getRequestUser(request);
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid consultation ID' },
        { status: 400 }
      );
    }

    const consultation = await Consultation.findOne(buildHospitalQuery(user, { _id: id })).lean();

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    return jsonOk(toAppConsultation(consultation), { consultation: toAppConsultation(consultation) });
  } catch (error) {
    console.error('Get consultation error:', error);
    return jsonError('Failed to fetch consultation');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid consultation ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const existingConsultation = await Consultation.findOne(buildHospitalQuery(user, { _id: id })).lean();

    if (!existingConsultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    const updateData: any = { ...body };
    delete updateData.clinicalNotes;
    if ('appointmentId' in body) updateData.appointmentId = body.appointmentId || '';
    if ('clinicType' in body) updateData.clinicType = body.clinicType || 'dental';
    if ('specialtyFields' in body) updateData.specialtyFields = body.specialtyFields ?? {};
    if ('presentingComplaints' in body) updateData.presentingComplaints = body.presentingComplaints ?? '';
    if ('examination' in body) updateData.examination = body.examination ?? '';
    if ('treatmentPlan' in body) updateData.treatmentPlan = body.treatmentPlan ?? '';
    if ('procedures' in body) updateData.procedures = normalizeProcedureStatuses(body.procedures ?? []);
    if ('actualConsumables' in body) updateData.actualConsumables = body.actualConsumables ?? [];
    if ('prescriptions' in body || 'prescription' in body) {
      updateData.prescriptions = body.prescriptions ?? body.prescription ?? '';
    }
    if ('paymentAmount' in body) updateData.paymentAmount = Number(body.paymentAmount || 0);
    if ('paymentStatus' in body) updateData.paymentStatus = body.paymentStatus || 'unpaid';
    if ('followUpDate' in body || 'nextVisitDate' in body) {
      updateData.followUpDate = body.followUpDate ?? body.nextVisitDate ?? null;
    }
    if ('chartBlocks' in body) updateData.chartBlocks = body.chartBlocks ?? [];
    if ('attachments' in body) updateData.attachments = body.attachments ?? [];
    if (clinicalNoteChanged(existingConsultation, body)) {
      const nextClinicalNote = buildClinicalNoteSnapshot(
        {
          presentingComplaints:
            'presentingComplaints' in body
              ? body.presentingComplaints
              : existingConsultation.presentingComplaints,
          diagnosis: 'diagnosis' in body ? body.diagnosis : existingConsultation.diagnosis,
          treatmentPlan:
            'treatmentPlan' in body ? body.treatmentPlan : existingConsultation.treatmentPlan,
          notes: 'notes' in body ? body.notes : existingConsultation.notes,
          clinicType: 'clinicType' in body ? body.clinicType : existingConsultation.clinicType,
          specialtyFields:
            'specialtyFields' in body ? body.specialtyFields : existingConsultation.specialtyFields,
        },
        user
      );
      const existingClinicalNotes = Array.isArray(existingConsultation.clinicalNotes)
        ? existingConsultation.clinicalNotes
        : [];

      if (existingClinicalNotes.length === 0) {
        updateData.clinicalNotes = [
          ...buildLegacyClinicalNotes(existingConsultation),
          nextClinicalNote,
        ];
      } else {
        updateData.$push = {
          ...(updateData.$push || {}),
          clinicalNotes: nextClinicalNote,
        };
      }
    }

    const updateOperation = updateData.$push
      ? {
          $set: Object.fromEntries(
            Object.entries(updateData).filter(([key]) => key !== '$push')
          ),
          $push: updateData.$push,
        }
      : updateData;

    let consultation = await Consultation.findOneAndUpdate(
      buildHospitalQuery(user, { _id: id }),
      updateOperation,
      { new: true, runValidators: true }
    ).lean();

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    const estimatedConsumables = await estimateConsultationConsumables(
      consultation.procedures || [],
      user.hospitalId || null
    );
    consultation = await Consultation.findOneAndUpdate(
      buildHospitalQuery(user, { _id: id }),
      { estimatedConsumables },
      { new: true, runValidators: true }
    ).lean();

    const billing = await upsertBillingForConsultation(
      consultation,
      buildBillingItemsFromProcedures(consultation.procedures || [])
    );
    const deduction = await deductConsultationConsumables(consultation, user);
    if (deduction.deducted) {
      consultation = await Consultation.findOneAndUpdate(
        buildHospitalQuery(user, { _id: id }),
        { consumablesDeductedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();
    }
    const normalized = toAppConsultation(consultation);

    return jsonOk(normalized, {
      message: 'Consultation updated successfully',
      consultation: normalized,
      billing,
    });
  } catch (error) {
    console.error('Update consultation error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to update consultation'), 400);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSuperAdminAccess(request)) {
      return NextResponse.json({ error: 'Only superadmins can delete consultations' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid consultation ID' },
        { status: 400 }
      );
    }

    await Consultation.findOneAndDelete(buildHospitalQuery(getRequestUser(request), { _id: id }));

    return jsonOk(null, { message: 'Consultation deleted successfully' });
  } catch (error) {
    console.error('Delete consultation error:', error);
    return jsonError('Failed to delete consultation');
  }
}
