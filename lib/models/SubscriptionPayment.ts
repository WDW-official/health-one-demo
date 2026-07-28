import mongoose, { Schema, Document } from 'mongoose';

export type SubscriptionPaymentStatus = 'pending' | 'paid' | 'failed';

export interface ISubscriptionPayment extends Document {
  hospitalId: string;
  hospitalName: string;
  hospitalSlug: string;
  planId: string;
  planName: string;
  durationDays: number;
  maxUsers?: number;
  features?: string[];
  amount: number;
  amountKobo: number;
  currency: string;
  paymentProvider: 'paystack' | 'manual';
  providerReference: string;
  providerTransactionId?: string;
  authorizationUrl?: string;
  accessCode?: string;
  status: SubscriptionPaymentStatus;
  paidAt?: Date | null;
  verifiedAt?: Date | null;
  renewalStartsAt?: Date | null;
  renewalEndsAt?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    hospitalId: { type: String, required: true, index: true },
    hospitalName: { type: String, required: true },
    hospitalSlug: { type: String, required: true, index: true },
    planId: { type: String, required: true, index: true },
    planName: { type: String, required: true },
    durationDays: { type: Number, required: true, min: 1 },
    maxUsers: { type: Number, default: 0 },
    features: { type: [String], default: [] },
    amount: { type: Number, required: true, min: 0 },
    amountKobo: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN' },
    paymentProvider: { type: String, enum: ['paystack', 'manual'], default: 'paystack' },
    providerReference: { type: String, required: true, unique: true, index: true },
    providerTransactionId: { type: String, default: '' },
    authorizationUrl: { type: String, default: '' },
    accessCode: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
    paidAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    renewalStartsAt: { type: Date, default: null },
    renewalEndsAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ hospitalId: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ status: 1, createdAt: -1 });

const SubscriptionPayment =
  (mongoose.models.SubscriptionPayment as mongoose.Model<ISubscriptionPayment> | undefined) ||
  mongoose.model<ISubscriptionPayment>('SubscriptionPayment', subscriptionPaymentSchema);

export default SubscriptionPayment;
