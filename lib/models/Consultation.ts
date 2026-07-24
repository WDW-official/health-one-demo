import mongoose, { Schema, Document } from 'mongoose';
import type { ClinicType, ConsultationSpecialtyFields, PaymentStatus } from '@/lib/types';

export interface IConsultation extends Document {
  hospitalId?: string | null;
  clinicType?: ClinicType;
  specialtyFields?: ConsultationSpecialtyFields;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  patientName?: string;
  presentingComplaints?: string;
  examination?: string;
  diagnosis: string;
  treatmentPlan?: string;
  clinicalNotes?: {
    enteredAt: Date;
    enteredByUserId?: string;
    enteredByName?: string;
    clinicType?: ClinicType;
    specialtyFields?: ConsultationSpecialtyFields;
    presentingComplaints?: string;
    impressionDiagnosis?: string;
    treatmentPlan?: string;
    notes?: string;
  }[];
  procedures?: {
    category: string;
    procedure: string;
    price?: number;
    status?: 'pending' | 'completed' | 'cancelled';
    updatedBy?: string;
    updatedByName?: string;
  }[];
  estimatedConsumables?: {
    name: string;
    quantity: number;
    unit?: string;
    procedure?: string;
    category?: string;
    source?: 'standard' | 'actual';
    inventoryItemId?: string;
    availableQuantity?: number;
    hasSufficientStock?: boolean;
    notes?: string;
  }[];
  actualConsumables?: {
    name: string;
    quantity: number;
    unit?: string;
    procedure?: string;
    category?: string;
    source?: 'standard' | 'actual';
    inventoryItemId?: string;
    availableQuantity?: number;
    hasSufficientStock?: boolean;
    notes?: string;
  }[];
  consumablesDeductedAt?: Date;
  treatment: string;
  prescriptions: string;
  paymentAmount?: number;
  paymentStatus?: PaymentStatus;
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
    hospitalId: {
      type: String,
      default: null,
      index: true,
    },
    clinicType: {
      type: String,
      enum: ['dental', 'family_medical', 'small_hospital', 'eye_clinic'],
      default: 'dental',
      index: true,
    },
    specialtyFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
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
    clinicalNotes: {
      type: [
        {
          enteredAt: { type: Date, default: Date.now, index: true },
          enteredByUserId: { type: String, default: '' },
          enteredByName: { type: String, default: '' },
          clinicType: {
            type: String,
            enum: ['dental', 'family_medical', 'small_hospital', 'eye_clinic'],
            default: 'dental',
          },
          specialtyFields: { type: Schema.Types.Mixed, default: {} },
          presentingComplaints: { type: String, default: '' },
          impressionDiagnosis: { type: String, default: '' },
          treatmentPlan: { type: String, default: '' },
          notes: { type: String, default: '' },
        },
      ],
      default: [],
    },
    procedures: {
      type: [
        {
          category: { type: String, default: '' },
          procedure: { type: String, default: '' },
          price: { type: Number, min: 0 },
          status: {
            type: String,
            enum: ['pending', 'completed', 'cancelled'],
            default: 'pending',
          },
          updatedBy: { type: String, default: '' },
          updatedByName: { type: String, default: '' },
        },
      ],
      default: [],
    },
    estimatedConsumables: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          quantity: { type: Number, required: true, min: 0 },
          unit: { type: String, default: '' },
          procedure: { type: String, default: '' },
          category: { type: String, default: '' },
          source: { type: String, enum: ['standard', 'actual'], default: 'standard' },
          inventoryItemId: { type: String, default: '' },
          availableQuantity: { type: Number, default: null },
          hasSufficientStock: { type: Boolean, default: null },
          notes: { type: String, default: '' },
        },
      ],
      default: [],
    },
    actualConsumables: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          quantity: { type: Number, required: true, min: 0 },
          unit: { type: String, default: '' },
          procedure: { type: String, default: '' },
          category: { type: String, default: '' },
          source: { type: String, enum: ['standard', 'actual'], default: 'actual' },
          inventoryItemId: { type: String, default: '' },
          availableQuantity: { type: Number, default: null },
          hasSufficientStock: { type: Boolean, default: null },
          notes: { type: String, default: '' },
        },
      ],
      default: [],
    },
    consumablesDeductedAt: {
      type: Date,
      default: null,
      index: true,
    },
    treatment: {
      type: String,
      required: [true, 'Treatment is required'],
    },
    prescriptions: {
      type: String,
      default: '',
    },
    paymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid', 'partially_paid', 'hmo_pending'],
      default: 'unpaid',
      index: true,
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

consultationSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
consultationSchema.index({ hospitalId: 1, doctorId: 1, createdAt: -1 });
consultationSchema.index({ hospitalId: 1, appointmentId: 1 });

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

  if (!ExistingConsultation.schema.path('clinicalNotes')) {
    ExistingConsultation.schema.add({
      clinicalNotes: {
        type: [
          {
            enteredAt: { type: Date, default: Date.now, index: true },
            enteredByUserId: { type: String, default: '' },
            enteredByName: { type: String, default: '' },
            clinicType: {
              type: String,
              enum: ['dental', 'family_medical', 'small_hospital', 'eye_clinic'],
              default: 'dental',
            },
            specialtyFields: { type: Schema.Types.Mixed, default: {} },
            presentingComplaints: { type: String, default: '' },
            impressionDiagnosis: { type: String, default: '' },
            treatmentPlan: { type: String, default: '' },
            notes: { type: String, default: '' },
          },
        ],
        default: [],
      },
    });
  }

  if (!ExistingConsultation.schema.path('clinicType')) {
    ExistingConsultation.schema.add({
      clinicType: {
        type: String,
        enum: ['dental', 'family_medical', 'small_hospital', 'eye_clinic'],
        default: 'dental',
        index: true,
      },
    });
  }

  if (!ExistingConsultation.schema.path('specialtyFields')) {
    ExistingConsultation.schema.add({
      specialtyFields: {
        type: Schema.Types.Mixed,
        default: {},
      },
    });
  }
}

export default ExistingConsultation || mongoose.model<IConsultation>('Consultation', consultationSchema);
