'use client';

import { Appointment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import Link from 'next/link';

type CalendarView = 'day' | 'week' | 'month';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onDateSelect: (date: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayStart(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getWeekStart(date: Date) {
  const start = getDayStart(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const offset = firstDay.getDay();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - offset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return new Date(date.getFullYear(), date.getMonth(), dayNumber);
  });

  return cells;
}

export function AppointmentCalendar({
  appointments,
  currentDate,
  view,
  onViewChange,
  onDateSelect,
  onPrevious,
  onNext,
}: AppointmentCalendarProps) {
  const monthLabel = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const monthCells = getMonthGrid(currentDate);
  const dayAppointments = appointments.filter((apt) =>
    isSameDay(new Date(apt.dateTime), getDayStart(currentDate))
  );

  const appointmentsForDay = (date: Date) =>
    appointments.filter((apt) => isSameDay(new Date(apt.dateTime), date));

  const appointmentsForWeekSlot = (date: Date, hour: number) =>
    appointments.filter((apt) => {
      const aptDate = new Date(apt.dateTime);
      return isSameDay(aptDate, date) && aptDate.getHours() === hour;
    });

  const monthRangeAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.dateTime);
    return (
      aptDate.getMonth() === currentDate.getMonth() &&
      aptDate.getFullYear() === currentDate.getFullYear()
    );
  });

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
      <CardHeader className="border-b border-slate-200/70 bg-[linear-gradient(135deg,rgba(7,89,133,0.05),rgba(20,184,166,0.08))] px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f5ea8] text-white shadow-lg shadow-blue-950/20">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-slate-950 md:text-2xl">{monthLabel}</CardTitle>
              <CardDescription className="text-sm text-slate-600">
                A focused schedule view for appointments and patient visits
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200 bg-white" onClick={onPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200 bg-white" onClick={onNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Tabs value={view} onValueChange={(value) => onViewChange(value as CalendarView)}>
              <TabsList className="h-9 rounded-xl bg-slate-100 p-1">
                <TabsTrigger value="day" className="rounded-lg px-3 text-xs md:text-sm">
                  Day
                </TabsTrigger>
                <TabsTrigger value="week" className="rounded-lg px-3 text-xs md:text-sm">
                  Week
                </TabsTrigger>
                <TabsTrigger value="month" className="rounded-lg px-3 text-xs md:text-sm">
                  Month
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {view === 'month' && (
          <div className="p-3 md:p-4">
            <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {DAY_LABELS.map((day) => (
                <div key={day} className="py-1.5">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {monthCells.map((cell, index) => {
                const cellAppointments = cell ? appointmentsForDay(cell) : [];
                return (
                  <button
                    key={`${cell?.toISOString() ?? 'empty'}-${index}`}
                    type="button"
                    disabled={!cell}
                    onClick={() => {
                      if (cell) {
                        onDateSelect(cell);
                        onViewChange('day');
                      }
                    }}
                    className={cn(
                      'min-h-24 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1.5 text-left transition-colors md:min-h-28 md:p-2',
                      cell
                        ? 'hover:border-teal-200 hover:bg-white'
                        : 'cursor-default bg-slate-50/50 opacity-40'
                    )}
                  >
                    {cell && (
                      <>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800 md:text-sm">{cell.getDate()}</span>
                          {cellAppointments.length > 0 && (
                            <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                              {cellAppointments.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {cellAppointments.slice(0, 3).map((apt) => (
                            <Link
                              key={apt.id || (apt as any)._id}
                              href={`/dashboard/appointments/${apt.id || (apt as any)._id}`}
                              className="block"
                            >
                              <div
                                className={cn(
                                  'rounded-lg px-2 py-1 text-[10px] font-medium text-white shadow-sm md:text-[11px]',
                                  apt.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : apt.status === 'cancelled'
                                      ? 'bg-rose-500'
                                      : 'bg-[#1f5ea8]'
                                )}
                              >
                                <p className="truncate leading-tight">{apt.patientName || 'Patient'}</p>
                                <p className="opacity-90">{formatTime(new Date(apt.dateTime))}</p>
                              </div>
                            </Link>
                          ))}
                          {cellAppointments.length > 3 && (
                            <p className="px-1 text-[10px] font-medium text-slate-500 md:text-[11px]">
                              +{cellAppointments.length - 3} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/80">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Time
                </div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="border-l border-slate-200 px-2 py-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {DAY_LABELS[day.getDay()]}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{day.getDate()}</p>
                  </div>
                ))}
              </div>

              {WEEK_HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-slate-200">
                  <div className="flex h-16 items-start justify-end px-3 py-2 text-[11px] font-semibold text-slate-600">
                    {new Date(0, 0, 0, hour).toLocaleTimeString([], { hour: 'numeric' })}
                  </div>
                  {weekDays.map((day) => {
                    const slotAppointments = appointmentsForWeekSlot(day, hour);
                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className="min-h-16 border-l border-slate-200 p-1.5"
                      >
                        <div className="space-y-1.5">
                          {slotAppointments.map((apt, index) => (
                            <Link
                              key={apt.id || (apt as any)._id}
                              href={`/dashboard/appointments/${apt.id || (apt as any)._id}`}
                              className="block"
                            >
                              <div
                                className={cn(
                                  'rounded-xl px-2 py-1.5 text-[11px] shadow-sm transition-transform hover:-translate-y-0.5 md:text-sm',
                                  apt.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : apt.status === 'cancelled'
                                      ? 'bg-rose-100 text-rose-900'
                                      : index % 2 === 0
                                        ? 'bg-[#dce9f8] text-slate-900'
                                        : 'bg-[#d9f1ea] text-slate-900'
                                )}
                              >
                                <p className="truncate font-semibold leading-tight">
                                  {apt.patientName || 'Patient'} - {apt.doctorName || 'Doctor'}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-[10px]">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(new Date(apt.dateTime))}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'day' && (
          <div className="p-3 md:p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-950 md:text-lg">{currentDate.toDateString()}</h3>
                <p className="text-sm text-slate-500">{dayAppointments.length} appointments</p>
              </div>
            </div>
            <div className="space-y-3">
              {dayAppointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-8 text-center">
                  <p className="text-sm text-slate-500">No appointments for this day</p>
                </div>
              ) : (
                dayAppointments
                  .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                  .map((apt) => (
                    <Link key={apt.id} href={`/dashboard/appointments/${apt.id}`} className="block">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition-shadow hover:shadow-md">
                        <div>
                          <p className="font-semibold text-slate-950">{apt.patientName || 'Patient'}</p>
                          <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(new Date(apt.dateTime))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium capitalize text-slate-700">{apt.type}</p>
                          <p className="text-xs text-slate-500">{apt.doctorName || 'Assigned doctor'}</p>
                        </div>
                      </div>
                    </Link>
                  ))
              )}
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 md:px-6">
          <h3 className="mb-3 text-base font-semibold text-slate-950 md:text-lg">Appointments in view</h3>
          <div className="space-y-3">
            {monthRangeAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments in the selected range.</p>
            ) : (
              monthRangeAppointments
                .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                .slice(0, 6)
                .map((apt) => (
                  <Link key={apt.id} href={`/dashboard/appointments/${apt.id}`} className="block">
                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{apt.patientName || 'Patient'}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {new Date(apt.dateTime).toLocaleDateString()} at {formatTime(new Date(apt.dateTime))}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                            apt.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                          )}
                        >
                          {apt.status}
                        </span>
                        <span className="text-sm text-slate-500">{apt.doctorName || 'Doctor'}</span>
                      </div>
                    </div>
                  </Link>
                ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
