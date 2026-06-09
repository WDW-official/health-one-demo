'use client';

import { Patient, Doctor } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Phone, Mail, AlertCircle, Calendar } from 'lucide-react';

interface PatientInfoCardProps {
  patient: Patient;
  doctor?: Doctor;
  showActions?: boolean;
}

export function PatientInfoCard({ patient, doctor, showActions = true }: PatientInfoCardProps) {
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  return (
    <Card className="glass-panel overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl text-slate-950">
              {patient.firstName} {patient.lastName}
            </CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              {age} years old • {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Patient MRN {patient.mrn || patient.id}
            </p>
          </div>
          {patient.assignedDoctorName && (
            <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">Assigned to Dr. {patient.assignedDoctorName}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-600">Phone</p>
              <p className="text-sm font-medium text-slate-950">{patient.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-600">Email</p>
              <p className="text-sm font-medium text-slate-950">{patient.email}</p>
            </div>
          </div>
        </div>

        {/* Medical Alerts */}
        {(patient.allergies || patient.currentMedications) && (
          <div className="border-t border-slate-200 pt-4 space-y-2">
            {patient.allergies && (
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-destructive">Allergies</p>
                  <p className="text-sm text-slate-700">{patient.allergies}</p>
                </div>
              </div>
            )}
            {patient.currentMedications && (
              <div className="flex gap-2">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-600">Current Medications</p>
                  <p className="text-sm text-slate-700">{patient.currentMedications}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-4 border-t border-slate-200">
            <Link href={`/dashboard/patients/${patient.id}`} className="flex-1">
              <Button variant="outline" className="w-full rounded-2xl border-slate-200 bg-white/80">
                <FileText className="w-4 h-4 mr-2" />
                View MRN Record
              </Button>
            </Link>
            <Link href={`/dashboard/appointments/new?patientId=${patient.id}`} className="flex-1">
              <Button className="w-full rounded-2xl clinic-gradient text-white">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
