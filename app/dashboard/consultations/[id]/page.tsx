'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit2, ChevronLeft, FileText } from 'lucide-react';

import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Appointment, Billing, Consultation, Patient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/loading-state';
import { type ConsultationProcedure } from '@/lib/procedure-types';

const chartCellClass = 'min-h-24 whitespace-pre-line p-3 text-sm leading-6 text-slate-700';

const paymentStatusMeta = {
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-800 border-red-200' },
  partially_paid: { label: 'Partially Paid', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  hmo_pending: { label: 'HMO Pending', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Pending Billing': { label: 'Pending Billing', className: 'bg-slate-100 text-slate-800 border-slate-200' },
  'Pending Payment': { label: 'Pending Payment', className: 'bg-red-100 text-red-800 border-red-200' },
  'Part Paid': { label: 'Part Paid', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  Paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  'HMO Pending': { label: 'HMO Pending', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  'HMO Approved': { label: 'HMO Approved', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  'HMO Paid': { label: 'HMO Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  Cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  Refunded: { label: 'Refunded', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  Outstanding: { label: 'Outstanding', className: 'bg-red-100 text-red-800 border-red-200' },
};

function formatNaira(value?: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizeProcedureName(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function mergeProcedurePricesFromBilling(
  procedures: ConsultationProcedure[] = [],
  bill: Billing | null
) {
  const billingItems = bill?.items || [];
  if (billingItems.length === 0) return procedures;

  const billingItemByName = new Map(
    billingItems.map((item) => [normalizeProcedureName(item.name), item])
  );
  const seenProcedureNames = new Set<string>();

  const mergedProcedures = procedures.map((procedure) => {
    const procedureName = normalizeProcedureName(String(procedure.procedure || ''));
    seenProcedureNames.add(procedureName);

    const billingItem = billingItemByName.get(procedureName);
    if (!billingItem) return procedure;

    return {
      ...procedure,
      category: procedure.category || billingItem.category,
      price: billingItem.unitPrice,
    };
  });

  const missingBillingProcedures = billingItems
    .filter((item) => !seenProcedureNames.has(normalizeProcedureName(item.name)))
    .map((item) => ({
      category: item.category || 'Procedure',
      procedure: item.name,
      price: item.unitPrice,
      status: 'pending' as const,
    }));

  return [...mergedProcedures, ...missingBillingProcedures];
}

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [procedureItems, setProcedureItems] = useState<ConsultationProcedure[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [billingId, setBillingId] = useState<string | null>(null);
  const [canView, setCanView] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/consultations');
    }
  };

  const loadConsultation = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError('');
      setCanView(true);

      const currentUser = getCurrentUser();
      const response = await ApiClient.getConsultation(consultationId);
      const consultData = response?.data || response?.consultation || null;

      if (!consultData) {
        setError('Consultation not found');
        return;
      }

      if (
        currentUser?.role === 'doctor' &&
        currentUser.doctorId &&
        consultData.doctorId !== currentUser.doctorId
      ) {
        setCanView(false);
        return;
      }

      const [patientRes, appointmentRes, billingRes] = await Promise.all([
        ApiClient.getPatient(consultData.patientId),
        consultData.appointmentId
          ? ApiClient.getAppointment(consultData.appointmentId)
          : Promise.resolve(null),
        ApiClient.getBilling({ consultationId: consultData.id, limit: 1 }).catch(() => null),
      ]);

      const existingBilling = billingRes?.data?.[0] || billingRes?.billing?.[0] || null;
      const mergedProcedures = mergeProcedurePricesFromBilling(
        Array.isArray(consultData.procedures) ? consultData.procedures : [],
        existingBilling
      );

      setConsultation({
        ...consultData,
        paymentAmount: existingBilling?.totalAmount ?? consultData.paymentAmount,
        procedures: mergedProcedures,
      });
      setProcedureItems(mergedProcedures);
      setPatient(patientRes?.data || patientRes?.patient || null);
      setAppointment(appointmentRes?.data || appointmentRes?.appointment || null);
      setBilling(existingBilling);
      setBillingId(existingBilling?.id || existingBilling?._id || null);
    } catch (err) {
      console.error('Failed to load consultation detail:', err);
      setError('Unable to load consultation');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadConsultation();
    });
  }, [loadConsultation]);

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        void loadConsultation(false);
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [loadConsultation]);

  if (isLoading) {
    return (
      <LoadingState label="Loading consultation" className="rounded-2xl border border-slate-200 bg-white p-6" />
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <p className="text-lg font-semibold">Unable to open consultation</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="text-lg font-semibold">Access restricted</p>
        <p className="mt-2 text-sm">
          You can only open consultations assigned to your doctor account.
        </p>
      </div>
    );
  }

  if (!consultation || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Consultation not found</p>
      </div>
    );
  }

  const createdAt = new Date(consultation.createdAt);
  const nextVisitDate = consultation.nextVisitDate ? new Date(consultation.nextVisitDate) : null;
  const attachments = (consultation as any).attachments || [];
  const chartBlocks = (consultation as any).chartBlocks || [];
  const estimatedConsumables = consultation.estimatedConsumables || [];
  const actualConsumables = consultation.actualConsumables || [];
  const procedures = procedureItems;
  const paymentStatus = (billing?.paymentStatus || consultation.paymentStatus || 'unpaid') as keyof typeof paymentStatusMeta;
  const paymentMeta = paymentStatusMeta[paymentStatus] || paymentStatusMeta.unpaid;
  const currentUser = getCurrentUser();
  const canManageBilling = currentUser?.role === 'admin';
  const totalProcedureAmount = procedures
    .filter((item) => item.status !== 'cancelled')
    .reduce((sum, item) => sum + Number(item.price || 0), 0);

  const updateProcedureField = (index: number, field: 'price' | 'status', value: string) => {
    setProcedureItems((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              [field]: field === 'price' ? (value === '' ? '' : Number(value)) : value,
            }
          : item
      )
    );
  };

  const handleSaveBilling = async (statusOverride?: string) => {
    if (!canManageBilling) return;

    try {
      setIsSavingBilling(true);
      setError('');

      const normalizedProcedures = procedures
        .filter((item) => item.procedure && String(item.procedure).trim())
        .map((item) => ({
          ...item,
          price: item.price === '' || item.price === undefined || item.price === null
            ? undefined
            : Number(item.price),
          status: item.status || 'pending',
          updatedBy: currentUser?.id || 'admin',
          updatedByName: currentUser?.name || currentUser?.email || 'Admin',
        }));

      const nextStatus = statusOverride || consultation.paymentStatus || 'unpaid';
      const updatedConsultation = await ApiClient.updateConsultation(consultation.id, {
        paymentAmount: totalProcedureAmount,
        paymentStatus: nextStatus,
        procedures: normalizedProcedures,
        updatedByName: currentUser?.name || currentUser?.email || 'Admin',
      });

      const savedConsultation = updatedConsultation?.data || updatedConsultation?.consultation || null;
      const savedBilling = updatedConsultation?.billing || null;

      setConsultation((current) =>
        current
          ? {
              ...current,
              paymentAmount: totalProcedureAmount,
              paymentStatus: nextStatus as Consultation['paymentStatus'],
              procedures: normalizedProcedures,
            }
          : current
      );

      if (savedConsultation) {
        setProcedureItems(Array.isArray(savedConsultation.procedures) ? savedConsultation.procedures : normalizedProcedures);
      }
      setBilling(savedBilling || billing);
      setBillingId(savedBilling?.id || savedBilling?._id || billingId);
    } catch (err) {
      console.error('Failed to save billing changes:', err);
      setError('Unable to save billing changes');
    } finally {
      setIsSavingBilling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-0 h-auto hover:bg-transparent mt-1"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </Button>
          <div>
            <h1 className="md:text-3xl text-2xl font-bold text-gray-900">Consultation Record</h1>
          </div>
        </div>
        {getCurrentUser()?.role === 'admin' && (
          <Link href={`/dashboard/consultations/${consultation.id}/edit`}>
            <Button>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </div>
        <p className="mt-1 text-gray-600">
          Patient MRN:{' '}
          <span className="font-semibold text-gray-900">{patient.mrn || patient.id}</span>{' '}
          -{' '}
          <Link
            href={`/dashboard/patients/${patient.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {patient.firstName} {patient.lastName}
          </Link>
        </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Date</p>
            <p className="mt-1 text-lg font-semibold">{createdAt.toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Time</p>
            <p className="mt-1 text-lg font-semibold">
              {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Related Appointment</p>
            {appointment ? (
              <Link href={`/dashboard/appointments/${appointment.id}`}>
                <p className="mt-1 text-lg font-semibold text-blue-600 hover:underline">
                  Appointment {appointment.appointmentNumber || appointment.id}
                </p>
              </Link>
            ) : (
              <p className="mt-1 text-lg font-semibold text-gray-500">None</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Billing & Status</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${paymentMeta.className}`}>
                {paymentMeta.label}
              </span>
              <span className="text-lg font-semibold">{formatNaira(totalProcedureAmount)}</span>
            </div>
            {billingId && (
              <Link href={`/dashboard/billing/${billingId}`} className="mt-3 inline-flex">
                <Button type="button" size="sm" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  View Invoice
                </Button>
              </Link>
            )}
            {billing && (
              <div className="mt-3 grid gap-1 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span>Paid</span>
                  <span className="font-medium text-slate-900">{formatNaira(billing.amountPaid)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Balance</span>
                  <span className="font-medium text-slate-900">{formatNaira(billing.balance)}</span>
                </div>
              </div>
            )}
            {/* {canManageBilling && (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  Consultation Status
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={consultation.paymentStatus || 'unpaid'}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setConsultation((current) =>
                        current ? { ...current, paymentStatus: nextValue as Consultation['paymentStatus'] } : current
                      );
                    }}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="hmo_pending">HMO Pending</option>
                  </select>
                  <Button type="button" size="sm" variant="outline" onClick={() => handleSaveBilling(consultation.paymentStatus || 'unpaid')} disabled={isSavingBilling}>
                    {isSavingBilling ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )} */}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Presenting Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-gray-700">
              {consultation.presentingComplaints || 'No presenting complaints recorded'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consumables & Stock Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Estimated from procedures</p>
              {estimatedConsumables.length === 0 ? (
                <p className="text-sm text-slate-500">No standard consumable estimate is available for these procedures yet.</p>
              ) : (
                <div className="space-y-2">
                  {estimatedConsumables.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-950">{item.name}</p>
                        <span className="font-semibold text-slate-900">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        {item.procedure && <span>{item.procedure}</span>}
                        {typeof item.availableQuantity === 'number' ? (
                          <span className={item.hasSufficientStock ? 'text-emerald-700' : 'text-red-700'}>
                            Stock: {item.availableQuantity} {item.hasSufficientStock ? 'available' : 'insufficient'}
                          </span>
                        ) : (
                          <span className="text-amber-700">No matching inventory item</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Actual recorded usage</p>
              {actualConsumables.length === 0 ? (
                <p className="text-sm text-slate-500">No actual consumables were entered for this consultation.</p>
              ) : (
                <div className="space-y-2">
                  {actualConsumables.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-950">{item.name}</p>
                        <span className="font-semibold text-slate-900">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      {item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Examination</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-gray-700">
              {consultation.examination || 'No examination findings recorded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {chartBlocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chart</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {chartBlocks.map((block: any, index: number) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-sm font-semibold text-slate-900">Chart {index + 1}</p>
                <div className="mx-auto grid max-w-xl grid-cols-2 overflow-hidden rounded-2xl border-2 border-black bg-white">
                  <div className={`${chartCellClass} border-b-2 border-black`}>
                    {block.upperRight || 'Upper right'}
                  </div>
                  <div className={`${chartCellClass} border-b-2 border-l-2 border-black`}>
                    {block.upperLeft || 'Upper left'}
                  </div>
                  <div className={chartCellClass}>
                    {block.lowerRight || 'Lower right'}
                  </div>
                  <div className={`${chartCellClass} border-l-2 border-black`}>
                    {block.lowerLeft || 'Lower left'}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {consultation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-gray-700">{consultation.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Impression/Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-gray-700">{consultation.diagnosis}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treatment Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-gray-700">
              {consultation.treatmentPlan || 'No treatment plan recorded'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Procedures</CardTitle>
          </CardHeader>
          <CardContent>
            {procedures.length === 0 ? (
              <p className="text-gray-500">No procedures recorded</p>
            ) : (
              <div className="space-y-3">
                {procedures.map((item: ConsultationProcedure, index: number) => (
                  <div key={`${item.procedure}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                      {item.category || 'Procedure'}
                    </p>
                    <p className="mt-1 font-medium text-slate-900">{item.procedure}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Price (NGN)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={item.price === undefined || item.price === null ? '' : String(item.price)}
                          onChange={(event) => updateProcedureField(index, 'price', event.target.value)}
                          disabled={!canManageBilling}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Procedure Status
                        </label>
                        <select
                          value={item.status || 'pending'}
                          onChange={(event) => updateProcedureField(index, 'status', event.target.value)}
                          disabled={!canManageBilling}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    {item.updatedByName && (
                      <p className="mt-2 text-xs text-slate-500">Updated by {item.updatedByName}</p>
                    )}
                  </div>
                ))}
                {canManageBilling && (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={() => handleSaveBilling(consultation.paymentStatus || 'unpaid')} disabled={isSavingBilling}>
                      {isSavingBilling ? 'Saving...' : 'Save Procedure Details'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treatment Done</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-gray-700">{consultation.treatment}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prescription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-gray-700">
              {consultation.prescription || 'No prescription'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            {nextVisitDate ? (
              <div>
                <p className="mb-1 text-sm text-gray-600">Recommended Next Visit</p>
                <p className="text-lg font-semibold">
                  {nextVisitDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No follow-up date set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {attachments.map((attachment: any) => (
                <a
                  key={attachment.publicId || attachment.url}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:border-teal-200 hover:bg-white"
                >
                  {attachment.kind === 'image' ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="mb-3 h-40 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-3 flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                      {attachment.mimeType || 'File'}
                    </div>
                  )}
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700">
                    {attachment.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {attachment.kind === 'image' ? 'Image' : 'Document'}
                  </p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
