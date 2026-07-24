import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { ensureAppointmentNumbers } from '@/lib/appointment-number';
import { jsonError, jsonOk } from '../../_lib/response';
import { buildHospitalQuery, getPagination, getRequestUser } from '../../_lib/request-auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const { limit, skip } = getPagination(searchParams, 100, 500);
    const user = getRequestUser(request);

    if (!startDate || !endDate) {
      return jsonError('startDate and endDate are required', 400);
    }

    const query: Record<string, unknown> = buildHospitalQuery(user, {
      dateTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });

    if (user?.role === 'doctor') {
      if (doctorId && doctorId !== user.doctorId) {
        return jsonError('Forbidden', 403);
      }

      if (user.doctorId) {
        query.doctorId = user.doctorId;
      }
    } else if (doctorId) {
      query.doctorId = doctorId;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (status) {
      query.status = status;
    }

    const appointments = (await Appointment.find(query)
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ dateTime: 1 })) as any[];

    const total = await Appointment.countDocuments(query);
    const normalized = await ensureAppointmentNumbers(appointments);
    return jsonOk(normalized, { appointments: normalized, total, limit, skip });
  } catch (error) {
    console.error('Get appointments by date range error:', error);
    return jsonError('Failed to fetch appointments');
  }
}
