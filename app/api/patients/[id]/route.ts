import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { Types } from 'mongoose';
import { buildHospitalQuery, getRequestUser, hasSuperAdminAccess } from '../../_lib/request-auth';
import { jsonError, jsonOk } from '../../_lib/response';
import { getApiErrorMessage } from '../../_lib/error-message';
import { formatPatientMrn, getHospitalMrnPrefix } from '@/lib/patient-mrn';

async function normalizePatient(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const prefix = await getHospitalMrnPrefix(plain.hospitalId);
  return {
    ...plain,
    id: plain.id || String(plain._id),
    mrn: plain.mrn || formatPatientMrn(prefix, 0),
  };
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
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const patient = await Patient.findOne(buildHospitalQuery(user, { _id: id })).lean();

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const normalized = await normalizePatient(patient);
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

    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      const existing = await Patient.findOne(buildHospitalQuery(user, {
        _id: { $ne: id },
        $or: [
          ...(body.email ? [{ email: body.email }] : []),
          ...(body.phone ? [{ phone: body.phone }] : []),
        ],
      }));

      if (existing) {
        return NextResponse.json(
          { error: 'Patient with this email or phone already exists' },
          { status: 409 }
        );
      }
    }

    const patient = await Patient.findOneAndUpdate(
      buildHospitalQuery(user, { _id: id }),
      body,
      { new: true, runValidators: true }
    ).lean();

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const normalized = await normalizePatient(patient);
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

    const patient = await Patient.findOneAndDelete(buildHospitalQuery(getRequestUser(request), { _id: id }));

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
