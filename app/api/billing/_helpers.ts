import Billing from '@/lib/models/Billing';
import Consultation from '@/lib/models/Consultation';
import Patient from '@/lib/models/Patient';
import Doctor from '@/lib/models/Doctor';
import {
  buildInvoiceNumber,
  calculateBillingStatus,
  calculateItemsTotal,
  CLINIC_NAME,
  normalizeBillingItems,
  roundMoney,
} from '@/lib/billing-utils';
import type { BillingItem } from '@/lib/types';
import type { ConsultationProcedure } from '@/lib/procedure-types';

export function toConsultationPaymentStatus(status: string) {
  if (status === 'Paid' || status === 'HMO Paid') return 'paid';
  if (status === 'Part Paid') return 'partially_paid';
  if (status.startsWith('HMO')) return 'hmo_pending';
  return 'unpaid';
}

export function toAppBilling(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
    payments: (plain.payments || []).map((payment: any) => ({
      ...payment,
      id: payment.id || String(payment._id || ''),
    })),
  };
}

export function buildBillingItemsFromProcedures(procedures: ConsultationProcedure[] = []) {
  return procedures
    .filter((item) => item.procedure && item.status !== 'cancelled' && Number(item.price || 0) > 0)
    .map((item) => ({
      name: String(item.procedure),
      category: String(item.category || 'Procedure'),
      quantity: 1,
      unitPrice: roundMoney(Number(item.price || 0)),
      notes: item.status ? `Procedure status: ${item.status}` : '',
    }));
}

export async function upsertBillingForConsultation(consultation: any, billingItems: Partial<BillingItem>[] = []) {
  const items = normalizeBillingItems(billingItems);
  const hospitalId = consultation.hospitalId || null;
  const hospitalQuery = hospitalId ? { hospitalId } : { hospitalId: null };
  const consultationId = String(consultation._id || consultation.id);

  const [patient, doctor, existingBill, billCount] = await Promise.all([
    Patient.findOne({ ...hospitalQuery, _id: consultation.patientId }).lean(),
    Doctor.findOne({ ...hospitalQuery, _id: consultation.doctorId }).lean(),
    Billing.findOne({ ...hospitalQuery, consultationId }),
    Billing.countDocuments(hospitalQuery),
  ]);

  if (items.length === 0 && !existingBill) {
    return null;
  }

  const existingPayments = existingBill?.payments || [];
  const amountPaid = roundMoney(
    existingPayments.reduce((sum: number, payment: any) => sum + (Number(payment.amountPaid) || 0), 0)
  );
  const totalAmount = calculateItemsTotal(items);
  const hmoAmountCovered = roundMoney(existingBill?.hmoAmountCovered || 0);
  const hmoOutstandingAmount = roundMoney(existingBill?.hmoOutstandingAmount || 0);
  const balance = roundMoney(Math.max(totalAmount - hmoAmountCovered - amountPaid, 0));
  const paymentStatus = calculateBillingStatus({
    totalAmount,
    amountPaid,
    hmoAmountCovered,
    hmoOutstandingAmount,
    hmoClaimStatus: existingBill?.hmoClaimStatus || 'Not Applicable',
    currentStatus: existingBill?.paymentStatus,
  });

  const update = {
    hospitalId,
    clinicName: existingBill?.clinicName || CLINIC_NAME,
    invoiceNumber: existingBill?.invoiceNumber || buildInvoiceNumber(billCount),
    patientId: consultation.patientId,
    patientName:
      consultation.patientName ||
      [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') ||
      'Patient',
    patientMrn: patient?.mrn || '',
    consultationId,
    doctorId: consultation.doctorId,
    doctorName: consultation.doctorName || doctor?.name || '',
    consultationDate: consultation.createdAt || new Date(),
    items,
    totalAmount,
    amountPaid,
    balance,
    paymentStatus,
  };

  const bill = await Billing.findOneAndUpdate(
    { ...hospitalQuery, consultationId },
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  );

  await syncConsultationBillingSnapshot(bill);

  return bill;
}

export async function syncConsultationBillingSnapshot(bill: any) {
  if (!bill?.consultationId) return null;

  return Consultation.findOneAndUpdate(
    { _id: bill.consultationId, hospitalId: bill.hospitalId || null },
    {
      paymentAmount: roundMoney(bill.totalAmount || 0),
      paymentStatus: toConsultationPaymentStatus(String(bill.paymentStatus || 'Pending Billing')),
    },
    { new: true, runValidators: true }
  ).lean();
}
