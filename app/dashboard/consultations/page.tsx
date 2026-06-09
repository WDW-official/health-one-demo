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
      <div className="flex items-center justify-between">
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
                return (
                  <div
                    key={consultation.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        <Link href={`/dashboard/patients/${consultation.patientId}`} className="text-blue-600 hover:underline">
                          {patientMrn} • {patient ? `${patient.firstName} ${patient.lastName}` : consultation.patientName || 'Patient'}
                        </Link>
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        <span className="font-medium">Diagnosis:</span> {consultation.diagnosis}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-teal-700">
                        MRN {patientMrn}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(consultation.createdAt).toLocaleDateString()} at{' '}
                        {new Date(consultation.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open consultation actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/consultations/${consultation.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
