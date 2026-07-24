import mongoose, { Schema, Document } from 'mongoose';
import { getNextPatientMrnForHospital } from '@/lib/patient-mrn';

export interface IPatient extends Document {
  hospitalId?: string | null;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  familyStatus: 'individual' | 'family';
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
  notes?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    hospitalId: {
      type: String,
      default: null,
      index: true,
    },
    mrn: {
      type: String,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      index: 'text',
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      index: 'text',
    },
    dateOfBirth: {
      type: String,
      required: [true, 'Date of birth is required'],
    },
    familyStatus: {
      type: String,
      enum: ['individual', 'family'],
      default: 'individual',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      index: 'text',
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      index: 'text',
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    insuranceProvider: {
      type: String,
      default: null,
    },
    insurancePolicyNumber: {
      type: String,
      default: null,
    },
    medicalHistory: {
      type: String,
      default: '',
    },
    allergies: {
      type: String,
      default: '',
    },
    currentMedications: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    emergencyContactName: {
      type: String,
      required: true,
    },
    emergencyContactPhone: {
      type: String,
      required: true,
    },
    assignedDoctorId: {
      type: String,
      default: null,
      index: true,
    },
    assignedDoctorName: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Text index for fast search
patientSchema.index({ hospitalId: 1, mrn: 1 });
patientSchema.index({ hospitalId: 1, assignedDoctorId: 1 });
patientSchema.index({ mrn: 'text', firstName: 'text', lastName: 'text', email: 'text', phone: 'text' });

async function getNextPatientMrn(hospitalId?: string | null) {
  return getNextPatientMrnForHospital(mongoose.models.Patient, hospitalId || null);
}

patientSchema.pre('validate', async function () {
  if (!this.mrn) {
    this.mrn = await getNextPatientMrn(this.hospitalId);
  }
});

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', patientSchema);
