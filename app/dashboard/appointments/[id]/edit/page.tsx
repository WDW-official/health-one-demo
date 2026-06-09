'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import AppointmentForm from '@/components/appointment-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function EditAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = params.id as string;
  const isRescheduling = searchParams.get('mode') === 'reschedule';
  const [appointment, setAppointment] = useState<any>(null);

  useEffect(() => {
    ApiClient.getAppointment(appointmentId)
      .then((res) => setAppointment(res?.data || res?.appointment || null))
      .catch((error) => {
        console.error('Failed to load appointment for editing:', error);
        setAppointment(null);
      });
  }, [appointmentId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/appointments');
    }
  };

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Appointment not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-0 h-auto hover:bg-transparent"
        >
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isRescheduling ? 'Reschedule Appointment' : 'Edit Appointment'}
        </h1>
      </div>
      <p className="text-gray-600">
        {isRescheduling ? 'Choose a new date and time for this appointment' : 'Update appointment details'}
      </p>
      <AppointmentForm
        appointment={appointment}
        isEditing={true}
        mode={isRescheduling ? 'reschedule' : 'edit'}
      />
    </div>
  );
}
