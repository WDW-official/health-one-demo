'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/loading-state';
import { Appointment, Patient, Consultation } from '@/lib/types';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { Edit2, FileText, CheckCircle, XCircle, Bell, MessageCircle, ChevronLeft, CalendarClock, UserCheck } from 'lucide-react';

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [canView, setCanView] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/appointments');
    }
  };

  useEffect(() => {
    const loadAppointment = async () => {
      try {
        setIsLoading(true);
        setError('');
        setCanView(true);

        const currentUser = getCurrentUser();
        const response = await ApiClient.getAppointment(appointmentId);
        const aptData = response?.data || response?.appointment || null;

        if (!aptData) {
          setError('Appointment not found');
          return;
        }

        if (
          currentUser?.role === 'doctor' &&
          currentUser.doctorId &&
          aptData.doctorId !== currentUser.doctorId
        ) {
          setCanView(false);
          return;
        }

        const [patientRes, consultationRes] = await Promise.all([
          ApiClient.getPatient(aptData.patientId),
          ApiClient.getConsultationByAppointment(appointmentId).catch(() => null),
        ]);

        setAppointment(aptData);
        setPatient(patientRes?.data || patientRes?.patient || null);
        setConsultation(consultationRes?.consultation || consultationRes?.data || null);
        const remindersRes = await ApiClient.getReminders({ appointmentId }).catch(() => null);
        setReminders(remindersRes?.data || remindersRes?.reminders || []);
      } catch (err) {
        console.error('Failed to load appointment detail:', err);
        setError('Unable to load appointment');
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointment();
  }, [appointmentId]);

  const handleStatusChange = async (status: Appointment['status']) => {
    if (appointment) {
      await ApiClient.updateAppointment(appointment.id, { status });
      setAppointment({ ...appointment, status });
    }
  };

  const handleCheckIn = async () => {
    if (!appointment) return;

    try {
      setIsCheckingIn(true);
      await ApiClient.createCheckIn({
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentId: appointment.id,
      });
      alert('Patient checked in successfully');
    } catch (err) {
      console.error('Failed to check in patient:', err);
      alert(err instanceof Error ? err.message : 'Failed to check in patient');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!appointment || !patient) return;

    try {
      setIsCreatingReminder(true);
      await ApiClient.createReminder({
        patientId: patient.id,
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        category: 'appointment',
        channel: 'whatsapp',
        reminderType: 'day_before',
      });

      const remindersRes = await ApiClient.getReminders({ appointmentId });
      setReminders(remindersRes?.data || remindersRes?.reminders || []);
    } catch (err) {
      console.error('Failed to create reminder:', err);
      alert('Failed to create reminder');
    } finally {
      setIsCreatingReminder(false);
    }
  };

  const handleSendReminder = async (reminderId: string) => {
    try {
      setSendingReminderId(reminderId);
      const result = await ApiClient.sendReminder(reminderId);
      if (result?.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      const remindersRes = await ApiClient.getReminders({ appointmentId });
      setReminders(remindersRes?.data || remindersRes?.reminders || []);
    } catch (err) {
      console.error('Failed to send reminder:', err);
      alert('Failed to send reminder');
    } finally {
      setSendingReminderId(null);
    }
  };

  if (isLoading) {
    return (
      <LoadingState label="Loading appointment" className="rounded-2xl border border-slate-200 bg-white p-6" />
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="text-lg font-semibold">Access restricted</p>
        <p className="mt-2 text-sm">
          You can only open appointments assigned to your doctor account.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <p className="text-lg font-semibold">Unable to open appointment</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!appointment || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Appointment not found</p>
      </div>
    );
  }

  const duration = appointment.duration;
  const endTime = new Date(appointment.dateTime.getTime() + duration * 60000);
  const appointmentLabel = appointment.appointmentNumber || appointment.id;
  const isAppointmentToday = appointment.dateTime.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-0 h-auto hover:bg-transparent mt-1"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </Button>
          <div>
            <h1 className="md:text-3xl text-2xl font-bold text-gray-900">
              {appointmentLabel}
            </h1>
          </div>
        </div>
            <p className="text-gray-600 mt-1">
              {appointment.dateTime.toLocaleDateString()} at{' '}
              {appointment.dateTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          {getCurrentUser()?.role === 'admin' && (
            <>
              <Link href={`/dashboard/appointments/${appointment.id}/edit?mode=reschedule`}>
                <Button variant="outline">
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Reschedule
                </Button>
              </Link>
              <Link href={`/dashboard/appointments/${appointment.id}/edit`}>
                <Button variant="outline">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </>
          )}
          {appointment.status === 'scheduled' && (
            <>
              {isAppointmentToday && (
                <Button
                  onClick={handleCheckIn}
                  variant="outline"
                  disabled={isCheckingIn}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {isCheckingIn ? 'Checking in...' : 'Check in'}
                </Button>
              )}
              <Button
                onClick={() => handleStatusChange('completed')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
              <Button
                onClick={() => handleStatusChange('cancelled')}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Patient MRN</p>
            <Link href={`/dashboard/patients/${patient.id}`}>
              <p className="text-lg font-semibold text-blue-600 hover:underline mt-1">
                {patient.mrn || patient.id}
              </p>
            </Link>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {patient.firstName} {patient.lastName}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Procedure Type</p>
            <p className="text-lg font-semibold mt-1">{appointment.type}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-lg font-semibold mt-1">{duration} minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Status</p>
            <span
              className={`inline-block mt-2 px-3 py-1 text-sm font-semibold rounded capitalize ${
                appointment.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : appointment.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : appointment.status === 'noshow'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {appointment.status}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Details and Consultation */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="consultation">
            Consultation {consultation ? '✓' : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="font-medium">
                    {appointment.dateTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Time</p>
                  <p className="font-medium">
                    {appointment.dateTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {endTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Patient</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                    MRN {patient.mrn || patient.id}
                  </p>
                  <p className="font-medium">
                    {patient.firstName} {patient.lastName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Patient Contact</p>
                  <p className="font-medium">{patient.email}</p>
                  <p className="text-sm text-gray-600">{patient.phone}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="font-medium whitespace-pre-line">
                    {appointment.notes || 'No notes'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Card className="border-slate-200 bg-slate-50/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Bell className="h-4 w-4 text-teal-700" />
                        Appointment Reminders
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={handleCreateReminder} disabled={isCreatingReminder} size="sm">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {isCreatingReminder ? 'Creating...' : 'Create WhatsApp reminder'}
                      </Button>
                      {reminders.length === 0 ? (
                        <p className="text-sm text-gray-500">No reminders created for this appointment yet.</p>
                      ) : (
                          <div className="space-y-3">
                          {reminders.map((reminder) => (
                            <div key={reminder.id} className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">{reminder.subject || 'Reminder'}</p>
                                  <p className="mt-1 text-xs text-slate-600">{reminder.message}</p>
                                  {reminder.scheduledFor && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      Scheduled for {new Date(reminder.scheduledFor).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800 capitalize">
                                    {reminder.channel || 'email'} · {reminder.status}
                                  </span>
                                  {reminder.status !== 'sent' && reminder.channel === 'whatsapp' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSendReminder(reminder.id)}
                                      disabled={sendingReminderId === reminder.id}
                                    >
                                      {sendingReminderId === reminder.id ? 'Opening...' : 'Send WhatsApp'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultation">
          {consultation ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Consultation Record</CardTitle>
                <Link href={`/dashboard/consultations/${consultation.id}`}>
                  <Button size="sm" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    View Full Record
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Diagnosis</p>
                  <p className="font-medium">{consultation.diagnosis}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Treatment</p>
                  <p className="font-medium">{consultation.treatment}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Prescription</p>
                  <p className="font-medium">{consultation.prescription}</p>
                </div>

                {consultation.nextVisitDate && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Next Visit</p>
                    <p className="font-medium">
                      {consultation.nextVisitDate.toLocaleDateString()}
                    </p>
                  </div>
                )}

                {consultation.notes && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Notes</p>
                    <p className="font-medium">{consultation.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center py-8">
                  No consultation record yet. Create one after the appointment.
                </p>
                <div className="text-center">
                  <Link href={`/dashboard/consultations/new?appointmentId=${appointment.id}`}>
                    <Button>
                      <FileText className="w-4 h-4 mr-2" />
                      Add Consultation Record
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
