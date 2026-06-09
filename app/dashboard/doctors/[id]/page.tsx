'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Award, CalendarDays, ChevronLeft, Clock, Edit2, Mail, Phone, ShieldCheck, Stethoscope } from 'lucide-react';

import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Doctor, Patient } from '@/lib/types';

export default function DoctorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const doctorId = params.id as string;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientTotal, setPatientTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const user = getCurrentUser();
  const canManageDoctors = Boolean(user?.role === 'admin' && user.isSuperAdmin);

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        const res = await ApiClient.getDoctor(doctorId);
        setDoctor(res?.data || res?.doctor || null);
      } catch (error) {
        console.error('Failed to load doctor:', error);
        setDoctor(null);
      } finally {
        setIsLoading(false);
      }
    };

    const loadPatients = async () => {
      try {
        const res = await ApiClient.getAllPatients({
          doctorId,
          limit: 50,
          skip: 0,
        });
        setPatients(res?.data || []);
        setPatientTotal(res?.total || 0);
      } catch (error) {
        console.error('Failed to load assigned patients:', error);
        setPatients([]);
        setPatientTotal(0);
      } finally {
        setIsLoadingPatients(false);
      }
    };

    loadDoctor();
    loadPatients();
  }, [doctorId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/doctors');
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading doctor" />;
  }

  if (!doctor) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-700">
        Doctor not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-x-3 gap-y-3 md:grid-cols-[auto_1fr_auto] md:items-start">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8 rounded-full hover:bg-slate-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
          <span className="sr-only">Back</span>
        </Button>

        <p className="pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Doctor Profile
        </p>

        {canManageDoctors && (
          <Link href={`/dashboard/doctors/${doctor.id || doctorId}/edit`} className="md:col-start-3 md:row-span-2">
            <Button variant="outline">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Doctor
            </Button>
          </Link>
        )}

        <div className="col-span-2 md:col-start-1">
          <h1 className="text-3xl font-bold text-gray-900">{doctor.name}</h1>
          <p className="mt-1 text-gray-600">{doctor.specialization}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Stethoscope className="h-5 w-5 text-teal-700" />
            <p className="mt-3 text-sm text-gray-600">Specialization</p>
            <p className="mt-1 text-lg font-semibold">{doctor.specialization}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Award className="h-5 w-5 text-blue-700" />
            <p className="mt-3 text-sm text-gray-600">Experience</p>
            <p className="mt-1 text-lg font-semibold">{doctor.yearsOfExperience} years</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <p className="mt-3 text-sm text-gray-600">Status</p>
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                doctor.isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {doctor.isActive ? 'Active' : 'Inactive'}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            <p className="mt-3 text-sm text-gray-600">License</p>
            <p className="mt-1 text-lg font-semibold">{doctor.licenseNumber}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
            <CardDescription>How to reach this doctor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <Mail className="h-4 w-4 text-teal-700" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{doctor.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <Phone className="h-4 w-4 text-teal-700" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{doctor.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
            <CardDescription>Working days and appointment slots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CalendarDays className="h-4 w-4 text-teal-700" />
                Working days
              </div>
              <div className="flex flex-wrap gap-2">
                {(doctor.workingDays || []).map((day) => (
                  <span key={day} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
                    {day}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Clock className="h-4 w-4 text-teal-700" />
                Available slots
              </div>
              <div className="flex flex-wrap gap-2">
                {(doctor.availableSlots || []).map((slot) => (
                  <span key={slot} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {slot}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Patients</CardTitle>
          <CardDescription>
            {patientTotal} patient{patientTotal !== 1 ? 's' : ''} assigned to {doctor.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPatients ? (
            <LoadingState label="Loading assigned patients" />
          ) : patients.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No patients are assigned to this doctor yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">MRN</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Patient</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Family Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/patients/${patient.id}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {patient.mrn || patient.id}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/patients/${patient.id}`}
                          className="font-medium text-slate-950 hover:text-blue-700"
                        >
                          {patient.firstName} {patient.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <p>{patient.phone}</p>
                        <p className="text-xs">{patient.email}</p>
                      </td>
                      <td className="px-4 py-4 capitalize text-slate-600">
                        {patient.familyStatus || 'individual'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {patientTotal > patients.length && (
                <p className="mt-3 text-xs text-slate-500">
                  Showing first {patients.length} of {patientTotal} assigned patients.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
