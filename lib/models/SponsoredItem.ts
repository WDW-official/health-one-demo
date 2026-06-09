import mongoose, { Schema, Document } from 'mongoose';

export interface ISponsoredItem extends Document {
  name: string;
  category?: string;
  totalQuantity: number;
  paidQuantity: number;
  note?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sponsoredItemSchema = new Schema<ISponsoredItem>(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    note: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.SponsoredItem || mongoose.model<ISponsoredItem>('SponsoredItem', sponsoredItemSchema);
