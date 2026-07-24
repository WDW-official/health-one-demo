import mongoose, { Schema, Document } from 'mongoose';

export type HospitalSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type ClinicType = 'dental' | 'family_medical' | 'small_hospital' | 'eye_clinic';

const CLINIC_TYPE_VALUES: ClinicType[] = ['dental', 'family_medical', 'small_hospital', 'eye_clinic'];

export interface IHospital extends Document {
  name: string;
  slug: string;
  clinicTypes: ClinicType[];
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  brandColor?: string;
  subscriptionPlan: string;
  subscriptionStatus: HospitalSubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodEndsAt?: Date | null;
  isActive: boolean;
  settings: {
    billing?: Record<string, unknown>;
    consultation?: Record<string, unknown>;
    inventory?: Record<string, unknown>;
    notifications?: Record<string, unknown>;
    branding?: {
      logoSize?: number;
      [key: string]: unknown;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Hospital slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only'],
    },
    clinicTypes: {
      type: [String],
      enum: CLINIC_TYPE_VALUES,
      default: ['dental'],
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    brandColor: {
      type: String,
      default: '#275cc2',
    },
    subscriptionPlan: {
      type: String,
      default: 'trial',
    },
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'past_due', 'suspended', 'cancelled'],
      default: 'trial',
      index: true,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    currentPeriodEndsAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    settings: {
      billing: {
        type: Schema.Types.Mixed,
        default: {},
      },
      consultation: {
        type: Schema.Types.Mixed,
        default: {},
      },
      inventory: {
        type: Schema.Types.Mixed,
        default: {},
      },
      notifications: {
        type: Schema.Types.Mixed,
        default: {},
      },
      branding: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
  },
  { timestamps: true }
);

hospitalSchema.index({ name: 'text', slug: 'text', email: 'text' });

const Hospital =
  (mongoose.models.Hospital as mongoose.Model<IHospital> | undefined) ||
  mongoose.model<IHospital>('Hospital', hospitalSchema);

if (!Hospital.schema.path('clinicTypes')) {
  Hospital.schema.add({
    clinicTypes: {
      type: [String],
      enum: CLINIC_TYPE_VALUES,
      default: ['dental'],
      index: true,
    },
  });
}

export default Hospital;
