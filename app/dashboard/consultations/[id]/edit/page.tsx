'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import ConsultationForm from '@/components/consultation-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function EditConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;
  const [consultation, setConsultation] = useState<any>(null);

  useEffect(() => {
    ApiClient.getConsultation(consultationId)
      .then((res) => setConsultation(res?.data || res?.consultation || null))
      .catch((error) => {
        console.error('Failed to load consultation for editing:', error);
        setConsultation(null);
      });
  }, [consultationId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/consultations');
    }
  };

  if (!consultation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Consultation not found</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Edit Consultation</h1>
      </div>
      <p className="text-gray-600">Update consultation record</p>
      <ConsultationForm consultation={consultation} isEditing={true} />
    </div>
  );
}
