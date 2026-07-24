import mongoose, { Document, Schema } from 'mongoose';

export interface IProcedureConsumableTemplate extends Document {
  hospitalId?: string | null;
  category: string;
  procedure: string;
  procedureKey: string;
  consumables: {
    name: string;
    quantity: number;
    unit: string;
    raw: string;
  }[];
  totalConsumableLines: number;
  directMaterialLines: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const consumableSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: '', trim: true },
    raw: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const procedureConsumableTemplateSchema = new Schema<IProcedureConsumableTemplate>(
  {
    hospitalId: { type: String, default: null, index: true },
    category: { type: String, required: true, trim: true, index: true },
    procedure: { type: String, required: true, trim: true },
    procedureKey: { type: String, required: true, unique: true, index: true },
    consumables: { type: [consumableSchema], default: [] },
    totalConsumableLines: { type: Number, default: 0 },
    directMaterialLines: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

procedureConsumableTemplateSchema.index({ hospitalId: 1, procedureKey: 1 });
procedureConsumableTemplateSchema.index({ hospitalId: 1, category: 1 });

export default mongoose.models.ProcedureConsumableTemplate ||
  mongoose.model<IProcedureConsumableTemplate>(
    'ProcedureConsumableTemplate',
    procedureConsumableTemplateSchema
  );
