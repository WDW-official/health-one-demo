import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  profileImage?: string;
  availableSlots: string[];
  workingDays: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
    },
    yearsOfExperience: {
      type: Number,
      required: [true, 'Years of experience is required'],
    },
    profileImage: {
      type: String,
      default: null,
    },
    availableSlots: {
      type: [String],
      default: ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '15:30'],
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Doctor || mongoose.model<IDoctor>('Doctor', doctorSchema);
