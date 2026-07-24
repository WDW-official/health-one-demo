import mongoose, { Document, Schema } from 'mongoose';

export type InventoryMovementType =
  | 'stock-in'
  | 'procedure-estimate'
  | 'actual-usage'
  | 'manual-adjustment'
  | 'correction';

export interface IInventoryMovement extends Document {
  hospitalId?: string | null;
  inventoryItemId: string;
  itemName: string;
  category?: string;
  unit?: string;
  type: InventoryMovementType;
  quantityBefore: number;
  quantityChanged: number;
  quantityAfter: number;
  consultationId?: string;
  procedureName?: string;
  source?: 'estimated' | 'actual' | 'manual';
  createdByUserId?: string;
  createdByName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    hospitalId: { type: String, default: null, index: true },
    inventoryItemId: { type: String, required: true, index: true },
    itemName: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: '', trim: true, index: true },
    unit: { type: String, default: '', trim: true },
    type: {
      type: String,
      enum: ['stock-in', 'procedure-estimate', 'actual-usage', 'manual-adjustment', 'correction'],
      required: true,
      index: true,
    },
    quantityBefore: { type: Number, required: true },
    quantityChanged: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    consultationId: { type: String, default: '', index: true },
    procedureName: { type: String, default: '' },
    source: { type: String, enum: ['estimated', 'actual', 'manual'], default: 'manual' },
    createdByUserId: { type: String, default: '' },
    createdByName: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ hospitalId: 1, createdAt: -1 });
inventoryMovementSchema.index({ hospitalId: 1, inventoryItemId: 1, createdAt: -1 });

export default mongoose.models.InventoryMovement ||
  mongoose.model<IInventoryMovement>('InventoryMovement', inventoryMovementSchema);
