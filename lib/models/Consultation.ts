import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultation extends Document {
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  patientName?: string;
  presentingComplaints?: string;
  examination?: string;
  diagnosis: string;
  treatmentPlan?: string;
  treatment: string;
  prescriptions: string;
  followUpDate?: string;
  notes: string;
  chartBlocks?: {
    upperLeft: string;
    upperRight: string;
    lowerLeft: string;
    lowerRight: string;
  }[];
  attachments?: {
    url: string;
    publicId?: string;
    name: string;
    mimeType?: string;
    kind?: 'image' | 'file';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const consultationSchema = new Schema<IConsultation>(
  {
    appointmentId: {
      type: String,
      default: '',
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
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
    presentingComplaints: {
      type: String,
      default: '',
    },
    examination: {
      type: String,
      default: '',
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
    },
    treatmentPlan: {
      type: String,
      default: '',
    },
    treatment: {
      type: String,
      required: [true, 'Treatment is required'],
    },
    prescriptions: {
      type: String,
      default: '',
    },
    followUpDate: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    chartBlocks: {
      type: [
        {
          upperLeft: { type: String, default: '' },
          upperRight: { type: String, default: '' },
          lowerLeft: { type: String, default: '' },
          lowerRight: { type: String, default: '' },
        },
      ],
      default: [],
    },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: null },
          name: { type: String, required: true },
          mimeType: { type: String, default: null },
          kind: { type: String, enum: ['image', 'file'], default: 'file' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const ExistingConsultation = mongoose.models.Consultation;

if (ExistingConsultation) {
  const appointmentPath = ExistingConsultation.schema.path('appointmentId') as any;
  if (appointmentPath) {
    appointmentPath.isRequired = false;
    appointmentPath.validators = appointmentPath.validators.filter(
      (validator: any) => validator.type !== 'required'
    );
    appointmentPath.defaultValue = '';
  }
}

export default ExistingConsultation || mongoose.model<IConsultation>('Consultation', consultationSchema);
