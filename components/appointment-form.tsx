'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Appointment, Patient, Doctor } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import { ApiClient } from '@/lib/api-client';
import { getProcedureCategory, PROCEDURE_GROUPS } from '@/lib/procedure-types';
import { getErrorMessage } from '@/lib/error-message';
import { toast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

interface AppointmentFormProps {
  appointment?: Appointment;
  isEditing?: boolean;
  mode?: 'edit' | 'reschedule';
}

export default function AppointmentForm({
  appointment,
  isEditing = false,
  mode = 'edit',
}: AppointmentFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const isRescheduling = isEditing && mode === 'reschedule';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const initialProcedure = appointment?.type || PROCEDURE_GROUPS[0].procedures[0];
  const [procedureCategory, setProcedureCategory] = useState(getProcedureCategory(initialProcedure));
  const [formData, setFormData] = useState({
    patientId: appointment?.patientId || patientIdParam || '',
    doctorId: appointment?.doctorId || '',
    dateTime: appointment
      ? appointment.dateTime.toISOString().slice(0, 16)
      : '',
    duration: appointment?.duration || 60,
    type: initialProcedure as Appointment['type'],
    status: (appointment?.status || 'scheduled') as Appointment['status'],
    notes: appointment?.notes || '',
  });
  const [minDateTime] = useState(() =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );

  useEffect(() => {
    const currentUser = getCurrentUser();
    const loadFormData = async () => {
      const doctorParams = currentUser?.role === 'doctor' ? { doctorId: currentUser.doctorId } : {};
      const [patientRes, doctorRes] = await Promise.all([
        ApiClient.getAllPatients({
          ...doctorParams,
          limit: 200,
          skip: 0,
        }),
        ApiClient.getAllDoctors({ limit: 200, skip: 0 }),
      ]);

      const pats = patientRes?.data || [];
      const docs = (doctorRes?.data || []).filter((doctor: Doctor) => doctor.isActive);
      setPatients(pats);
      setDoctors(docs);

      if (currentUser?.role === 'doctor' && currentUser.doctorId) {
        setFormData((prev) => ({ ...prev, doctorId: currentUser.doctorId ?? prev.doctorId }));
      } else if (!appointment?.doctorId && docs.length > 0) {
        setFormData((prev) => ({ ...prev, doctorId: prev.doctorId || docs[0].id }));
      }
    };

    loadFormData().catch((error) => {
      console.error('Failed to load appointment form data:', error);
    });
  }, [appointment?.doctorId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) : value,
    }));
  };

  const handlePatientSelect = (patientId: string) => {
    setFormData((prev) => ({
      ...prev,
      patientId,
    }));
  };

  const handleDoctorSelect = (doctorId: string) => {
    setFormData((prev) => ({
      ...prev,
      doctorId,
    }));
  };

  const handleProcedureCategoryChange = (category: (typeof PROCEDURE_GROUPS)[number]['category']) => {
    const group = PROCEDURE_GROUPS.find((item) => item.category === category);
    const firstProcedure = group?.procedures[0] || formData.type;
    setProcedureCategory(category);
    setFormData((prev) => ({
      ...prev,
      type: firstProcedure as Appointment['type'],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validation
      if (!formData.patientId) {
        setError('Patient is required');
        setIsLoading(false);
        return;
      }
      if (!formData.dateTime) {
        setError('Date and time are required');
        setIsLoading(false);
        return;
      }
      if (formData.duration <= 0) {
        setError('Duration must be greater than 0');
        setIsLoading(false);
        return;
      }

      const dateTimeObj = new Date(formData.dateTime);
      if (dateTimeObj.getTime() < Date.now()) {
        setError('Appointment date and time cannot be in the past');
        setIsLoading(false);
        return;
      }

      if (isEditing && appointment) {
        await ApiClient.updateAppointment(appointment.id, {
          ...formData,
          dateTime: dateTimeObj,
          status: isRescheduling ? 'scheduled' : formData.status,
        });
        toast({
          title: isRescheduling ? 'Appointment rescheduled' : 'Appointment updated',
          description: isRescheduling
            ? 'The appointment date and time were updated successfully.'
            : 'The appointment was saved successfully.',
        });
        router.push(`/dashboard/appointments/${appointment.id}`);
      } else {
        const res = await ApiClient.createAppointment({
          ...formData,
          dateTime: dateTimeObj,
        });
        const newAppointment = res?.data || res?.appointment;
        toast({ title: 'Appointment scheduled', description: 'The appointment was created successfully.' });
        router.push(`/dashboard/appointments/${newAppointment?.id || newAppointment?._id}`);
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to save appointment. Please try again.');
      setError(message);
      toast({ title: 'Could not save appointment', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isRescheduling ? 'Reschedule Appointment' : isEditing ? 'Edit Appointment' : 'Schedule Appointment'}
        </CardTitle>
        <CardDescription>
          {isRescheduling
            ? 'Choose a new date and time for this appointment'
            : isEditing
            ? 'Update appointment details'
            : 'Schedule a new appointment for a patient'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Patient *</label>
              <SearchableSelect
                value={formData.patientId}
                onValueChange={handlePatientSelect}
                options={patients.map((patient) => ({
                  value: patient.id,
                  label: `${patient.mrn || patient.id} • ${patient.firstName} ${patient.lastName}`,
                  description: patient.email,
                }))}
                placeholder="Select a patient"
                searchPlaceholder="Search patients..."
                emptyText="No patients found."
              />
            </div>

            {getCurrentUser()?.role !== 'doctor' && (
              <div>
                <label className="block text-sm font-medium mb-1">Doctor *</label>
                <SearchableSelect
                  value={formData.doctorId}
                  onValueChange={handleDoctorSelect}
                  options={doctors.map((doctor) => ({
                    value: doctor.id,
                    label: doctor.name,
                    description: doctor.specialization,
                  }))}
                  placeholder="Select a doctor"
                  searchPlaceholder="Search doctors..."
                  emptyText="No doctors found."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Procedure Category *</label>
              <Select
                value={procedureCategory}
                onValueChange={(value) =>
                  handleProcedureCategoryChange(value as (typeof PROCEDURE_GROUPS)[number]['category'])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select procedure category" />
                </SelectTrigger>
                <SelectContent>
                {PROCEDURE_GROUPS.map((group) => (
                  <SelectItem key={group.category} value={group.category}>
                    {group.category}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Procedure Type *</label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((current) => ({ ...current, type: value as typeof current.type }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select procedure type" />
                </SelectTrigger>
                <SelectContent>
                {(PROCEDURE_GROUPS.find((group) => group.category === procedureCategory)?.procedures || []).map((procedureType) => (
                  <SelectItem key={procedureType} value={procedureType}>
                    {procedureType}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date & Time *</label>
              <Input
                type="datetime-local"
                name="dateTime"
                value={formData.dateTime}
                onChange={handleChange}
                min={minDateTime}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
              <Input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="15"
                step="15"
                required
              />
            </div>

            {isEditing && !isRescheduling && (
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, status: value as typeof current.status }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="noshow">No-show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about the appointment..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="sr-only">Saving appointment</span>
                </>
              ) : isEditing ? (
                isRescheduling ? 'Reschedule Appointment' : 'Update Appointment'
              ) : (
                'Schedule Appointment'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(
                  isEditing && appointment
                    ? `/dashboard/appointments/${appointment.id}`
                    : '/dashboard/appointments'
                )
              }
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
