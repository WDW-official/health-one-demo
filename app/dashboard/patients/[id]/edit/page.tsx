'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import PatientForm from '@/components/patient-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    ApiClient.getPatient(patientId)
      .then((res) => setPatient(res?.data || res?.patient || null))
      .catch((error) => {
        console.error('Failed to load patient for editing:', error);
        setPatient(null);
      });
  }, [patientId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/patients');
    }
  };

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Edit Patient</h1>
      </div>
      <p className="text-gray-600">Update information for {patient.firstName} {patient.lastName}</p>
      <PatientForm patient={patient} isEditing={true} />
    </div>
  );
}
