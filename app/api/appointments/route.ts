import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import Doctor from '@/lib/models/Doctor';
import Patient from '@/lib/models/Patient';
import Reminder from '@/lib/models/Reminder';
import {
  ensureAppointmentNumbers,
  getNextAppointmentNumber,
  normalizeAppointment,
} from '@/lib/appointment-number';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';
import { getPagination, getRequestUser } from '../_lib/request-auth';
import { getApiErrorMessage } from '../_lib/error-message';

function buildAppointmentReminder(appointment: any, patient: any) {
  const dateTime = new Date(appointment.dateTime);
  return {
    patientId: appointment.patientId,
    appointmentId: appointment.id || String(appointment._id),
    doctorId: appointment.doctorId,
    channel: 'email',
    category: 'appointment',
    reminderType: 'day_before',
    subject: `Appointment reminder for ${patient?.mrn || patient?.id || 'your patient'}`,
    message: `Hello ${patient?.firstName || 'Patient'}, this is a reminder for your appointment on ${dateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })} at ${dateTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}.`,
    scheduledFor: new Date(dateTime.getTime() - 24 * 60 * 60 * 1000),
    status: 'queued',
    isRead: false,
  };
}

function isPastAppointmentDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() < Date.now();
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 20, 200);
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    const user = getRequestUser(request);

    let query: any = {};

    if (status) query.status = status;
    if (patientId) query.patientId = patientId;
    if (user?.role === 'doctor') {
      if (doctorId && doctorId !== user.doctorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (user.doctorId) {
        query.doctorId = user.doctorId;
      }
    } else if (doctorId) {
      query.doctorId = doctorId;
    }

    const appointments = (await Appointment.find(query)
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ dateTime: -1 })) as any[];

    const total = await Appointment.countDocuments(query);
    const normalized = await ensureAppointmentNumbers(appointments);
    return jsonOk(normalized, { appointments: normalized, total, limit, skip });
  } catch (error) {
    console.error('Get appointments error:', error);
    return jsonError('Failed to fetch appointments');
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const required = ['patientId', 'doctorId', 'dateTime', 'type'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    if (isPastAppointmentDate(body.dateTime)) {
      return NextResponse.json(
        { error: 'Appointment date and time cannot be in the past' },
        { status: 400 }
      );
    }

    // Get doctor and patient names for caching
    const [doctor, patient] = await Promise.all([
      Doctor.findById(body.doctorId),
      Patient.findById(body.patientId),
    ]);

    const appointmentNumber = await getNextAppointmentNumber(body.patientId, patient?.mrn);

    const appointment = new Appointment({
      ...body,
      appointmentNumber,
      doctorName: doctor?.name,
      patientName: patient?.firstName + ' ' + patient?.lastName,
    });

    await appointment.save();

    if (appointment.status === 'scheduled') {
      await Reminder.create(buildAppointmentReminder(appointment, patient));
    }

    const normalized = normalizeAppointment(appointment);
    return jsonCreated(normalized, { message: 'Appointment created successfully', appointment: normalized });
  } catch (error) {
    console.error('Create appointment error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to create appointment'), 400);
  }
}
