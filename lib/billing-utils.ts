import type { BillingItem, HmoClaimStatus, PaymentStatus } from './types';

export const CLINIC_NAME = 'Health One';

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'Pending Billing',
  'Pending Payment',
  'Part Paid',
  'Paid',
  'HMO Pending',
  'HMO Approved',
  'HMO Paid',
  'Cancelled',
  'Refunded',
  'Outstanding',
];

export const HMO_CLAIM_STATUSES: HmoClaimStatus[] = [
  'Not Applicable',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Submitted',
  'Awaiting Payment',
  'Paid',
  'Part Paid',
  'Disputed',
];

export function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function normalizeBillingItems(items: Partial<BillingItem>[] = []) {
  return items
    .map((item) => {
      const quantity = Math.max(Number(item.quantity) || 0, 0);
      const unitPrice = Math.max(Number(item.unitPrice) || 0, 0);
      return {
        name: String(item.name || '').trim(),
        category: String(item.category || 'Other').trim() || 'Other',
        quantity,
        unitPrice: roundMoney(unitPrice),
        total: roundMoney(quantity * unitPrice),
        notes: String(item.notes || '').trim(),
      };
    })
    .filter((item) => item.name && item.quantity > 0 && item.unitPrice >= 0);
}

export function calculateItemsTotal(items: Partial<BillingItem>[] = []) {
  return roundMoney(normalizeBillingItems(items).reduce((sum, item) => sum + item.total, 0));
}

export function calculateBillingStatus(input: {
  totalAmount: number;
  amountPaid: number;
  hmoAmountCovered?: number;
  hmoOutstandingAmount?: number;
  hmoClaimStatus?: HmoClaimStatus;
  currentStatus?: PaymentStatus;
}) {
  if (input.currentStatus === 'Cancelled' || input.currentStatus === 'Refunded') {
    return input.currentStatus;
  }

  const totalAmount = roundMoney(input.totalAmount);
  const amountPaid = roundMoney(input.amountPaid);
  const hmoAmountCovered = roundMoney(input.hmoAmountCovered || 0);
  const hmoOutstandingAmount = roundMoney(input.hmoOutstandingAmount || 0);
  const patientResponsibility = Math.max(totalAmount - hmoAmountCovered, 0);

  if (hmoAmountCovered > 0 || hmoOutstandingAmount > 0 || input.hmoClaimStatus !== 'Not Applicable') {
    if (hmoOutstandingAmount <= 0 && amountPaid >= patientResponsibility && input.hmoClaimStatus === 'Paid') {
      return 'HMO Paid';
    }
    if (input.hmoClaimStatus === 'Approved' && amountPaid >= patientResponsibility) {
      return 'HMO Approved';
    }
    return 'HMO Pending';
  }

  if (totalAmount <= 0) return 'Pending Billing';
  if (amountPaid <= 0) return 'Pending Payment';
  if (amountPaid >= totalAmount) return 'Paid';
  return 'Part Paid';
}

export function buildInvoiceNumber(existingCount: number) {
  return `INV-${String(existingCount + 1).padStart(6, '0')}`;
}

export function buildReceiptNumber(invoiceNumber: string, paymentCount: number) {
  return `${invoiceNumber}-R${String(paymentCount + 1).padStart(3, '0')}`;
}
