import mongoose, { Schema, Document } from 'mongoose';
import { HMO_CLAIM_STATUSES, PAYMENT_STATUSES } from '@/lib/billing-utils';
import type { HmoClaimStatus, PaymentMethod, PaymentStatus } from '@/lib/types';

export interface IBilling extends Document {
  invoiceNumber: string;
  clinicName: string;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  consultationId: string;
  doctorId: string;
  doctorName?: string;
  consultationDate: Date;
  items: {
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    total: number;
    notes?: string;
  }[];
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  payments: {
    amountPaid: number;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    receiptNumber: string;
    recordedByUserId?: string;
    recordedByName?: string;
    paidAt: Date;
    notes?: string;
  }[];
  hmoProvider?: string;
  hmoPlan?: string;
  hmoApprovalCode?: string;
  hmoApprovalStatus?: string;
  hmoAmountCovered: number;
  hmoPatientAmount: number;
  hmoOutstandingAmount: number;
  hmoClaimSubmissionDate?: Date;
  hmoClaimPaymentDate?: Date;
  hmoClaimStatus: HmoClaimStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billingItemSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'Other' },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    amountPaid: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: [
        'Cash',
        'Bank transfer',
        'POS/card',
        'HMO',
        'Part cash / part HMO',
        'Part payment',
        'Outstanding balance',
        'Other',
      ],
      required: true,
    },
    paymentReference: { type: String, default: '' },
    receiptNumber: { type: String, required: true },
    recordedByUserId: { type: String, default: '' },
    recordedByName: { type: String, default: '' },
    paidAt: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const billingSchema = new Schema<IBilling>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    clinicName: { type: String, required: true, default: 'Health One' },
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    patientMrn: { type: String, default: '' },
    consultationId: { type: String, required: true, unique: true, index: true },
    doctorId: { type: String, required: true, index: true },
    doctorName: { type: String, default: '' },
    consultationDate: { type: Date, required: true, index: true },
    items: { type: [billingItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Pending Billing',
      index: true,
    },
    payments: { type: [paymentSchema], default: [] },
    hmoProvider: { type: String, default: '', index: true },
    hmoPlan: { type: String, default: '' },
    hmoApprovalCode: { type: String, default: '' },
    hmoApprovalStatus: { type: String, default: '' },
    hmoAmountCovered: { type: Number, default: 0 },
    hmoPatientAmount: { type: Number, default: 0 },
    hmoOutstandingAmount: { type: Number, default: 0 },
    hmoClaimSubmissionDate: { type: Date, default: null },
    hmoClaimPaymentDate: { type: Date, default: null },
    hmoClaimStatus: {
      type: String,
      enum: HMO_CLAIM_STATUSES,
      default: 'Not Applicable',
      index: true,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Billing || mongoose.model<IBilling>('Billing', billingSchema);
