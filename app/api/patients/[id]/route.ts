import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { Types } from 'mongoose';
import { hasSuperAdminAccess } from '../../_lib/request-auth';
import { jsonError, jsonOk } from '../../_lib/response';
import { getApiErrorMessage } from '../../_lib/error-message';

function normalizePatient(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
    mrn: plain.mrn || `ARC${String(String(plain._id).slice(-6)).toUpperCase()}`,
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
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const patient = await Patient.findById(id).lean();

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const normalized = normalizePatient(patient);
    return jsonOk(normalized, { patient: normalized });
  } catch (error) {
    console.error('Get patient error:', error);
    return jsonError('Failed to fetch patient');
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
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check for duplicate email/phone if changing
    if (body.email || body.phone) {
      const existing = await Patient.findOne({
        _id: { $ne: id },
        $or: [
          ...(body.email ? [{ email: body.email }] : []),
          ...(body.phone ? [{ phone: body.phone }] : []),
        ],
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Patient with this email or phone already exists' },
          { status: 409 }
        );
      }
    }

    const patient = await Patient.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).lean();

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const normalized = normalizePatient(patient);
    return jsonOk(normalized, { message: 'Patient updated successfully', patient: normalized });
  } catch (error) {
    console.error('Update patient error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to update patient'), 400);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSuperAdminAccess(request)) {
      return NextResponse.json({ error: 'Only superadmins can delete patients' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const patient = await Patient.findByIdAndDelete(id);

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return jsonOk(null, { message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Delete patient error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to delete patient'), 400);
  }
}
