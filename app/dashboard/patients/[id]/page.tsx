'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Edit2, FileText, History, AlertCircle, Paperclip, Bell, Gift, MessageCircle, ExternalLink } from 'lucide-react';

import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const URL_VALUE_PATTERN = /^https?:\/\/[^\s]+$/;

function isGoogleDocsUrl(url: string) {
  return /^https:\/\/docs\.google\.com\/document\/d\//i.test(url);
}

function getGoogleDocsPreviewUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.replace(/\/edit$/, '')}/preview`;
  } catch {
    return url;
  }
}

function LinkifiedText({
  text,
  onPreview,
}: {
  text: string;
  onPreview: (url: string) => void;
}) {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) => {
        if (!URL_VALUE_PATTERN.test(part)) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        if (isGoogleDocsUrl(part)) {
          return (
            <button
              key={`${part}-${index}`}
              type="button"
              onClick={() => onPreview(part)}
              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
            >
              Google document
              <ExternalLink className="h-3 w-3" />
            </button>
          );
        }

        return (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
          >
            {part}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      })}
    </>
  );
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [isCreatingBirthdayWish, setIsCreatingBirthdayWish] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [canView, setCanView] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');
  const touchStartX = useRef<number | null>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/patients');
    }
  };

  useEffect(() => {
    const loadPatient = async () => {
      try {
        setIsLoading(true);
        setError('');
        setCanView(true);

        const patientRes = await ApiClient.getPatient(patientId);
        const patientData = patientRes?.data || patientRes?.patient || null;

        if (!patientData) {
          setError('Patient not found');
          return;
        }

        const [appointmentsRes, consultationsRes] = await Promise.all([
          ApiClient.getAppointmentsByPatient(patientId),
          ApiClient.getConsultationsByPatient(patientId),
        ]);

        setPatient(patientData);
        setAppointments(appointmentsRes?.data || []);
        setConsultations(consultationsRes?.data || []);
        const remindersRes = await ApiClient.getReminders({ patientId }).catch(() => null);
        setReminders(remindersRes?.data || remindersRes?.reminders || []);
      } catch (err) {
        console.error('Failed to load patient detail:', err);
        setError('Unable to load patient records');
      } finally {
        setIsLoading(false);
      }
    };

    loadPatient();
  }, [patientId]);

  const handleCreateBirthdayWish = async () => {
    if (!patient) return;

    try {
      setIsCreatingBirthdayWish(true);
      await ApiClient.createReminder({
        patientId: patient.id,
        doctorId: patient.assignedDoctorId,
        category: 'birthday',
        channel: 'whatsapp',
        reminderType: 'birthday',
      });

      const remindersRes = await ApiClient.getReminders({ patientId });
      setReminders(remindersRes?.data || remindersRes?.reminders || []);
    } catch (err) {
      console.error('Failed to create birthday wish:', err);
      alert('Failed to create birthday wish');
    } finally {
      setIsCreatingBirthdayWish(false);
    }
  };

  const handleSendReminder = async (reminderId: string) => {
    try {
      setSendingReminderId(reminderId);
      const result = await ApiClient.sendReminder(reminderId);
      if (result?.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      const remindersRes = await ApiClient.getReminders({ patientId });
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
      <LoadingState label="Loading patient records" className="rounded-2xl border border-slate-200 bg-white p-6" />
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="text-lg font-semibold">Access restricted</p>
        <p className="mt-2 text-sm">You can only open patients assigned to your doctor account.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <p className="text-lg font-semibold">Unable to open patient</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  const timelineItems = [
    ...appointments.map((appointment) => ({
      id: `apt-${appointment.id}`,
      type: 'appointment',
      title: appointment.type,
      subtitle: appointment.notes || 'Appointment record',
      date: new Date(appointment.dateTime),
      href: `/dashboard/appointments/${appointment.id}`,
      badge: appointment.status,
    })),
    ...consultations.map((consultation) => ({
      id: `con-${consultation.id}`,
      type: 'consultation',
      title: consultation.diagnosis,
      subtitle: consultation.treatment,
      date: new Date(consultation.createdAt),
      href: `/dashboard/consultations/${consultation.id}`,
      badge: 'recorded',
      attachments: Array.isArray(consultation.attachments) ? consultation.attachments : [],
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const consultationAttachments = consultations.flatMap((consultation) =>
    (Array.isArray(consultation.attachments) ? consultation.attachments : []).map(
      (attachment: any, index: number) => ({
        ...attachment,
        consultationId: consultation.id,
        consultationDate: new Date(consultation.createdAt),
        consultationDiagnosis: consultation.diagnosis,
        key: `${consultation.id}-${attachment.publicId || attachment.url || index}`,
      })
    )
  );

  const nextSteps = [
    {
      label: 'Payment Info',
      href: consultations[0]?.id
        ? `/dashboard/consultations/${consultations[0].id}/edit`
        : `/dashboard/consultations/new?patientId=${patient.id}`,
      icon: '💳',
    },
    {
      label: `Schedule Appointment for ${patient.mrn || patient.id}`,
      href: `/dashboard/appointments/new?patientId=${patient.id}`,
      icon: '📅',
    },
    {
      label: `Add Consultation for ${patient.mrn || patient.id}`,
      href: `/dashboard/consultations/new?patientId=${patient.id}`,
      icon: '💬',
    },
  ];

  if (getCurrentUser()?.role === 'admin') {
    nextSteps.push({
      label: 'Edit Patient File',
      href: `/dashboard/patients/${patient.id}/edit`,
      icon: '✏️',
    });
  }

  const tabOrder = ['timeline', 'overview', 'appointments', 'consultations', 'reminders', 'medical'] as const;

  const handleTabSwipe = (direction: 'left' | 'right') => {
    const currentIndex = tabOrder.indexOf(activeTab as (typeof tabOrder)[number]);

    if (direction === 'left' && currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;

    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(delta) > 50) {
      handleTabSwipe(delta < 0 ? 'left' : 'right');
    }

    touchStartX.current = null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-0 h-auto hover:bg-transparent mt-1"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-600 mt-1">
              MRN: <span className="font-semibold text-gray-900">{patient.mrn || patient.id}</span>
            </p>
          </div>
        </div>
        {getCurrentUser()?.role === 'admin' && (
          <Link href={`/dashboard/patients/${patient.id}/edit`}>
            <Button>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Patient
            </Button>
          </Link>
        )}
      </div>

      <Card className="border-accent/20 bg-linear-to-r from-accent/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {nextSteps.map((step, idx) => (
              <Link key={idx} href={step.href}>
                <Button variant="outline" className="w-full justify-start hover:bg-accent/10">
                  <span className="text-lg mr-2">{step.icon}</span>
                  {step.label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="md:pt-6">
            <p className="text-sm text-gray-600">MRN</p>
            <p className="text-2xl font-bold mt-1">{patient.mrn || patient.id}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="md:pt-6">
            <p className="text-sm text-gray-600">Age</p>
            <p className="text-2xl font-bold mt-1">{age}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="md:pt-6">
            <p className="text-sm text-gray-600">Gender</p>
            <p className="text-2xl font-bold mt-1 capitalize">{patient.gender}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="md:pt-6">
            <p className="text-sm text-gray-600">Family Status</p>
            <p className="text-2xl font-bold mt-1 capitalize">{patient.familyStatus || 'individual'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="md:pt-6">
            <p className="text-sm text-gray-600">Assigned Doctor</p>
            <p className="text-lg font-bold mt-1">{patient.assignedDoctorName || 'Not Assigned'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="md:pt-6">
            <p className="text-sm text-gray-600">Date Registered</p>
            <p className="text-lg font-bold mt-1">
              {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'Not recorded'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="md:pt-6">
            <p className="text-sm text-gray-600">Appointments</p>
            <p className="text-2xl font-bold mt-1">{appointments.length}</p>
          </CardContent>
        </Card>
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full overflow-x-auto pb-1 md:w-fit">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="consultations">Consultations</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="medical">Medical Info</TabsTrigger>
          </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-teal-700" />
                Patient Timeline
              </CardTitle>
              <CardDescription>Appointments and consultation records in chronological order</CardDescription>
            </CardHeader>
            <CardContent>
            {timelineItems.length === 0 ? (
                <p className="text-gray-500">No timeline records yet</p>
              ) : (
                <div className="space-y-3">
                  {timelineItems.map((item) => (
                    <Link key={item.id} href={item.href} className="block">
                      <div className="rounded-lg border p-4 hover:bg-gray-50">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold capitalize">{item.type}</p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
                                {item.badge}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">{item.title}</p>
                            <p className="text-xs text-gray-500">{item.subtitle}</p>
                            {(item as any).attachments?.length > 0 && (
                              <p className="mt-1 text-xs font-medium text-teal-700">
                                {(item as any).attachments.length} attachment{(item as any).attachments.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.date.toLocaleDateString()} at{' '}
                            {item.date.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{patient.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{patient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">
                    {patient.address}, {patient.city}, {patient.state} {patient.zipCode}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insurance Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Provider</p>
                  <p className="font-medium">{patient.insuranceProvider || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Policy Number</p>
                  <p className="font-medium">{patient.insurancePolicyNumber || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{patient.emergencyContactName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{patient.emergencyContactPhone || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>Patient&apos;s scheduled appointments</CardDescription>
              </div>
              <Link href={`/dashboard/appointments/new?patientId=${patient.id}`}>
                <Button size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-gray-500">No appointments scheduled</p>
              ) : (
                <div className="space-y-2">
                  {appointments.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/dashboard/appointments/${apt.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                          Appointment {apt.appointmentNumber || apt.id}
                        </p>
                        <p className="font-medium text-sm capitalize">{apt.type}</p>
                        <p className="text-xs text-gray-500">{new Date(apt.dateTime).toLocaleString()}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                          apt.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : apt.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultation Records</CardTitle>
              <CardDescription>Patient&apos;s consultation history</CardDescription>
            </CardHeader>
            <CardContent>
              {consultations.length === 0 ? (
                <p className="text-gray-500">No consultations recorded</p>
              ) : (
                <div className="space-y-4">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="space-y-2 rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">Diagnosis: {consultation.diagnosis}</p>
                          <p className="mt-1 text-sm text-gray-600">{new Date(consultation.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Treatment:</span> {consultation.treatment}
                        </p>
                        <p>
                          <span className="font-medium">Prescription:</span>{' '}
                          {consultation.prescription}
                        </p>
                        {consultation.notes && (
                          <p>
                            <span className="font-medium">Notes:</span> {consultation.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-teal-700" />
                Consultation Attachments
              </CardTitle>
              <CardDescription>All record files uploaded for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              {consultationAttachments.length === 0 ? (
                <p className="text-gray-500">No attachments uploaded yet</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {consultationAttachments.map((attachment) => (
                    <a
                      key={attachment.key}
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
                        {attachment.consultationDate.toLocaleDateString()} •{' '}
                        {attachment.consultationDiagnosis}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader className="md:flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-teal-700" />
                  Patient Reminders
                </CardTitle>
                <CardDescription>WhatsApp reminders and birthday wishes for this patient</CardDescription>
              </div>
              <Button onClick={handleCreateBirthdayWish} disabled={isCreatingBirthdayWish}>
                <Gift className="mr-2 h-4 w-4" />
                {isCreatingBirthdayWish ? 'Creating...' : 'Create birthday wish'}
              </Button>
            </CardHeader>
            <CardContent>
              {reminders.length === 0 ? (
                <p className="text-gray-500">No reminders created yet</p>
              ) : (
                <div className="space-y-3">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold capitalize">
                            {reminder.category} reminder
                          </p>
                          <p className="mt-1 text-sm text-gray-700">{reminder.subject || 'No subject'}</p>
                          <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                            {reminder.message}
                          </p>
                          {reminder.scheduledFor && (
                            <p className="mt-2 text-xs text-gray-500">
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
                              <MessageCircle className="mr-2 h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Allergies</h3>
                {patient.allergies ? (
                  <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-gray-700">
                    <AlertCircle className="mr-2 inline h-4 w-4 text-red-600" />
                    {patient.allergies}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">No known allergies</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Medical History</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {patient.medicalHistory ? (
                    <LinkifiedText text={patient.medicalHistory} onPreview={setDocumentPreviewUrl} />
                  ) : (
                    'No medical history recorded'
                  )}
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Current Medications</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {patient.currentMedications || 'No current medications'}
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {patient.notes || 'No notes recorded'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(documentPreviewUrl)} onOpenChange={(open) => !open && setDocumentPreviewUrl('')}>
        <DialogContent className="max-h-[90vh] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Patient document</DialogTitle>
          </DialogHeader>
          {documentPreviewUrl && (
            <iframe
              src={getGoogleDocsPreviewUrl(documentPreviewUrl)}
              title="Patient document preview"
              className="h-[70vh] w-full rounded-md border"
            />
          )}
          <a
            href={documentPreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
          >
            Open in Google Docs
            <ExternalLink className="h-4 w-4" />
          </a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
