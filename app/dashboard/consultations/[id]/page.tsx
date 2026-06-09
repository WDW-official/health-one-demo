'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit2, ChevronLeft } from 'lucide-react';

import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Appointment, Consultation, Patient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/loading-state';

const chartCellClass = 'min-h-24 whitespace-pre-line p-3 text-sm leading-6 text-slate-700';

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [canView, setCanView] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/consultations');
    }
  };

  useEffect(() => {
    const loadConsultation = async () => {
      try {
        setIsLoading(true);
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

        const [patientRes, appointmentRes] = await Promise.all([
          ApiClient.getPatient(consultData.patientId),
          consultData.appointmentId
            ? ApiClient.getAppointment(consultData.appointmentId)
            : Promise.resolve(null),
        ]);

        setConsultation(consultData);
        setPatient(patientRes?.data || patientRes?.patient || null);
        setAppointment(appointmentRes?.data || appointmentRes?.appointment || null);
      } catch (err) {
        console.error('Failed to load consultation detail:', err);
        setError('Unable to load consultation');
      } finally {
        setIsLoading(false);
      }
    };

    loadConsultation();
  }, [consultationId]);

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
            <h1 className="text-3xl font-bold text-gray-900">Consultation Record</h1>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    {block.upperLeft || 'Upper left'}
                  </div>
                  <div className={`${chartCellClass} border-b-2 border-l-2 border-black`}>
                    {block.upperRight || 'Upper right'}
                  </div>
                  <div className={chartCellClass}>
                    {block.lowerLeft || 'Lower left'}
                  </div>
                  <div className={`${chartCellClass} border-l-2 border-black`}>
                    {block.lowerRight || 'Lower right'}
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
