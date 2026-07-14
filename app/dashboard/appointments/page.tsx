'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, CalendarClock, CheckCircle, ChevronLeft, ChevronRight, MoreHorizontal, Plus, XCircle } from 'lucide-react';

import { AppointmentCalendar } from '@/components/appointment-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { LoadingState } from '@/components/loading-state';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Appointment, Patient, User } from '@/lib/types';

type CalendarView = 'day' | 'week' | 'month';
type StatusFilter = 'all' | 'scheduled' | 'completed' | 'cancelled';

const PAGE_SIZE = 10;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getCalendarRange(view: CalendarView, date: Date) {
  if (view === 'day') {
    const start = startOfDay(date);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (view === 'week') {
    return { start: startOfWeek(date), end: endOfWeek(date) };
  }

  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export default function AppointmentsPage() {
  const [user] = useState<User | null>(() => getCurrentUser());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [patientFilter, setPatientFilter] = useState('');
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setIsLoading(true);
        const currentUser = getCurrentUser();
        const skip = (page - 1) * PAGE_SIZE;
        const res = await ApiClient.getAllAppointments({
          limit: PAGE_SIZE,
          skip,
          status: statusFilter === 'all' ? undefined : statusFilter,
          patientId: patientFilter || undefined,
          doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
        });

        setAppointments(res?.data || []);
        setTotal(res?.total || 0);
      } catch (error) {
        console.error('Error loading appointments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, [page, statusFilter, patientFilter]);

  useEffect(() => {
    const loadCalendarAppointments = async () => {
      try {
        setCalendarLoading(true);
        const currentUser = getCurrentUser();
        const range = getCalendarRange(calendarView, calendarDate);
        const res = await ApiClient.getAppointmentsByDateRange(
          range.start.toISOString(),
          range.end.toISOString(),
          {
            limit: 250,
            patientId: patientFilter || undefined,
            doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
          }
        );

        setCalendarAppointments(res?.data || []);
      } catch (error) {
        console.error('Error loading calendar appointments:', error);
      } finally {
        setCalendarLoading(false);
      }
    };

    loadCalendarAppointments();
  }, [calendarView, calendarDate, patientFilter]);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const currentUser = getCurrentUser();
        const res = await ApiClient.getAllPatients({
          doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
          limit: 200,
          skip: 0,
        });
        setPatients(res?.data || []);
      } catch (error) {
        console.error('Error loading patient filter options:', error);
      }
    };

    loadPatients();
  }, []);

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    try {
      await ApiClient.updateAppointment(id, { status });
      const currentUser = getCurrentUser();
      const skip = (page - 1) * PAGE_SIZE;
      const res = await ApiClient.getAllAppointments({
        limit: PAGE_SIZE,
        skip,
        status: statusFilter === 'all' ? undefined : statusFilter,
        doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
      });

      setAppointments(res?.data || []);
      setTotal(res?.total || 0);
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-1 text-gray-600">Schedule and manage patient visits from a weekly calendar.</p>
        </div>
        <Link href="/dashboard/appointments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'scheduled', 'completed', 'cancelled'] as StatusFilter[]).map((status) => (
          <Button
            key={status}
            type="button"
            variant={statusFilter === status ? 'default' : 'outline'}
            onClick={() => {
              setPage(1);
              setStatusFilter(status);
            }}
            className="rounded-full"
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <SearchableSelect
            value={patientFilter}
            onValueChange={(value) => {
              setPage(1);
              setPatientFilter(value);
            }}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(1);
                  setPatientFilter('');
                }}
              >
                Clear patient filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        {calendarLoading ? (
          <Card>
            <CardContent>
              <LoadingState label="Loading calendar" className="py-10" />
            </CardContent>
          </Card>
        ) : (
          <AppointmentCalendar
            appointments={calendarAppointments}
            currentDate={calendarDate}
            view={calendarView}
            onViewChange={setCalendarView}
            onDateSelect={setCalendarDate}
            onPrevious={() => {
              setCalendarDate((current) => {
                const next = new Date(current);
                if (calendarView === 'day') {
                  next.setDate(next.getDate() - 1);
                } else if (calendarView === 'week') {
                  next.setDate(next.getDate() - 7);
                } else {
                  next.setMonth(next.getMonth() - 1);
                }
                return next;
              });
            }}
            onNext={() => {
              setCalendarDate((current) => {
                const next = new Date(current);
                if (calendarView === 'day') {
                  next.setDate(next.getDate() + 1);
                } else if (calendarView === 'week') {
                  next.setDate(next.getDate() + 7);
                } else {
                  next.setMonth(next.getMonth() + 1);
                }
                return next;
              });
            }}
          />
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Appointment Records</CardTitle>
            <CardDescription>
              {total} appointment{total !== 1 ? 's' : ''} in the selected filter
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState label="Loading appointments" />
          ) : appointments.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-gray-500">No appointments found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`/dashboard/appointments/${apt.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700 hover:underline">
                          Appointment {apt.appointmentNumber || apt.id}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            apt.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : apt.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>

                      <p className="mt-2 font-medium text-slate-900">
                        <Link href={`/dashboard/patients/${apt.patientId}`} className="hover:text-blue-600">
                          {apt.patientName || 'Patient'}
                        </Link>
                      </p>

                      <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(apt.dateTime).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-4 w-4" />
                          {apt.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold capitalize text-blue-800">
                        {apt.type}
                      </span>
                      <div onClick={(event) => event.preventDefault()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open appointment actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="left" sideOffset={4}>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/appointments/${apt.id}`}>View</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/appointments/${apt.id}/edit?mode=reschedule`}>
                                <CalendarClock className="h-4 w-4" />
                                Reschedule
                              </Link>
                            </DropdownMenuItem>
                            {apt.status === 'scheduled' && (
                              <>
                                <DropdownMenuItem onSelect={() => handleStatusChange(apt.id, 'completed')}>
                                  <CheckCircle className="h-4 w-4" />
                                  Mark complete
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => handleStatusChange(apt.id, 'cancelled')}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
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
                onClick={(event) => {
                  event.preventDefault();
                  setPage((current) => Math.min(totalPages, current + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
