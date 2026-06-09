'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Stethoscope,
} from 'lucide-react';

import { LoadingState } from '@/components/loading-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Appointment, CheckIn, CheckInStatus, Doctor, Patient, User } from '@/lib/types';
import { getErrorMessage } from '@/lib/error-message';
import { toast } from '@/hooks/use-toast';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | CheckInStatus;

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayRange(dateValue: string) {
  const start = new Date(`${dateValue}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function statusLabel(status: CheckInStatus) {
  return status.replace('_', ' ');
}

export default function CheckInsPage() {
  const [user] = useState<User | null>(() => getCurrentUser());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [dateFilter, setDateFilter] = useState(formatDateInput(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('waiting');
  const [todayAppointment, setTodayAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppointmentLoading, setIsAppointmentLoading] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  const effectiveDoctorFilter = user?.role === 'doctor' ? user.doctorId || '' : doctorFilter;

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  const loadCheckIns = async () => {
    const skip = (page - 1) * PAGE_SIZE;
    const res = await ApiClient.getCheckIns({
      limit: PAGE_SIZE,
      skip,
      date: dateFilter,
      search: searchTerm.trim() || undefined,
      doctorId: effectiveDoctorFilter || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
    setCheckIns(res?.data || []);
    setTotal(res?.total || 0);
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setIsLoading(true);
        const currentUser = getCurrentUser();
        const [patientsRes, doctorsRes] = await Promise.all([
          ApiClient.getAllPatients({
            limit: 250,
            skip: 0,
            doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
          }),
          ApiClient.getAllDoctors({ limit: 100, skip: 0 }),
        ]);

        const loadedPatients = patientsRes?.data || [];
        const loadedDoctors = doctorsRes?.data || [];
        setPatients(loadedPatients);
        setDoctors(loadedDoctors);

        if (currentUser?.role === 'doctor' && currentUser.doctorId) {
          setSelectedDoctorId(currentUser.doctorId);
        }

        await loadCheckIns();
      } catch (error) {
        console.error('Failed to load check-ins:', error);
        toast({
          title: 'Could not load check-ins',
          description: getErrorMessage(error, 'Failed to load check-ins'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dateFilter) return;

    const refresh = async () => {
      try {
        await loadCheckIns();
      } catch (error) {
        console.error('Failed to refresh check-ins:', error);
      }
    };

    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, searchTerm, doctorFilter, statusFilter, page, user?.role, user?.doctorId]);

  useEffect(() => {
    const loadTodayAppointment = async () => {
      if (!selectedPatientId || !selectedDoctorId) {
        setTodayAppointment(null);
        return;
      }

      try {
        setIsAppointmentLoading(true);
        const { start, end } = getDayRange(formatDateInput(new Date()));
        const res = await ApiClient.getAppointmentsByDateRange(start.toISOString(), end.toISOString(), {
          patientId: selectedPatientId,
          doctorId: selectedDoctorId,
          status: 'scheduled',
          limit: 10,
        });
        setTodayAppointment((res?.data || [])[0] || null);
      } catch {
        setTodayAppointment(null);
      } finally {
        setIsAppointmentLoading(false);
      }
    };

    loadTodayAppointment();
  }, [selectedPatientId, selectedDoctorId]);

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);

    if (user?.role === 'doctor') return;

    const patient = patients.find((item) => item.id === patientId);
    setSelectedDoctorId(patient?.assignedDoctorId || '');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedPatientId || !selectedDoctorId) {
      toast({
        title: 'Patient and doctor required',
        description: 'Select a patient and assign a doctor before checking in.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await ApiClient.createCheckIn({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        appointmentId: todayAppointment?.id,
        notes,
      });

      toast({
        title: 'Patient checked in',
        description: `${selectedPatient?.firstName || 'Patient'} is now on the doctor dashboard.`,
      });

      setSelectedPatientId('');
      if (user?.role !== 'doctor') setSelectedDoctorId('');
      setNotes('');
      setTodayAppointment(null);
      setIsCheckInModalOpen(false);
      setPage(1);
      await loadCheckIns();
    } catch (error) {
      toast({
        title: 'Could not check in patient',
        description: getErrorMessage(error, 'Failed to check in patient'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (checkIn: CheckIn, status: CheckInStatus) => {
    try {
      await ApiClient.updateCheckIn(checkIn.id, { status });
      await loadCheckIns();
    } catch (error) {
      toast({
        title: 'Could not update check-in',
        description: getErrorMessage(error, 'Failed to update check-in'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading check-ins" />;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstCheckInNumber = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastCheckInNumber = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Check-ins</h1>
          <p className="text-gray-600 mt-1">Manage checked-in patients and doctor assignments</p>
        </div>
        <Button
          type="button"
          onClick={() => setIsCheckInModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Check In Patient
        </Button>
      </div>

      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Check In Patient</DialogTitle>
            <DialogDescription>
              Select a patient, assign a doctor, and today&apos;s appointment will be attached when one exists.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Patient</label>
                <SearchableSelect
                  value={selectedPatientId}
                  onValueChange={handlePatientSelect}
                  options={patients.map((patient) => ({
                    value: patient.id,
                    label: `${patient.mrn || patient.id} • ${patient.firstName} ${patient.lastName}`,
                    description: patient.phone,
                  }))}
                  placeholder="Select patient"
                  searchPlaceholder="Search MRN or patient name..."
                  emptyText="No patients found."
                  className="rounded-md"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Doctor</label>
                <SearchableSelect
                  value={selectedDoctorId}
                  onValueChange={setSelectedDoctorId}
                  disabled={user?.role === 'doctor'}
                  options={doctors.map((doctor) => ({
                    value: doctor.id,
                    label: `Dr. ${doctor.name}`,
                    description: doctor.specialization,
                  }))}
                  placeholder="Assign doctor"
                  searchPlaceholder="Search doctor..."
                  emptyText="No doctors found."
                  className="rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional check-in note"
                />
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {isAppointmentLoading ? (
                <span>Checking today&apos;s appointment...</span>
              ) : todayAppointment ? (
                <span>Appointment {todayAppointment.appointmentNumber || todayAppointment.id} will be attached.</span>
              ) : selectedPatientId && selectedDoctorId ? (
                <span>No scheduled appointment today. This will be a walk-in check-in.</span>
              ) : (
                <span>Select patient and doctor to match today&apos;s appointment.</span>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                <CalendarCheck className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Checking in...' : 'Check In Patient'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by patient, MRN, staff, or appointment..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <Select
                value={user?.role === 'doctor' ? user.doctorId || 'all' : doctorFilter || 'all'}
                onValueChange={(value) => {
                  setDoctorFilter(value === 'all' ? '' : value);
                  setPage(1);
                }}
                disabled={user?.role === 'doctor'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All doctors</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as StatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="with_doctor">With doctor</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check-in Records</CardTitle>
          <CardDescription>
            {total} check-in{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState label="Loading check-ins" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Patient</th>
                    <th className="text-left py-3 px-4 font-medium">Doctor</th>
                    <th className="text-left py-3 px-4 font-medium">Appointment</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Checked In</th>
                    <th className="text-left py-3 px-4 font-medium">Staff</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {checkIns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No check-ins found
                      </td>
                    </tr>
                  ) : (
                    checkIns.map((checkIn) => (
                      <tr key={checkIn.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/patients/${checkIn.patientId}`}
                            className="group inline-block"
                          >
                            <span className="block font-medium text-gray-900 group-hover:text-blue-600 group-hover:underline">
                              {checkIn.patientName}
                            </span>
                          </Link>
                          <p className="text-xs font-semibold text-teal-700">
                            MRN {checkIn.patientMrn || checkIn.patientId}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-gray-600">Dr. {checkIn.doctorName}</td>
                        <td className="py-3 px-4">
                          {checkIn.appointmentId ? (
                            <Link
                              href={`/dashboard/appointments/${checkIn.appointmentId}`}
                              className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                            >
                              {checkIn.appointmentNumber || 'Open appointment'}
                            </Link>
                          ) : (
                            <span className="text-gray-600">Walk-in</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                            {statusLabel(checkIn.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <span className="inline-flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {checkIn.checkedInAt.toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{checkIn.checkedInByName}</td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open check-in actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/patients/${checkIn.patientId}`}>
                                  <Eye className="h-4 w-4" />
                                  View Patient
                                </Link>
                              </DropdownMenuItem>
                              {checkIn.appointmentId && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/appointments/${checkIn.appointmentId}`}>
                                    <CalendarCheck className="h-4 w-4" />
                                    View Appointment
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {checkIn.status === 'waiting' && (
                                <DropdownMenuItem onSelect={() => handleStatusChange(checkIn, 'with_doctor')}>
                                  <Stethoscope className="h-4 w-4" />
                                  With Doctor
                                </DropdownMenuItem>
                              )}
                              {checkIn.status !== 'completed' && checkIn.status !== 'cancelled' && (
                                <DropdownMenuItem onSelect={() => handleStatusChange(checkIn, 'completed')}>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Complete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && total > 0 && (
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-600">
                Showing {firstCheckInNumber}-{lastCheckInNumber} of {total} check-in
                {total !== 1 ? 's' : ''} · Page {page} of {totalPages}
              </p>
              <Pagination className="mx-0 w-auto justify-start md:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page === 1) return;
                        setPage((current) => Math.max(1, current - 1));
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(Math.max(0, page - 2), Math.min(totalPages, page + 1))
                    .map((pageNumber) => (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === page}
                          onClick={(event) => {
                            event.preventDefault();
                            setPage(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={page === totalPages ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page === totalPages) return;
                        setPage((current) => Math.min(totalPages, current + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
