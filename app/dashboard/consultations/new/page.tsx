'use client';

import { useRouter } from 'next/navigation';
import ConsultationForm from '@/components/consultation-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function NewConsultationPage() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/consultations');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-0 h-auto hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4 text-gray-700" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">New Consultation</h1>
      </div>
      <p className="text-gray-600">Record a new consultation for a patient</p>
      <ConsultationForm />
    </div>
  );
}
