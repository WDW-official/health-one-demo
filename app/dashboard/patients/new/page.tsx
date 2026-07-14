'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import PatientForm from '@/components/patient-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/lib/types';
import { ChevronLeft } from 'lucide-react';

export default function NewPatientPage() {
  const router = useRouter();
  const [user] = useState<User | null>(() => getCurrentUser());

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/patients');
    }
  };

  if (user?.role === 'doctor') {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Patient creation is restricted</CardTitle>
          <CardDescription>
            Doctors can view assigned patients, but only admins can register new patients.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Link href="/dashboard/patients">
            <Button>Go to my patients</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Add New Patient</h1>
      </div>
      <p className="text-gray-600">Register a new patient in the system</p>
      <PatientForm />
    </div>
  );
}
