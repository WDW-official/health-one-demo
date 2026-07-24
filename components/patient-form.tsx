'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Patient } from '@/lib/types';
import { ApiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-message';
import { toast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

interface PatientFormProps {
  patient?: Patient;
  isEditing?: boolean;
}

export default function PatientForm({ patient, isEditing = false }: PatientFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName: patient?.firstName || '',
    lastName: patient?.lastName || '',
    dateOfBirth: patient?.dateOfBirth || '',
    familyStatus: patient?.familyStatus || 'individual',
    gender: (patient?.gender || 'male') as 'male' | 'female' | 'other',
    email: patient?.email || '',
    phone: patient?.phone || '',
    address: patient?.address || '',
    city: patient?.city || '',
    state: patient?.state || '',
    zipCode: patient?.zipCode || '',
    insuranceProvider: patient?.insuranceProvider || '',
    insurancePolicyNumber: patient?.insurancePolicyNumber || '',
    medicalHistory: patient?.medicalHistory || '',
    allergies: patient?.allergies || '',
    currentMedications: patient?.currentMedications || '',
    notes: patient?.notes || '',
    emergencyContactName: patient?.emergencyContactName || '',
    emergencyContactPhone: patient?.emergencyContactPhone || '',
    assignedDoctorId: patient?.assignedDoctorId || '',
    assignedDoctorName: patient?.assignedDoctorName || '',
  });

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await ApiClient.getAllDoctors();
        const allDoctors = res?.data || [];
        setDoctors(allDoctors.filter((d: any) => d.isActive));
      } catch (error) {
        console.error('Error loading doctors:', error);
      }
    };
    loadDoctors();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDoctorSelect = (doctorId: string) => {
    const selectedDoctor = doctors.find((d) => d.id === doctorId);
    setFormData((prev) => ({
      ...prev,
      assignedDoctorId: doctorId,
      assignedDoctorName: selectedDoctor?.name || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validation
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First and last name are required');
        setIsLoading(false);
        return;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        setIsLoading(false);
        return;
      }
      if (!formData.phone.trim()) {
        setError('Phone number is required');
        setIsLoading(false);
        return;
      }

      if (isEditing && patient) {
        await ApiClient.updatePatient(patient.id, formData);
        toast({ title: 'Patient updated', description: 'The patient record was saved successfully.' });
        router.push(`/dashboard/patients/${patient.id}`);
      } else {
        const res = await ApiClient.createPatient(formData);
        const newPatient = res?.data;
        toast({ title: 'Patient created', description: `MRN ${newPatient?.mrn || 'created'} was added successfully.` });
        router.push(`/dashboard/patients/${newPatient?.id || newPatient?._id}`);
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to save patient. Please try again.');
      setError(message);
      toast({ title: 'Could not save patient', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Patient' : 'New Patient'}</CardTitle>
        <CardDescription>
          {isEditing
            ? 'Update patient information'
            : 'Add a new patient to the system'}
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

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <Input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <Input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Birth</label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Family Status</label>
                <Select
                  value={formData.familyStatus}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, familyStatus: value as typeof current.familyStatus }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select family status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, gender: value as typeof current.gender }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Assign Doctor */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Assigned Doctor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Doctor</label>
                <SearchableSelect
                  value={formData.assignedDoctorId}
                  onValueChange={handleDoctorSelect}
                  options={doctors.map((doctor) => ({
                    value: doctor.id,
                    label: doctor.name,
                    description: doctor.specialization,
                  }))}
                  placeholder="Select a doctor..."
                  searchPlaceholder="Search doctors..."
                  emptyText="No doctors found."
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="555-0100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <Input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Lagos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zip Code</label>
                <Input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="10001"
                />
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Insurance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Insurance Provider</label>
                <Input
                  type="text"
                  name="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={handleChange}
                  placeholder="BlueCross"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Policy Number</label>
                <Input
                  type="text"
                  name="insurancePolicyNumber"
                  value={formData.insurancePolicyNumber}
                  onChange={handleChange}
                  placeholder="BC123456"
                />
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Medical Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Medical History</label>
                <textarea
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleChange}
                  placeholder="Any relevant medical history..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Allergies</label>
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="Any known allergies..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Medications</label>
                <textarea
                  name="currentMedications"
                  value={formData.currentMedications}
                  onChange={handleChange}
                  placeholder="Current medications list..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes about this patient..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contact Name</label>
                <Input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Phone</label>
                <Input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="555-0101"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="sr-only">Saving patient</span>
                </>
              ) : isEditing ? (
                'Update Patient'
              ) : (
                'Create Patient'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(
                  isEditing && patient
                    ? `/dashboard/patients/${patient.id}`
                    : '/dashboard/patients'
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
