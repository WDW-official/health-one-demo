import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { jsonError, jsonOk } from '../../../_lib/response';
import { getPagination, getRequestUser } from '../../../_lib/request-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    await connectDB();

    const { doctorId } = await params;
    const user = getRequestUser(request);
    const { limit, skip } = getPagination(new URL(request.url).searchParams, 10, 100);

    if (user?.role === 'doctor' && user.doctorId && user.doctorId !== doctorId) {
      return jsonError('Forbidden', 403);
    }

    const patients = await Patient.find({
      assignedDoctorId: doctorId,
      isActive: true,
    })
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Patient.countDocuments({
      assignedDoctorId: doctorId,
      isActive: true,
    });

    return jsonOk(patients, { patients, total, limit, skip });
  } catch (error) {
    console.error('Get patients by doctor error:', error);
    return jsonError('Failed to fetch patients');
  }
}
