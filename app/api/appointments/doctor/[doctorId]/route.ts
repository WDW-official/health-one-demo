import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { ensureAppointmentNumbers } from '@/lib/appointment-number';
import { jsonError, jsonOk } from '../../../_lib/response';
import { buildHospitalQuery, getPagination, getRequestUser } from '../../../_lib/request-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    await connectDB();

    const { doctorId } = await params;
    const user = getRequestUser(request);
    const { limit, skip } = getPagination(new URL(request.url).searchParams, 20, 200);

    if (user?.role === 'doctor' && user.doctorId && user.doctorId !== doctorId) {
      return jsonError('Forbidden', 403);
    }

    const query = buildHospitalQuery(user, { doctorId });

    const appointments = (await Appointment.find(query)
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ dateTime: -1 })) as any[];

    const total = await Appointment.countDocuments(query);
    const normalized = await ensureAppointmentNumbers(appointments);
    return jsonOk(normalized, { appointments: normalized, total, limit, skip });
  } catch (error) {
    console.error('Get appointments by doctor error:', error);
    return jsonError('Failed to fetch appointments');
  }
}
