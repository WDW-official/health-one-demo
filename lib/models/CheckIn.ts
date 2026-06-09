import mongoose, { Schema, Document } from 'mongoose';

export type CheckInStatus = 'waiting' | 'with_doctor' | 'completed' | 'cancelled';

export interface ICheckIn extends Document {
  patientId: string;
  patientName: string;
  patientMrn?: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  appointmentNumber?: string;
  checkedInByUserId: string;
  checkedInByName: string;
  checkedInAt: Date;
  status: CheckInStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const checkInSchema = new Schema<ICheckIn>(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    patientMrn: {
      type: String,
      default: null,
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
      required: true,
      trim: true,
    },
    appointmentId: {
      type: String,
      default: null,
      index: true,
    },
    appointmentNumber: {
      type: String,
      default: null,
      trim: true,
    },
    checkedInByUserId: {
      type: String,
      required: true,
      index: true,
    },
    checkedInByName: {
      type: String,
      required: true,
      trim: true,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'with_doctor', 'completed', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

checkInSchema.index({ doctorId: 1, checkedInAt: -1 });
checkInSchema.index({ checkedInAt: -1, status: 1 });
checkInSchema.index({ patientId: 1, checkedInAt: -1 });

export default mongoose.models.CheckIn || mongoose.model<ICheckIn>('CheckIn', checkInSchema);
