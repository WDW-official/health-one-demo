import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import Patient from '@/lib/models/Patient';
import Reminder from '@/lib/models/Reminder';
import { ensureAppointmentNumber } from '@/lib/appointment-number';
import { Types } from 'mongoose';
import { buildHospitalQuery, getRequestUser, hasSuperAdminAccess } from '../../_lib/request-auth';
import { jsonError, jsonOk } from '../../_lib/response';
import { getApiErrorMessage } from '../../_lib/error-message';

function buildAppointmentReminder(appointment: any, patient: any) {
  const dateTime = new Date(appointment.dateTime);
  return {
    hospitalId: appointment.hospitalId || null,
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
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    const appointment = await Appointment.findOne(buildHospitalQuery(user, { _id: id })).lean();

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const normalized = await ensureAppointmentNumber(appointment);
    return jsonOk(normalized, { appointment: normalized });
  } catch (error) {
    console.error('Get appointment error:', error);
    return jsonError('Failed to fetch appointment');
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
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (body.dateTime && isPastAppointmentDate(body.dateTime)) {
      return NextResponse.json(
        { error: 'Appointment date and time cannot be in the past' },
        { status: 400 }
      );
    }

    const appointment = await Appointment.findOneAndUpdate(
      buildHospitalQuery(user, { _id: id }),
      body,
      { new: true, runValidators: true }
    ).lean();

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const existingReminder = await Reminder.findOne(
      buildHospitalQuery(user, { appointmentId: appointment.id || String(appointment._id) })
    );

    if (appointment.status === 'scheduled') {
      const patient = await Patient.findOne(buildHospitalQuery(user, { _id: appointment.patientId }));
      const reminderPayload = buildAppointmentReminder(appointment, patient);

      if (existingReminder) {
        await Reminder.findByIdAndUpdate(existingReminder._id, reminderPayload, { new: true, runValidators: true });
      } else {
        await Reminder.create(reminderPayload);
      }
    } else if (existingReminder) {
      await Reminder.findByIdAndUpdate(existingReminder._id, {
        status: 'failed',
      });
    }

    return jsonOk(appointment, { message: 'Appointment updated successfully', appointment });
  } catch (error) {
    console.error('Update appointment error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to update appointment'), 400);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSuperAdminAccess(request)) {
      return NextResponse.json({ error: 'Only superadmins can delete appointments' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    await Appointment.findOneAndDelete(buildHospitalQuery(getRequestUser(request), { _id: id }));

    return jsonOk(null, { message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    return jsonError('Failed to delete appointment');
  }
}
