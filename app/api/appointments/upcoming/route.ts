import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { ensureAppointmentNumbers } from '@/lib/appointment-number';
import { jsonError, jsonOk } from '../../_lib/response';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const appointments = (await Appointment.find({
      dateTime: { $gt: new Date() },
      status: 'scheduled',
    })
      .lean()
      .sort({ dateTime: 1 })) as any[];

    const normalized = await ensureAppointmentNumbers(appointments);
    return jsonOk(normalized, { appointments: normalized, total: normalized.length });
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    return jsonError('Failed to fetch upcoming appointments');
  }
}
