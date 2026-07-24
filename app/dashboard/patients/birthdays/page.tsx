'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  MessageCircle,
  Search,
  UserRound,
} from 'lucide-react';

import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { getErrorMessage } from '@/lib/error-message';
import { withHospitalDashboardPath } from '@/lib/tenant-routing';
import type { Patient, Reminder, User } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type BirthdayPatient = Patient & {
  birthdayDate: Date;
  turningAge: number;
};

type BirthdayWishForm = {
  subject: string;
  message: string;
};

function getMonthGrid(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const offset = firstDay.getDay();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - offset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return new Date(date.getFullYear(), date.getMonth(), dayNumber);
  });
}

function getBirthMonthDay(dateOfBirth: string) {
  const isoMatch = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      birthYear: Number(isoMatch[1]),
      month: Number(isoMatch[2]) - 1,
      day: Number(isoMatch[3]),
    };
  }

  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    birthYear: parsed.getFullYear(),
    month: parsed.getMonth(),
    day: parsed.getDate(),
  };
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDefaultBirthdayWish(patient: BirthdayPatient): BirthdayWishForm {
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();

  return {
    subject: `Happy Birthday, ${patientName}!`,
    message: `Happy Birthday, ${patientName}! Wishing you a healthy, joyful year ahead. From all of us at Health One Dental Clinic, we hope your day is filled with smiles.`,
  };
}

async function getAllVisiblePatients(user: User | null) {
  const patients: Patient[] = [];
  let skip = 0;
  const limit = 100;
  let total = 0;

  do {
    const response = await ApiClient.getAllPatients({
      doctorId: user?.role === 'doctor' ? user.doctorId : undefined,
      limit,
      skip,
    });
    const batch = response?.data || [];
    patients.push(...batch);
    total = response?.total || patients.length;
    skip += limit;
  } while (patients.length < total);

  return patients;
}

export default function BirthdayCalendarPage() {
  const [user] = useState<User | null>(() => getCurrentUser());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBirthdayPatient, setSelectedBirthdayPatient] = useState<BirthdayPatient | null>(null);
  const [birthdayWishForm, setBirthdayWishForm] = useState<BirthdayWishForm>({
    subject: '',
    message: '',
  });
  const [savedReminder, setSavedReminder] = useState<Reminder | null>(null);
  const [isSavingWish, setIsSavingWish] = useState(false);
  const [sendingPatientId, setSendingPatientId] = useState<string | null>(null);

  const activeHospital = ApiClient.getActiveHospital();
  const routeUser = user
    ? { ...user, hospitalSlug: activeHospital?.slug || user.hospitalSlug || null }
    : user;

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setIsLoading(true);
        const visiblePatients = await getAllVisiblePatients(user);
        setPatients(visiblePatients);
      } catch (error) {
        console.error('Failed to load birthday calendar:', error);
        toast({
          title: 'Could not load birthdays',
          description: getErrorMessage(error, 'Failed to load patient birthdays.'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadPatients();
  }, [user]);

  const birthdays = useMemo<BirthdayPatient[]>(() => {
    const year = currentDate.getFullYear();
    const query = searchTerm.trim().toLowerCase();

    return patients
      .map((patient) => {
        const birthParts = getBirthMonthDay(patient.dateOfBirth);
        if (!birthParts) return null;

        return {
          ...patient,
          birthdayDate: new Date(year, birthParts.month, birthParts.day),
          turningAge: year - birthParts.birthYear,
        };
      })
      .filter((patient): patient is BirthdayPatient => Boolean(patient))
      .filter((patient) => {
        if (!query) return true;
        const text = `${patient.mrn || ''} ${patient.firstName} ${patient.lastName} ${patient.phone || ''}`.toLowerCase();
        return text.includes(query);
      })
      .sort((a, b) => a.birthdayDate.getTime() - b.birthdayDate.getTime());
  }, [currentDate, patients, searchTerm]);

  const monthBirthdays = birthdays.filter(
    (patient) =>
      patient.birthdayDate.getFullYear() === currentDate.getFullYear() &&
      patient.birthdayDate.getMonth() === currentDate.getMonth()
  );
  const selectedBirthdays = birthdays.filter((patient) => isSameDay(patient.birthdayDate, selectedDate));
  const monthCells = getMonthGrid(currentDate);
  const monthLabel = currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const openBirthdayWish = (patient: BirthdayPatient) => {
    setSelectedBirthdayPatient(patient);
    setBirthdayWishForm(getDefaultBirthdayWish(patient));
    setSavedReminder(null);
  };

  const saveBirthdayWish = async () => {
    if (!selectedBirthdayPatient) return null;

    if (!birthdayWishForm.message.trim()) {
      toast({
        title: 'Message is required',
        description: 'Add a birthday wish before saving the reminder.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setIsSavingWish(true);
      const created = await ApiClient.createReminder({
        patientId: selectedBirthdayPatient.id,
        doctorId: selectedBirthdayPatient.assignedDoctorId,
        category: 'birthday',
        channel: 'whatsapp',
        reminderType: 'birthday',
        scheduledFor: selectedBirthdayPatient.birthdayDate,
        subject: birthdayWishForm.subject,
        message: birthdayWishForm.message,
      });
      const reminder = created?.reminder || created?.data;

      if (!reminder?.id) {
        throw new Error('Birthday reminder was created without an ID.');
      }

      setSavedReminder(reminder);
      toast({
        title: 'Birthday wish saved',
        description: 'The WhatsApp birthday reminder was saved as a draft.',
      });

      return reminder;
    } catch (error) {
      toast({
        title: 'Could not save birthday wish',
        description: getErrorMessage(error, 'Failed to save WhatsApp birthday reminder.'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSavingWish(false);
    }
  };

  const sendBirthdayWish = async () => {
    if (!selectedBirthdayPatient) return;

    const whatsappWindow = window.open('', '_blank', 'noopener,noreferrer');

    try {
      setSendingPatientId(selectedBirthdayPatient.id);
      const reminder = savedReminder || (await saveBirthdayWish());

      if (!reminder?.id) {
        whatsappWindow?.close();
        return;
      }

      const sent = await ApiClient.sendReminder(reminder.id);
      if (sent?.whatsappUrl) {
        if (whatsappWindow) {
          whatsappWindow.location.href = sent.whatsappUrl;
        } else {
          window.open(sent.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        whatsappWindow?.close();
      }

      toast({
        title: 'Birthday wish ready',
        description: `WhatsApp message prepared for ${selectedBirthdayPatient.firstName} ${selectedBirthdayPatient.lastName}.`,
      });
      setSelectedBirthdayPatient(null);
      setSavedReminder(null);
    } catch (error) {
      whatsappWindow?.close();
      toast({
        title: 'Could not send birthday wish',
        description: getErrorMessage(error, 'Failed to send WhatsApp birthday wish.'),
        variant: 'destructive',
      });
    } finally {
      setSendingPatientId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Birthday Calendar</h1>
          <p className="mt-1 text-gray-600">
            View patient birthdays by month and prepare WhatsApp birthday reminders.
          </p>
        </div>
        <Link href={withHospitalDashboardPath('/dashboard/patients', routeUser)}>
          <Button variant="outline">
            <UserRound className="mr-2 h-4 w-4" />
            Back to Patients
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by MRN, name, or phone..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent>
            <LoadingState label="Loading birthday calendar" className="py-10" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="overflow-hidden border-slate-200/80 bg-white">
            <CardHeader className="border-b border-slate-200/70 bg-[linear-gradient(135deg,rgba(20,184,166,0.08),rgba(245,158,11,0.08))] px-4 py-4 md:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-950/20">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-950 md:text-2xl">
                      {monthLabel}
                    </CardTitle>
                    <CardDescription>
                      {monthBirthdays.length} birthday{monthBirthdays.length !== 1 ? 's' : ''} this month
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl border-slate-200 bg-white"
                    onClick={() => {
                      setCurrentDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                      setSelectedDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const today = new Date();
                      setCurrentDate(today);
                      setSelectedDate(today);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl border-slate-200 bg-white"
                    onClick={() => {
                      setCurrentDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                      setSelectedDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-3 md:p-4">
              <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {DAY_LABELS.map((day) => (
                  <div key={day} className="py-1.5">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthCells.map((cell, index) => {
                  const cellBirthdays = cell ? birthdays.filter((patient) => isSameDay(patient.birthdayDate, cell)) : [];
                  const isSelected = cell ? isSameDay(cell, selectedDate) : false;

                  return (
                    <button
                      key={`${cell?.toISOString() ?? 'empty'}-${index}`}
                      type="button"
                      disabled={!cell}
                      onClick={() => cell && setSelectedDate(cell)}
                      className={`min-h-28 rounded-xl border p-1.5 text-left transition-colors md:min-h-32 md:p-2 ${
                        !cell
                          ? 'cursor-default border-slate-100 bg-slate-50/50 opacity-40'
                          : isSelected
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-slate-200 bg-slate-50/80 hover:border-teal-200 hover:bg-white'
                      }`}
                    >
                      {cell && (
                        <>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800 md:text-sm">{cell.getDate()}</span>
                            {cellBirthdays.length > 0 && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                {cellBirthdays.length}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {cellBirthdays.slice(0, 3).map((patient) => (
                              <div
                                key={patient.id}
                                className="rounded-lg bg-teal-700 px-2 py-1 text-[10px] font-medium text-white shadow-sm md:text-[11px]"
                              >
                                <p className="truncate leading-tight">
                                  {patient.firstName} {patient.lastName}
                                </p>
                                <p className="opacity-90">Turns {patient.turningAge}</p>
                              </div>
                            ))}
                            {cellBirthdays.length > 3 && (
                              <p className="px-1 text-[10px] font-medium text-slate-500 md:text-[11px]">
                                +{cellBirthdays.length - 3} more
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-600" />
                {selectedDate.toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                })}
              </CardTitle>
              <CardDescription>
                {selectedBirthdays.length} birthday{selectedBirthdays.length !== 1 ? 's' : ''} selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedBirthdays.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-8 text-center">
                  <p className="text-sm text-slate-500">No patient birthdays on this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedBirthdays.map((patient) => (
                    <div key={patient.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={withHospitalDashboardPath(`/dashboard/patients/${patient.id}`, routeUser)}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {patient.firstName} {patient.lastName}
                          </Link>
                          <p className="mt-1 text-sm text-slate-600">MRN {patient.mrn || patient.id}</p>
                          <p className="text-sm text-slate-600">Turns {patient.turningAge}</p>
                          <p className="text-sm text-slate-600">{patient.phone || 'No phone number'}</p>
                          {patient.assignedDoctorName && (
                            <p className="mt-1 text-xs text-slate-500">Dr. {patient.assignedDoctorName}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        className="mt-4 w-full"
                        onClick={() => openBirthdayWish(patient)}
                        disabled={sendingPatientId === patient.id}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {sendingPatientId === patient.id ? 'Preparing WhatsApp...' : 'Create Birthday Wish'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={Boolean(selectedBirthdayPatient)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBirthdayPatient(null);
            setSavedReminder(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Birthday Wish</DialogTitle>
            <DialogDescription>
              Edit the WhatsApp birthday message, save it as a reminder, then send it.
            </DialogDescription>
          </DialogHeader>

          {selectedBirthdayPatient && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">
                  {selectedBirthdayPatient.firstName} {selectedBirthdayPatient.lastName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  MRN {selectedBirthdayPatient.mrn || selectedBirthdayPatient.id} · Turns{' '}
                  {selectedBirthdayPatient.turningAge} · {selectedBirthdayPatient.phone || 'No phone number'}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Subject</label>
                <Input
                  value={birthdayWishForm.subject}
                  onChange={(event) =>
                    setBirthdayWishForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  disabled={Boolean(savedReminder) || isSavingWish || Boolean(sendingPatientId)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">WhatsApp Message</label>
                <textarea
                  value={birthdayWishForm.message}
                  onChange={(event) =>
                    setBirthdayWishForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  rows={6}
                  disabled={Boolean(savedReminder) || isSavingWish || Boolean(sendingPatientId)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {savedReminder && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Birthday wish saved as a draft reminder. You can now send it on WhatsApp.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedBirthdayPatient(null);
                setSavedReminder(null);
              }}
              disabled={isSavingWish || Boolean(sendingPatientId)}
            >
              Cancel
            </Button>
            {!savedReminder && (
              <Button type="button" variant="outline" onClick={saveBirthdayWish} disabled={isSavingWish}>
                {isSavingWish ? 'Saving...' : 'Save Draft'}
              </Button>
            )}
            <Button type="button" onClick={sendBirthdayWish} disabled={isSavingWish || Boolean(sendingPatientId)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {sendingPatientId ? 'Opening WhatsApp...' : savedReminder ? 'Send WhatsApp' : 'Save & Send WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
