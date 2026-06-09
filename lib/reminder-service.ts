import Appointment from '@/lib/models/Appointment';
import Patient from '@/lib/models/Patient';
import Reminder from '@/lib/models/Reminder';
import { sendClinicEmail } from '@/lib/email';

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

function buildHtmlMessage(subject: string, message: string) {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="margin: 0 0 16px; color: #0f766e;">${subject}</h2>
        <p style="margin: 0; font-size: 15px;">${escaped}</p>
      </div>
    </div>
  `;
}

function normalizeWhatsAppPhone(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
}

function buildWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) {
    throw new Error('Patient phone number is required for WhatsApp reminders');
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export async function sendReminderEmail(reminderInput: any) {
  const reminder = normalizeReminder(reminderInput);
  const [patient, appointment] = await Promise.all([
    Patient.findById(reminder.patientId),
    reminder.appointmentId ? Appointment.findById(reminder.appointmentId) : Promise.resolve(null),
  ]);

  if (!patient) {
    throw new Error('Patient not found for reminder');
  }

  const subject =
    reminder.subject ||
    (reminder.category === 'birthday'
      ? `Happy Birthday, ${patient.firstName} ${patient.lastName}!`
      : `Reminder for ${patient.mrn || patient.id}`);

  const text =
    reminder.message ||
    (reminder.category === 'birthday'
      ? `Happy Birthday, ${patient.firstName} ${patient.lastName}!`
      : `Hello ${patient.firstName}, this is a reminder for your upcoming appointment.`);

  const delivery = await sendClinicEmail({
    to: patient.email,
    subject,
    text,
    html: buildHtmlMessage(subject, text),
  });

  const updated = await Reminder.findByIdAndUpdate(
    reminder.id,
    {
      status: 'sent',
      sentAt: new Date(),
      isRead: false,
    },
    { new: true }
  ).lean();

  return {
    delivery,
    reminder: normalizeReminder(updated),
    patient,
    appointment,
  };
}

export async function sendReminderWhatsApp(reminderInput: any) {
  const reminder = normalizeReminder(reminderInput);
  const [patient, appointment] = await Promise.all([
    Patient.findById(reminder.patientId),
    reminder.appointmentId ? Appointment.findById(reminder.appointmentId) : Promise.resolve(null),
  ]);

  if (!patient) {
    throw new Error('Patient not found for reminder');
  }

  const text =
    reminder.message ||
    (reminder.category === 'birthday'
      ? `Happy Birthday, ${patient.firstName} ${patient.lastName}!`
      : `Hello ${patient.firstName}, this is a reminder for your upcoming appointment.`);

  const whatsappUrl = buildWhatsAppUrl(patient.phone, text);
  const updated = await Reminder.findByIdAndUpdate(
    reminder.id,
    {
      status: 'sent',
      sentAt: new Date(),
      isRead: false,
      channel: 'whatsapp',
    },
    { new: true }
  ).lean();

  return {
    delivery: {
      channel: 'whatsapp',
      phone: normalizeWhatsAppPhone(patient.phone),
      url: whatsappUrl,
    },
    reminder: normalizeReminder(updated),
    patient,
    appointment,
    whatsappUrl,
  };
}

export async function sendQueuedReminders(limit = 25) {
  const reminders = await Reminder.find({
    status: 'queued',
    channel: 'email',
    $or: [
      { scheduledFor: { $lte: new Date() } },
      { scheduledFor: null },
    ],
  })
    .sort({ scheduledFor: 1, createdAt: 1 })
    .limit(limit)
    .lean();

  const results = [];

  for (const reminder of reminders) {
    try {
      const sent = await sendReminderEmail(reminder);
      results.push({ reminderId: sent.reminder?.id, status: 'sent' });
    } catch (error) {
      results.push({
        reminderId: reminder.id || String(reminder._id),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to send reminder',
      });
      await Reminder.findByIdAndUpdate(reminder._id || reminder.id, {
        status: 'failed',
      });
    }
  }

  return results;
}
