import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  hospitalId?: string | null;
  appointmentId?: string;
  patientId: string;
  doctorId?: string;
  subject?: string;
  message: string;
  channel: 'email' | 'sms' | 'whatsapp';
  category: 'appointment' | 'birthday' | 'custom';
  reminderType?: 'day_before' | 'hour_before' | 'birthday' | 'custom';
  scheduledFor?: Date;
  sentAt?: Date;
  status: 'draft' | 'queued' | 'sent' | 'failed';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    hospitalId: {
      type: String,
      default: null,
      index: true,
    },
    appointmentId: {
      type: String,
      default: null,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    doctorId: {
      type: String,
      default: null,
      index: true,
    },
    subject: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
      default: '',
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp'],
      default: 'email',
    },
    category: {
      type: String,
      enum: ['appointment', 'birthday', 'custom'],
      default: 'custom',
      index: true,
    },
    reminderType: {
      type: String,
      enum: ['day_before', 'hour_before', 'birthday', 'custom'],
      default: 'custom',
    },
    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'queued', 'sent', 'failed'],
      default: 'draft',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

reminderSchema.index({ patientId: 1, category: 1, scheduledFor: 1 });
reminderSchema.index({ doctorId: 1, category: 1, scheduledFor: 1 });
reminderSchema.index({ hospitalId: 1, category: 1, scheduledFor: 1 });

export default mongoose.models.Reminder || mongoose.model<IReminder>('Reminder', reminderSchema);
