import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import { Types } from 'mongoose';
import { getRequestUser, hasSuperAdminAccess } from '../../_lib/request-auth';
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

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid consultation ID' },
        { status: 400 }
      );
    }

    const consultation = await Consultation.findById(id).lean();

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

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid consultation ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateData: any = { ...body };
    if ('appointmentId' in body) updateData.appointmentId = body.appointmentId || '';
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

    let consultation = await Consultation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    const estimatedConsumables = await estimateConsultationConsumables(consultation.procedures || []);
    consultation = await Consultation.findByIdAndUpdate(
      id,
      { estimatedConsumables },
      { new: true, runValidators: true }
    ).lean();

    const billing = await upsertBillingForConsultation(
      consultation,
      buildBillingItemsFromProcedures(consultation.procedures || [])
    );
    const deduction = await deductConsultationConsumables(consultation, getRequestUser(request));
    if (deduction.deducted) {
      consultation = await Consultation.findByIdAndUpdate(
        id,
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

    await Consultation.findByIdAndDelete(id);

    return jsonOk(null, { message: 'Consultation deleted successfully' });
  } catch (error) {
    console.error('Delete consultation error:', error);
    return jsonError('Failed to delete consultation');
  }
}
