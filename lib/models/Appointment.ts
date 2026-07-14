import mongoose, { Schema, Document } from 'mongoose';
import { PROCEDURE_TYPES, type ProcedureType } from '@/lib/procedure-types';

export interface IAppointment extends Document {
  appointmentNumber?: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  patientName?: string;
  dateTime: Date;
  duration: number;
  type: ProcedureType;
  status: 'scheduled' | 'completed' | 'cancelled' | 'noshow';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      index: true,
    },
    appointmentNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    doctorId: {
      type: String,
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    doctorName: {
      type: String,
      default: null,
    },
    patientName: {
      type: String,
      default: null,
    },
    dateTime: {
      type: Date,
      required: [true, 'Appointment date and time is required'],
      index: true,
    },
    duration: {
      type: Number,
      default: 30,
    },
    type: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'noshow'],
      default: 'scheduled',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ dateTime: 1, status: 1 });

export default mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', appointmentSchema);
