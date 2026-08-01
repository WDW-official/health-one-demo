import mongoose, { Schema, Document } from 'mongoose';

export interface IFamily extends Document {
  hospitalId?: string | null;
  familyName: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const familySchema = new Schema<IFamily>(
  {
    hospitalId: {
      type: String,
      default: null,
      index: true,
    },
    familyName: {
      type: String,
      required: [true, 'Family name is required'],
      trim: true,
      index: 'text',
    },
    primaryContactName: {
      type: String,
      required: [true, 'Primary contact name is required'],
      trim: true,
      index: 'text',
    },
    primaryContactPhone: {
      type: String,
      required: [true, 'Primary contact phone is required'],
      trim: true,
      index: 'text',
    },
    primaryContactEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
      index: 'text',
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

familySchema.index({ hospitalId: 1, familyName: 1 });
familySchema.index({
  familyName: 'text',
  primaryContactName: 'text',
  primaryContactPhone: 'text',
  primaryContactEmail: 'text',
});

export default mongoose.models.Family || mongoose.model<IFamily>('Family', familySchema);
