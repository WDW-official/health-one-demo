'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Printer, Save } from 'lucide-react';

import { ApiClient } from '@/lib/api-client';
import { Billing, HmoClaimStatus, PaymentMethod, PaymentStatus } from '@/lib/types';
import { getErrorMessage } from '@/lib/error-message';
import { toast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/loading-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const paymentMethods: PaymentMethod[] = [
  'Cash',
  'Bank transfer',
  'POS/card',
  'HMO',
  'Part cash / part HMO',
  'Part payment',
  'Outstanding balance',
  'Other',
];

const hmoStatuses: HmoClaimStatus[] = [
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

const paymentStatuses: PaymentStatus[] = [
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

function formatCurrency(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

function dateInputValue(value?: Date) {
  if (!value) return '';
  return new Date(value).toISOString().split('T')[0];
}

function statusClass(status: string) {
  const statusClasses: Record<string, string> = {
    'Pending Billing': 'border-slate-200 bg-slate-50 text-slate-700',
    'Pending Payment': 'border-amber-200 bg-amber-50 text-amber-700',
    'Part Paid': 'border-orange-200 bg-orange-50 text-orange-700',
    Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    'HMO Pending': 'border-sky-200 bg-sky-50 text-sky-700',
    'HMO Approved': 'border-indigo-200 bg-indigo-50 text-indigo-700',
    'HMO Paid': 'border-teal-200 bg-teal-50 text-teal-700',
    Cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
    Refunded: 'border-purple-200 bg-purple-50 text-purple-700',
    Outstanding: 'border-red-200 bg-red-50 text-red-700',
  };

  return statusClasses[status] || 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function BillingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const billingId = params.id as string;
  const [billing, setBilling] = useState<Billing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingHmo, setIsSavingHmo] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [error, setError] = useState('');
  const [hmoForm, setHmoForm] = useState({
    hmoProvider: '',
    hmoPlan: '',
    hmoApprovalCode: '',
    hmoApprovalStatus: '',
    hmoAmountCovered: 0,
    hmoPatientAmount: 0,
    hmoOutstandingAmount: 0,
    hmoClaimSubmissionDate: '',
    hmoClaimPaymentDate: '',
    hmoClaimStatus: 'Not Applicable' as HmoClaimStatus,
    paymentStatus: 'Pending Billing' as PaymentStatus,
    notes: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentMethod: 'Cash' as PaymentMethod,
    paymentReference: '',
    notes: '',
  });

  const hydrateForms = (bill: Billing) => {
    setHmoForm({
      hmoProvider: bill.hmoProvider || '',
      hmoPlan: bill.hmoPlan || '',
      hmoApprovalCode: bill.hmoApprovalCode || '',
      hmoApprovalStatus: bill.hmoApprovalStatus || '',
      hmoAmountCovered: bill.hmoAmountCovered || 0,
      hmoPatientAmount: bill.hmoPatientAmount || Math.max((bill.totalAmount || 0) - (bill.hmoAmountCovered || 0), 0),
      hmoOutstandingAmount: bill.hmoOutstandingAmount || 0,
      hmoClaimSubmissionDate: dateInputValue(bill.hmoClaimSubmissionDate),
      hmoClaimPaymentDate: dateInputValue(bill.hmoClaimPaymentDate),
      hmoClaimStatus: bill.hmoClaimStatus || 'Not Applicable',
      paymentStatus: bill.paymentStatus || 'Pending Billing',
      notes: bill.notes || '',
    });
  };

  useEffect(() => {
    const loadBilling = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await ApiClient.getBillingRecord(billingId);
        const bill = response?.data || response?.billing || null;
        setBilling(bill);
        if (bill) hydrateForms(bill);
      } catch (err) {
        console.error('Failed to load billing record:', err);
        setError('Unable to load billing record');
      } finally {
        setIsLoading(false);
      }
    };

    loadBilling();
  }, [billingId]);

  const saveHmo = async () => {
    if (!billing) return;
    try {
      setIsSavingHmo(true);
      const response = await ApiClient.updateBillingRecord(billing.id, hmoForm);
      const bill = response?.data || response?.billing;
      setBilling(bill);
      hydrateForms(bill);
      toast({ title: 'Billing updated', description: 'HMO and billing status details were saved.' });
    } catch (err) {
      toast({ title: 'Could not update billing', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSavingHmo(false);
    }
  };

  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!billing) return;
    try {
      setIsRecordingPayment(true);
      const response = await ApiClient.recordBillingPayment(billing.id, {
        ...paymentForm,
        amountPaid: Number(paymentForm.amountPaid) || 0,
      });
      const bill = response?.data || response?.billing;
      setBilling(bill);
      hydrateForms(bill);
      setPaymentForm({ amountPaid: '', paymentMethod: 'Cash', paymentReference: '', notes: '' });
      toast({ title: 'Payment recorded', description: `Receipt ${response?.receiptNumber || ''} was generated.` });
    } catch (err) {
      toast({ title: 'Could not record payment', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading billing record" className="rounded-2xl border border-slate-200 bg-white p-6" />;
  }

  if (error || !billing) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <p className="text-lg font-semibold">Unable to open billing record</p>
        <p className="mt-2 text-sm">{error || 'Billing record not found'}</p>
      </div>
    );
  }

  const latestReceipt = billing.payments[billing.payments.length - 1]?.receiptNumber;

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col gap-4 print:hidden md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-1 h-auto p-0 hover:bg-transparent">
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice {billing.invoiceNumber}</h1>
            <p className="mt-1 text-gray-600">
              {billing.patientName} • {billing.patientMrn || billing.patientId}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/consultations/${billing.consultationId}`}>
            <Button variant="outline">Open Consultation</Button>
          </Link>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-950">{billing.clinicName}</p>
            <p className="mt-1 text-sm text-slate-600">Invoice / Receipt / Payment Confirmation</p>
          </div>
          <div className="text-sm md:text-right">
            <p className="font-semibold text-slate-900">Invoice: {billing.invoiceNumber}</p>
            {latestReceipt && <p className="text-slate-600">Latest receipt: {latestReceipt}</p>}
            <p className="text-slate-600">Date: {new Date(billing.consultationDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-slate-500">Patient</p>
            <p className="font-semibold text-slate-950">{billing.patientName}</p>
            <p className="text-slate-600">ID: {billing.patientMrn || billing.patientId}</p>
          </div>
          <div>
            <p className="text-slate-500">Doctor</p>
            <p className="font-semibold text-slate-950">{billing.doctorName || 'Doctor'}</p>
          </div>
          <div>
            <p className="text-slate-500">Status</p>
            <Badge variant="outline" className={statusClass(billing.paymentStatus)}>
              {billing.paymentStatus}
            </Badge>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto print:overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="py-2 pr-3 font-medium">Service</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Qty</th>
                <th className="py-2 pr-3 font-medium">Unit Price</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {billing.items.map((item, index) => (
                <tr key={`${item.name}-${index}`} className="border-b last:border-0">
                  <td className="py-3 pr-3 font-medium text-slate-950">{item.name}</td>
                  <td className="py-3 pr-3 text-slate-600">{item.category}</td>
                  <td className="py-3 pr-3 text-slate-600">{item.quantity}</td>
                  <td className="py-3 pr-3 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-right font-semibold text-slate-950">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-3 text-sm md:ml-auto md:max-w-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Amount billed</span>
            <span className="font-semibold">{formatCurrency(billing.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Amount paid</span>
            <span className="font-semibold">{formatCurrency(billing.amountPaid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">HMO covered</span>
            <span className="font-semibold">{formatCurrency(billing.hmoAmountCovered)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 text-base">
            <span className="font-semibold text-slate-950">Balance</span>
            <span className="font-bold text-slate-950">{formatCurrency(billing.balance)}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 print:hidden lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Process Payment</CardTitle>
            <CardDescription>Record cash, transfer, POS/card, HMO, part payment, or outstanding balance payment.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={recordPayment} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Amount Paid</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amountPaid}
                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, amountPaid: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentMethod: event.target.value as PaymentMethod }))}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Payment Reference</label>
                <Input
                  value={paymentForm.paymentReference}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentReference: event.target.value }))}
                  placeholder="Transfer, POS, or approval reference"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={isRecordingPayment}>
                {isRecordingPayment ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HMO Billing</CardTitle>
            <CardDescription>Track approvals, claims, receivables, and patient responsibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">HMO Provider</label>
                <Input value={hmoForm.hmoProvider} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoProvider: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">HMO Plan</label>
                <Input value={hmoForm.hmoPlan} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoPlan: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Approval Code</label>
                <Input value={hmoForm.hmoApprovalCode} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoApprovalCode: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Approval Status</label>
                <Input value={hmoForm.hmoApprovalStatus} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoApprovalStatus: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Amount Covered by HMO</label>
                <Input type="number" min="0" step="0.01" value={hmoForm.hmoAmountCovered} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoAmountCovered: Number(event.target.value) || 0 }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Amount Paid by Patient</label>
                <Input type="number" min="0" step="0.01" value={hmoForm.hmoPatientAmount} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoPatientAmount: Number(event.target.value) || 0 }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Outstanding from HMO</label>
                <Input type="number" min="0" step="0.01" value={hmoForm.hmoOutstandingAmount} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoOutstandingAmount: Number(event.target.value) || 0 }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Claim Status</label>
                <select
                  value={hmoForm.hmoClaimStatus}
                  onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoClaimStatus: event.target.value as HmoClaimStatus }))}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {hmoStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Claim Submission Date</label>
                <Input type="date" value={hmoForm.hmoClaimSubmissionDate} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoClaimSubmissionDate: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Claim Payment Date</label>
                <Input type="date" value={hmoForm.hmoClaimPaymentDate} onChange={(event) => setHmoForm((prev) => ({ ...prev, hmoClaimPaymentDate: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Payment Status</label>
                <select
                  value={hmoForm.paymentStatus}
                  onChange={(event) => setHmoForm((prev) => ({ ...prev, paymentStatus: event.target.value as PaymentStatus }))}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {paymentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Billing Notes</label>
              <Textarea value={hmoForm.notes} onChange={(event) => setHmoForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} />
            </div>
            <Button type="button" onClick={saveHmo} disabled={isSavingHmo}>
              <Save className="mr-2 h-4 w-4" />
              {isSavingHmo ? 'Saving...' : 'Save Billing Details'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>{billing.payments.length} payment{billing.payments.length !== 1 ? 's' : ''} recorded</CardDescription>
        </CardHeader>
        <CardContent>
          {billing.payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payment has been recorded for this bill.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.payments.map((payment) => (
                  <TableRow key={payment.id || payment.receiptNumber}>
                    <TableCell>{new Date(payment.paidAt).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(payment.amountPaid)}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell>{payment.paymentReference || '-'}</TableCell>
                    <TableCell>{payment.receiptNumber}</TableCell>
                    <TableCell>{payment.recordedByName || 'Staff'}</TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal">{payment.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
