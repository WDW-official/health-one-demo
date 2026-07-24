import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  hospitalId?: string | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'needs-review';
  supplierId?: string;
  supplierName?: string;
  batchNumber?: string;
  expiryDate?: Date;
  purchasePrice?: number;
  sellingPrice?: number;
  storageLocation?: string;
  description?: string;
  lastUpdated: Date;
}

export function calculateInventoryStatus(quantity: number, reorderLevel: number) {
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= reorderLevel) return 'low-stock';
  return 'in-stock';
}

const InventorySchema: Schema = new Schema(
  {
    hospitalId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true, trim: true },
    reorderLevel: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['in-stock', 'low-stock', 'out-of-stock', 'needs-review'],
      default: 'in-stock',
    },
    supplierId: { type: String, default: '' },
    supplierName: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    expiryDate: { type: Date, default: null },
    purchasePrice: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    storageLocation: { type: String, default: '' },
    description: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const plain = ret as Record<string, any>;
        plain.id = String(plain._id);
        delete plain._id;
        delete plain.__v;
        return ret;
      },
    },
  }
);

InventorySchema.index({ hospitalId: 1, name: 1 });
InventorySchema.index({ hospitalId: 1, status: 1 });
InventorySchema.index({ hospitalId: 1, lastUpdated: -1 });

InventorySchema.pre<IInventory>('save', function () {
  this.status = calculateInventoryStatus(this.quantity, this.reorderLevel);
  this.lastUpdated = new Date();
});

if (mongoose.models.Inventory) {
  mongoose.deleteModel('Inventory');
}

const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);

export default Inventory;
