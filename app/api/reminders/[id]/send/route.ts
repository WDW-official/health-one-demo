import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Reminder from '@/lib/models/Reminder';
import { jsonError, jsonOk } from '../../../_lib/response';
import { getRequestUser } from '../../../_lib/request-auth';
import { sendReminderEmail, sendReminderWhatsApp } from '@/lib/reminder-service';

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

export async function POST(
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
      return NextResponse.json({ error: 'Invalid reminder ID' }, { status: 400 });
    }

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    if (user.role === 'doctor' && user.doctorId && reminder.doctorId && reminder.doctorId !== user.doctorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = reminder.channel === 'whatsapp'
      ? await sendReminderWhatsApp(reminder)
      : await sendReminderEmail(reminder);
    const normalized = normalizeReminder(result.reminder);

    return jsonOk(
      normalized,
      {
        message: reminder.channel === 'whatsapp'
          ? 'WhatsApp reminder ready'
          : 'Reminder sent successfully',
        reminder: normalized,
        deliveryId: (result.delivery as any)?.id,
        whatsappUrl: (result as any).whatsappUrl,
      }
    );
  } catch (error) {
    console.error('Send reminder error:', error);
    return jsonError(error instanceof Error ? error.message : 'Failed to send reminder');
  }
}
