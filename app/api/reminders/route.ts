import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import Patient from '@/lib/models/Patient';
import Reminder from '@/lib/models/Reminder';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';
import { buildHospitalQuery, getRequestUser, withHospitalId } from '../_lib/request-auth';

function normalizeReminder(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
    scheduledFor: plain.scheduledFor ? new Date(plain.scheduledFor) : undefined,
    sentAt: plain.sentAt ? new Date(plain.sentAt) : undefined,
    createdAt: plain.createdAt ? new Date(plain.createdAt) : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt) : undefined,
  };
}

function buildAppointmentMessage(patientName: string, appointmentDate: Date, patientMrn: string) {
  const readableDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const readableTime = appointmentDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    subject: `Appointment reminder for ${patientMrn}`,
    message: `Hello ${patientName}, this is a reminder for your dental appointment on ${readableDate} at ${readableTime}. Please arrive a few minutes early. If you need to reschedule, contact the clinic.`,
    scheduledFor: new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000),
    reminderType: 'day_before' as const,
    status: 'queued' as const,
  };
}

function buildBirthdayMessage(patientName: string, patientMrn: string) {
  return {
    subject: `Happy Birthday, ${patientName}!`,
    message: `Happy Birthday, ${patientName}! Wishing you a healthy, joyful year ahead. From all of us at Health One Dental Clinic, we hope your day is filled with smiles.`,
    scheduledFor: new Date(),
    reminderType: 'birthday' as const,
    status: 'draft' as const,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const appointmentId = searchParams.get('appointmentId');
    const category = searchParams.get('category');
    const user = getRequestUser(request);

    let query: Record<string, any> = buildHospitalQuery(user);

    if (patientId) query.patientId = patientId;
    if (appointmentId) query.appointmentId = appointmentId;
    if (category) query.category = category;

    if (user?.role === 'doctor' && user.doctorId) {
      query.doctorId = user.doctorId;
    }

    const reminders = await Reminder.find(query).sort({ createdAt: -1 }).lean();
    const normalized = reminders.map(normalizeReminder);
    return jsonOk(normalized, { reminders: normalized, total: normalized.length });
  } catch (error) {
    console.error('Get reminders error:', error);
    return jsonError('Failed to fetch reminders');
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      patientId,
      appointmentId,
      category = 'custom',
      channel = 'email',
      reminderType = 'custom',
      scheduledFor,
      subject,
      message,
    } = body || {};

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    if (user.role === 'doctor' && body.doctorId && body.doctorId !== user.doctorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [patient, appointment] = await Promise.all([
      Patient.findOne(buildHospitalQuery(user, { _id: patientId })),
      appointmentId ? Appointment.findOne(buildHospitalQuery(user, { _id: appointmentId })) : Promise.resolve(null),
    ]);

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (appointmentId && !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (user.role === 'doctor' && user.doctorId && patient.assignedDoctorId && patient.assignedDoctorId !== user.doctorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let reminderPayload: any = withHospitalId(user, {
      patientId,
      appointmentId: appointmentId || undefined,
      doctorId: body.doctorId || appointment?.doctorId || patient.assignedDoctorId || user.doctorId,
      channel,
      category,
      reminderType,
      status: 'draft',
      isRead: false,
    });

    if (category === 'appointment' && appointment) {
      const patientName = `${patient.firstName} ${patient.lastName}`;
      const patientMrn = patient.mrn || patient.id || 'Patient';
      const template = buildAppointmentMessage(patientName, new Date(appointment.dateTime), patientMrn);
      reminderPayload = {
        ...reminderPayload,
        subject: subject || template.subject,
        message: message || template.message,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : template.scheduledFor,
        reminderType: reminderType === 'custom' ? template.reminderType : reminderType,
        status: template.status,
      };
    } else if (category === 'birthday') {
      const patientName = `${patient.firstName} ${patient.lastName}`;
      const patientMrn = patient.mrn || patient.id || 'Patient';
      const template = buildBirthdayMessage(patientName, patientMrn);
      reminderPayload = {
        ...reminderPayload,
        subject: subject || template.subject,
        message: message || template.message,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : template.scheduledFor,
        reminderType: 'birthday',
        status: 'draft',
      };
    } else {
      if (!message || !String(message).trim()) {
        return NextResponse.json({ error: 'message is required' }, { status: 400 });
      }

      reminderPayload = {
        ...reminderPayload,
        subject: subject || '',
        message,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        reminderType: reminderType || 'custom',
        status: body.status || 'draft',
      };
    }

    const reminder = new Reminder(reminderPayload);
    await reminder.save();

    const normalized = normalizeReminder(reminder);
    return jsonCreated(normalized, { message: 'Reminder created successfully', reminder: normalized });
  } catch (error) {
    console.error('Create reminder error:', error);
    return jsonError('Failed to create reminder');
  }
}
