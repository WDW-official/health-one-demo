import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Doctor from '@/lib/models/Doctor';
import { Types } from 'mongoose';
import { buildHospitalQuery, getRequestUser, hasSuperAdminAccess } from '../../_lib/request-auth';
import { jsonError, jsonOk } from '../../_lib/response';

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
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    const doctor = await Doctor.findOne(buildHospitalQuery(user, { _id: id })).lean();

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    return jsonOk(doctor, { doctor });
  } catch (error) {
    console.error('Get doctor error:', error);
    return jsonError('Failed to fetch doctor');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update doctors' }, { status: 403 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const doctor = await Doctor.findOneAndUpdate(
      buildHospitalQuery(user, { _id: id }),
      body,
      { new: true, runValidators: true }
    ).lean();

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    return jsonOk(doctor, { message: 'Doctor updated successfully', doctor });
  } catch (error) {
    console.error('Update doctor error:', error);
    return jsonError('Failed to update doctor');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSuperAdminAccess(request)) {
      return NextResponse.json({ error: 'Only superadmins can delete doctors' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    // Soft delete
    const doctor = await Doctor.findOneAndUpdate(
      buildHospitalQuery(getRequestUser(request), { _id: id }),
      { isActive: false },
      { new: true }
    );

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    return jsonOk(null, { message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return jsonError('Failed to delete doctor');
  }
}
