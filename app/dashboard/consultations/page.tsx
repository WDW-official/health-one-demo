'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Eye, MoreHorizontal } from 'lucide-react';

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
import { Consultation, Patient, User } from '@/lib/types';

const paymentStatusMeta = {
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-800 border-red-200' },
  partially_paid: { label: 'Partially Paid', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  hmo_pending: { label: 'HMO Pending', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

function formatNaira(value?: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ConsultationsPage() {
  const [user] = useState<User | null>(() => getCurrentUser());
  const [consultations, setConsultations] = useState<Consultation[]>([]);
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
        const [consultationRes, patientRes] = await Promise.all([
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
        ]);

        setConsultations(consultationRes?.data || []);
        setPatients(patientRes?.data || []);
      } catch (error) {
        console.error('Failed to load consultations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [patientFilter]);

  const patientMap = useMemo(() => {
    return new Map(patients.map((patient) => [patient.id, patient]));
  }, [patients]);

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
    <div className="space-y-6">
      <div className="md:flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consultations</h1>
          <p className="mt-1 text-gray-600">View and manage patient consultation records</p>
        </div>
        {user?.role === 'admin' && (
          <Link href="/dashboard/consultations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Consultation
            </Button>
          </Link>
        )}
      </div>

      <Card>
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

      <Card>
        <CardContent className="pt-6">
          <SearchableSelect
            value={patientFilter}
            onValueChange={(value) => setPatientFilter(value)}
            options={patients.map((patient) => ({
              value: patient.id,
              label: `${patient.mrn || patient.id} • ${patient.firstName} ${patient.lastName}`,
              description: patient.assignedDoctorName ? `Dr. ${patient.assignedDoctorName}` : patient.email,
            }))}
            placeholder="Filter consultations by patient"
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

      <Card>
        <CardHeader>
          <CardTitle>Consultation Records</CardTitle>
          <CardDescription>
            {sortedConsultations.length} consultation{sortedConsultations.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState label="Loading consultations" />
          ) : sortedConsultations.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-gray-500">No consultations found</p>
              {user?.role === 'admin' && (
                <Link href="/dashboard/consultations/new">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Consultation
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedConsultations.map((consultation) => {
                const patient = patientMap.get(consultation.patientId);
                const patientMrn = patient?.mrn || consultation.patientId;
                const paymentStatus = (consultation.paymentStatus || 'unpaid') as keyof typeof paymentStatusMeta;
                const paymentMeta = paymentStatusMeta[paymentStatus] || paymentStatusMeta.unpaid;
                return (
                  <Link
                    key={consultation.id}
                    href={`/dashboard/consultations/${consultation.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-blue-600 hover:underline">
                            {patientMrn} • {patient ? `${patient.firstName} ${patient.lastName}` : consultation.patientName || 'Patient'}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentMeta.className}`}>
                            {paymentMeta.label}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Diagnosis:</span> {consultation.diagnosis}
                        </p>

                        {consultation.treatment ? (
                          <p className="mt-1 text-sm text-slate-600">
                            <span className="font-medium text-slate-900">Treatment:</span> {consultation.treatment}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            {new Date(consultation.createdAt).toLocaleString()}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            MRN {patientMrn}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:flex-col md:items-end">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatNaira(consultation.paymentAmount)}
                        </span>
                        <div onClick={(event) => event.preventDefault()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open consultation actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="left" sideOffset={4}>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/consultations/${consultation.id}`}>
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
