'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { DoctorForm } from '@/components/doctor-form';
import { LoadingState } from '@/components/loading-state';
import { ApiClient } from '@/lib/api-client';
import { Doctor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function EditDoctorPage() {
  const router = useRouter();
  const params = useParams();
  const doctorId = params.id as string;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ApiClient.getDoctor(doctorId)
      .then((res) => setDoctor(res?.data || res?.doctor || null))
      .catch((error) => {
        console.error('Failed to load doctor for editing:', error);
        setDoctor(null);
      })
      .finally(() => setIsLoading(false));
  }, [doctorId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/doctors');
    }
  };

  const handleSubmit = async (data: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await ApiClient.updateDoctor(doctorId, data);
      router.push('/dashboard/doctors');
    } catch (error) {
      console.error('Error updating doctor:', error);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading doctor" />;
  }

  if (!doctor) {
    return <div className="text-center py-8 text-red-500">Doctor not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-0 h-auto hover:bg-transparent"
        >
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Doctor</h1>
      </div>
      <DoctorForm initialData={doctor} onSubmit={handleSubmit} />
    </div>
  );
}
