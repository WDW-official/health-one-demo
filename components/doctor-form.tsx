'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Doctor } from '@/lib/types';
import { Check } from 'lucide-react';

interface DoctorFormProps {
  initialData?: Doctor;
  onSubmit: (data: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

export function DoctorForm({ initialData, onSubmit, isLoading = false }: DoctorFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    specialization: initialData?.specialization || '',
    licenseNumber: initialData?.licenseNumber || '',
    yearsOfExperience: initialData?.yearsOfExperience || 1,
    workingDays: initialData?.workingDays || [],
    availableSlots: initialData?.availableSlots || [],
    isActive: initialData?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const toggleSlot = (slot: string) => {
    setFormData(prev => ({
      ...prev,
      availableSlots: prev.availableSlots.includes(slot)
        ? prev.availableSlots.filter(s => s !== slot)
        : [...prev.availableSlots, slot],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.specialization.trim()) newErrors.specialization = 'Specialization is required';
    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    if (formData.yearsOfExperience < 0) newErrors.yearsOfExperience = 'Years must be non-negative';
    if (formData.workingDays.length === 0) newErrors.workingDays = 'Select at least one working day';
    if (formData.availableSlots.length === 0) newErrors.availableSlots = 'Select at least one available slot';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? 'Edit Doctor' : 'Add New Doctor'}</CardTitle>
          <CardDescription>
            {initialData ? 'Update doctor information' : 'Register a new doctor to the clinic'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Dr. John Doe"
                    disabled={isLoading}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="doctor@clinic.com"
                    disabled={isLoading}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="555-0000"
                    disabled={isLoading}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Specialization *</label>
                  <Input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    placeholder="General Dentistry"
                    disabled={isLoading}
                  />
                  {errors.specialization && <p className="text-red-500 text-sm mt-1">{errors.specialization}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">License Number *</label>
                  <Input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    placeholder="DEN-001"
                    disabled={isLoading}
                  />
                  {errors.licenseNumber && <p className="text-red-500 text-sm mt-1">{errors.licenseNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Years of Experience *</label>
                  <Input
                    type="number"
                    name="yearsOfExperience"
                    min="0"
                    value={formData.yearsOfExperience}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  {errors.yearsOfExperience && <p className="text-red-500 text-sm mt-1">{errors.yearsOfExperience}</p>}
                </div>
              </div>
            </div>

            {/* Working Days */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Working Days *</h3>
              {errors.workingDays && <p className="text-red-500 text-sm">{errors.workingDays}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`p-2 rounded border-2 transition-all ${
                      formData.workingDays.includes(day)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{day}</span>
                      {formData.workingDays.includes(day) && <Check className="w-4 h-4 text-blue-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Available Time Slots */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Available Time Slots *</h3>
              {errors.availableSlots && <p className="text-red-500 text-sm">{errors.availableSlots}</p>}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={`p-2 rounded border-2 transition-all text-sm ${
                      formData.availableSlots.includes(slot)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{slot}</span>
                      {formData.availableSlots.includes(slot) && <Check className="w-4 h-4 text-blue-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Status</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  disabled={isLoading}
                  className="rounded"
                />
                <span className="text-sm">Doctor is active</span>
              </label>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="sr-only">Saving doctor</span>
                </>
              ) : initialData ? (
                'Update Doctor'
              ) : (
                'Add Doctor'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
