'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowDown } from 'lucide-react';

export function ProcessGuide() {
  const processes = [
    {
      title: 'New Patient Intake',
      steps: [
        'Patient arrives at clinic',
        'Admin opens Patients',
        'Click New Patient',
        'Fill in patient information',
        'Assign primary doctor (optional)',
        'System creates patient file with registration date',
        'Schedule first appointment',
        'Set automated reminders',
      ],
      duration: '15-20 mins',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Returning Patient Check-in',
      steps: [
        'Patient arrives at clinic',
        'Admin opens Check-ins',
        'Click Check In Patient',
        'Search and select the patient',
        'Assigned doctor fills automatically when available',
        'Today appointment attaches automatically when available',
        'Submit check-in',
        'Patient appears on the doctor dashboard',
      ],
      duration: '2-5 mins',
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'Appointment & Consultation',
      steps: [
        'Confirm appointment with patient',
        'Patient sits with assigned doctor',
        'Doctor performs examination',
        'Record consultation findings',
        'Document diagnosis & treatment',
        'Provide prescription if needed',
        'Schedule follow-up appointment',
        'Reminder automatically sent',
      ],
      duration: '30-60 mins',
      color: 'bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clinic Process Guide</h2>
        <p className="text-gray-600 mt-1">Step-by-step workflows for efficient patient management</p>
      </div>

      <div className="grid gap-6">
        {processes.map((process, processIdx) => (
          <Card key={processIdx} className={`border-2 ${process.color}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{process.title}</CardTitle>
                  <CardDescription>Complete process workflow</CardDescription>
                </div>
                <Badge variant="secondary">{process.duration}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {process.steps.map((step, stepIdx) => (
                  <div key={stepIdx} className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center text-sm font-bold">
                        {stepIdx + 1}
                      </div>
                      {stepIdx < process.steps.length - 1 && (
                        <ArrowDown className="w-4 h-4 mt-2 text-gray-400" />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-medium text-gray-800">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips Section */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Use the patient search to quickly find records by MRN, name, phone, or email
            </p>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Assign doctors to patients to track their preferred physician
            </p>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Check in patients from Check-ins, or from the appointment detail page when the appointment is scheduled for today
            </p>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Always record consultations and follow-ups for complete patient histories
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
