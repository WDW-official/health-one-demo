import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import { Types } from 'mongoose';
import { hasSuperAdminAccess } from '../../_lib/request-auth';
import { jsonError, jsonOk } from '../../_lib/response';
import { getApiErrorMessage } from '../../_lib/error-message';

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

    const consultation = await Consultation.findByIdAndUpdate(
      id,
      {
        ...body,
        appointmentId: body.appointmentId || '',
        presentingComplaints: body.presentingComplaints ?? '',
        examination: body.examination ?? '',
        treatmentPlan: body.treatmentPlan ?? '',
        prescriptions: body.prescriptions ?? body.prescription,
        followUpDate: body.followUpDate ?? body.nextVisitDate,
        chartBlocks: body.chartBlocks ?? [],
        attachments: body.attachments ?? [],
      },
      { new: true, runValidators: true }
    ).lean();

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    return jsonOk(toAppConsultation(consultation), {
      message: 'Consultation updated successfully',
      consultation: toAppConsultation(consultation),
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
