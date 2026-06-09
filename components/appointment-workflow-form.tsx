'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Patient, Doctor } from '@/lib/types';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Check, Clock } from 'lucide-react';

interface WorkflowStep {
  number: number;
  title: string;
  description: string;
  icon: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    number: 1,
    title: 'Select Patient',
    description: 'Choose the patient for this appointment',
    icon: '👥',
  },
  {
    number: 2,
    title: 'Choose Doctor',
    description: 'Select the assigned or preferred doctor',
    icon: '👨‍⚕️',
  },
  {
    number: 3,
    title: 'Set Details',
    description: 'Schedule date, time, and type of appointment',
    icon: '📅',
  },
  {
    number: 4,
    title: 'Confirm',
    description: 'Review and confirm the appointment',
    icon: '✅',
  },
];

interface AppointmentWorkflowFormProps {
  onStepsChange?: (steps: number) => void;
}

export function AppointmentWorkflowForm({ onStepsChange }: AppointmentWorkflowFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const currentUser = getCurrentUser();
      const doctorParams = currentUser?.role === 'doctor' ? { doctorId: currentUser.doctorId } : {};
      const [patientRes, doctorRes] = await Promise.all([
        ApiClient.getAllPatients({
          ...doctorParams,
          limit: 200,
          skip: 0,
        }),
        ApiClient.getAllDoctors({ limit: 200, skip: 0 }),
      ]);

      const pats = (patientRes?.data || []).filter((patient: Patient) => {
        if (currentUser?.role === 'doctor' && currentUser.doctorId) {
          return patient.assignedDoctorId === currentUser.doctorId;
        }
        return true;
      });
      const docs = (doctorRes?.data || []).filter((d: Doctor) => d.isActive);
      setPatients(pats);
      setDoctors(docs);
    };

    loadData().catch((error) => {
      console.error('Failed to load workflow data:', error);
    });
  }, []);

  useEffect(() => {
    onStepsChange?.(currentStep);
  }, [currentStep, onStepsChange]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentStep(2);
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setCurrentStep(3);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {WORKFLOW_STEPS.map((step) => (
          <div key={step.number} className="relative">
            <Card
              className={`cursor-pointer transition-all ${
                currentStep >= step.number
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-gray-50'
              } ${currentStep === step.number ? 'ring-2 ring-primary' : ''}`}
              onClick={() => {
                if (step.number <= currentStep + 1) {
                  setCurrentStep(step.number);
                }
              }}
            >
              <CardContent className="pt-6 text-center">
                <div className="text-3xl mb-2">{step.icon}</div>
                <h3 className="font-semibold text-sm">{step.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                {currentStep > step.number && (
                  <Check className="w-5 h-5 text-primary absolute top-2 right-2" />
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        {/* Step 1: Select Patient */}
        {currentStep >= 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  1
                </span>
                Select Patient
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {patients.map((patient) => (
                  <Card
                    key={patient.id}
                    className={`cursor-pointer border-2 transition-all ${
                      selectedPatient?.id === patient.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <CardContent className="pt-4">
                      <h4 className="font-semibold">
                        {patient.mrn || patient.id} • {patient.firstName} {patient.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{patient.phone}</p>
                      {patient.assignedDoctorName && (
                        <p className="text-xs text-accent mt-2">Assigned: Dr. {patient.assignedDoctorName}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Choose Doctor */}
        {currentStep >= 2 && selectedPatient && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  2
                </span>
                Choose Doctor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doctor) => (
                  <Card
                    key={doctor.id}
                    className={`cursor-pointer border-2 transition-all ${
                      selectedDoctor?.id === doctor.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleDoctorSelect(doctor)}
                  >
                    <CardContent className="pt-4">
                      <h4 className="font-semibold">{doctor.name}</h4>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {doctor.yearsOfExperience} years experience
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Set Details */}
        {currentStep >= 3 && selectedPatient && selectedDoctor && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  3
                </span>
                Set Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm">
                  <span className="font-semibold">Patient:</span> {selectedPatient.firstName}{' '}
                  {selectedPatient.lastName}
                </p>
                <p className="text-sm mt-1">
                  <span className="font-semibold">Doctor:</span> {selectedDoctor.name}
                </p>
              </div>

              <div className="space-y-3">
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => setCurrentStep(4)}>
                  Continue to Confirmation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirm */}
        {currentStep >= 4 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  4
                </span>
                Review & Confirm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 p-4 bg-white rounded-lg border border-primary/20">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Patient:</span>
                  <span className="text-sm">
                    {selectedPatient?.firstName} {selectedPatient?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Doctor:</span>
                  <span className="text-sm">{selectedDoctor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Specialization:</span>
                  <span className="text-sm">{selectedDoctor?.specialization}</span>
                </div>
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90">
                <Clock className="w-4 h-4 mr-2" />
                Proceed to Appointment Form
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
