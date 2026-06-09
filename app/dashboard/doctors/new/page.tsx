'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DoctorForm } from '@/components/doctor-form';
import { ApiClient } from '@/lib/api-client';
import { Doctor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { getErrorMessage } from '@/lib/error-message';
import { toast } from '@/hooks/use-toast';
import { ChevronLeft } from 'lucide-react';

export default function NewDoctorPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user?.isSuperAdmin) {
      router.replace('/dashboard/doctors');
    }
  }, [router]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/doctors');
    }
  };

  const handleSubmit = async (data: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsLoading(true);
      await ApiClient.createDoctor(data);
      router.push('/dashboard/doctors');
    } catch (error) {
      console.error('Error adding doctor:', error);
      const message = getErrorMessage(error, 'Failed to create doctor. Please try again.');
      toast({ title: 'Could not create doctor', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-0 h-auto hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4 text-gray-700" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Add Doctor</h1>
      </div>
      <DoctorForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
