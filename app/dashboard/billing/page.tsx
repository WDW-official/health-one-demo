'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, MoreHorizontal } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { LoadingState } from '@/components/loading-state';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Billing, Consultation, Patient, User } from '@/lib/types';

function formatNaira(value?: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function paymentStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    add_prices: 'Add Prices',
    unpaid: 'Pending Payment',
    partially_paid: 'Part Paid',
    paid: 'Paid',
    hmo_pending: 'HMO Pending',
  };

  return labels[String(status || '')] || status || 'Pending Billing';
}

function paymentStatusClass(status?: string) {
  const normalized = paymentStatusLabel(status);
  const statusClasses: Record<string, string> = {
    'Add Prices': 'border-violet-200 bg-violet-50 text-violet-700',
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

  return statusClasses[normalized] || 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function BillingPage() {
  const [user] = useState<User | null>(() => getCurrentUser());
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [billingRecords, setBillingRecords] = useState<Billing[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const currentUser = getCurrentUser();
        const doctorParams = currentUser?.role === 'doctor' ? { doctorId: currentUser.doctorId } : {};
        const [consultationRes, patientRes, billingRes] = await Promise.all([
          ApiClient.getAllConsultations({
            ...doctorParams,
            patientId: patientFilter || undefined,
            limit: 200,
            skip: 0,
          }),
          ApiClient.getAllPatients({
            ...doctorParams,
            limit: 200,
            skip: 0,
          }),
          ApiClient.getBilling({
            ...doctorParams,
            patientId: patientFilter || undefined,
            limit: 200,
            skip: 0,
          }),
        ]);

        setConsultations(consultationRes?.data || []);
        setPatients(patientRes?.data || []);
        setBillingRecords(billingRes?.data || []);
      } catch (error) {
        console.error('Failed to load consultations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    queueMicrotask(() => {
      void loadData();
    });
  }, [patientFilter]);

  const patientMap = useMemo(() => {
    return new Map(patients.map((patient) => [patient.id, patient]));
  }, [patients]);

  const billingMap = useMemo(() => {
    return new Map(billingRecords.map((bill) => [bill.consultationId, bill]));
  }, [billingRecords]);

  const filteredConsultations = consultations.filter((consultation) => {
    const patient = patientMap.get(consultation.patientId);
    const patientText = `${patient?.mrn || ''} ${patient?.firstName || ''} ${patient?.lastName || ''} ${consultation.patientName || ''}`.toLowerCase();
    return patientText.includes(searchTerm.toLowerCase()) ||
      (consultation.diagnosis || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedConsultations = [...filteredConsultations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="md:flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="mt-1 text-gray-600">Manage consultation billing and procedure amounts</p>
        </div>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by MRN, patient name, or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="min-w-0 pt-6">
          <SearchableSelect
            value={patientFilter}
            onValueChange={(value) => setPatientFilter(value)}
            options={patients.map((patient) => ({
              value: patient.id,
              label: `${patient.mrn || patient.id} • ${patient.firstName} ${patient.lastName}`,
              description: patient.assignedDoctorName ? `Dr. ${patient.assignedDoctorName}` : patient.email,
            }))}
            placeholder="Filter by patient"
            searchPlaceholder="Search patient MRN or name..."
            emptyText="No patients found."
          />
          {patientFilter && (
            <div className="mt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setPatientFilter('')}>
                Clear patient filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Consultations for Billing</CardTitle>
          <CardDescription>
            {sortedConsultations.length} consultation{sortedConsultations.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {isLoading ? (
            <LoadingState label="Loading consultations" />
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full table-fixed text-xs sm:table-auto sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-[70px] px-2 py-3 text-left font-medium sm:w-auto sm:px-4">MRN</th>
                    <th className="px-2 py-3 text-left font-medium sm:px-4">Patient</th>
                    <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Diagnosis</th>
                    <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Date</th>
                    <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Amount</th>
                    <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Status</th>
                    <th className="w-[52px] px-2 py-3 text-right font-medium sm:w-auto sm:px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedConsultations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">No consultations found</td>
                    </tr>
                  ) : (
                    sortedConsultations.map((consultation) => {
                      const patient = patientMap.get(consultation.patientId);
                      const bill = billingMap.get(consultation.id);
                      const procedureAmount = (consultation.procedures || [])
                        .filter((item) => item.status !== 'cancelled')
                        .reduce((sum, item) => sum + Number(item.price || 0), 0);
                      const billedAmount = bill?.totalAmount || consultation.paymentAmount || procedureAmount || 0;
                      const canOpenInvoice = Boolean(bill?.id && billedAmount > 0);
                      const paymentStatus = canOpenInvoice
                        ? bill?.paymentStatus || consultation.paymentStatus || 'Pending Billing'
                        : 'add_prices';
                      const patientMrn = patient?.mrn || consultation.patientId;
                      return (
                        <tr key={consultation.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="whitespace-nowrap px-2 py-3 sm:px-4">
                            <Link href={`/dashboard/patients/${consultation.patientId}`} className="block max-w-[60px] truncate font-semibold text-gray-900 hover:text-blue-600 hover:underline sm:max-w-none">
                              {patientMrn}
                            </Link>
                          </td>
                          <td className="min-w-0 px-2 py-3 sm:px-4">
                            <Link href={`/dashboard/patients/${consultation.patientId}`} className="group block min-w-0">
                              <span className="block font-medium text-gray-900 group-hover:text-blue-600 group-hover:underline truncate">
                                {patient ? `${patient.firstName} ${patient.lastName}` : consultation.patientName || 'Patient'}
                              </span>
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                              <span className="text-[11px] font-semibold text-gray-900">
                                {formatNaira(billedAmount)}
                              </span>
                              <span className={`inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold ${paymentStatusClass(paymentStatus)}`}>
                                {paymentStatusLabel(paymentStatus)}
                              </span>
                            </div>
                          </td>
                          <td className="hidden max-w-xs truncate px-4 py-3 text-gray-600 md:table-cell">{consultation.diagnosis}</td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-gray-600 lg:table-cell">{new Date(consultation.createdAt).toLocaleString()}</td>
                          <td className="hidden whitespace-nowrap px-4 py-3 font-semibold text-gray-900 sm:table-cell">
                            {formatNaira(billedAmount)}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusClass(paymentStatus)}`}>
                              {paymentStatusLabel(paymentStatus)}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-right sm:px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open billing actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={canOpenInvoice ? `/dashboard/billing/${bill?.id}` : `/dashboard/consultations/${consultation.id}`}>
                                    {canOpenInvoice ? 'Open Invoice' : 'Add Procedure Prices'}
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
