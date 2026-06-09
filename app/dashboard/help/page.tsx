'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessGuide } from '@/components/process-guide';
import { HelpCircle, Users, Calendar, FileText, ClipboardCheck } from 'lucide-react';

export default function HelpPage() {
  const quickLinks = [
    {
      icon: Users,
      title: 'Managing Patients',
      description: 'Register patients, search records, view registration dates, and update patient information',
      color: 'text-blue-600',
    },
    {
      icon: ClipboardCheck,
      title: 'Checking In Patients',
      description: 'Check in patients, assign doctors, and send waiting patients to the doctor dashboard',
      color: 'text-teal-600',
    },
    {
      icon: Calendar,
      title: 'Scheduling Appointments',
      description: 'Schedule appointments, view calendar, and manage doctor availability',
      color: 'text-green-600',
    },
    {
      icon: FileText,
      title: 'Recording Consultations',
      description: 'Document diagnoses, treatments, prescriptions, and follow-up dates',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Help & Guidance</h1>
        <p className="text-gray-600 mt-1">Learn how to use the clinic management system effectively</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {quickLinks.map((link, idx) => {
          const Icon = link.icon;
          return (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Icon className={`w-8 h-8 ${link.color} mb-2`} />
                <CardTitle>{link.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{link.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Process Guide */}
      <ProcessGuide />

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">How do I register a new patient?</h3>
            <p className="text-sm text-gray-700">
              Go to Patients and click New Patient. Fill in their personal information, medical history, allergies, and optionally assign a doctor. The system creates the patient file and records the date registered.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Can I find a patient by phone number?</h3>
            <p className="text-sm text-gray-700">
              Yes. Use the search bar on the Patients page. You can search by MRN, name, email, or phone number.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">How do I assign a doctor to a patient?</h3>
            <p className="text-sm text-gray-700">
              You can assign a doctor during patient registration or by editing the patient file. Only admin users can manage the list of doctors in the system.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">How do I check in a patient?</h3>
            <p className="text-sm text-gray-700">
              Open Check-ins and click Check In Patient. Select the patient, confirm or assign the doctor, add an optional note, and submit. If the patient has a scheduled appointment today, it is attached automatically.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">What happens when a checked-in patient has an assigned doctor?</h3>
            <p className="text-sm text-gray-700">
              When you select a patient in the check-in form, their assigned doctor is filled automatically. The check-in then appears on that doctor&apos;s dashboard with the patient name, MRN, check-in time, appointment link when available, and the staff member who checked them in.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">How do I view all appointments?</h3>
            <p className="text-sm text-gray-700">
              Navigate to Appointments. You can use the calendar, filter by status, filter by patient, open appointment details, reschedule, check in today&apos;s appointment, or mark it complete.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">What information should I record in a consultation?</h3>
            <p className="text-sm text-gray-700">
              Record the diagnosis, treatment provided, any prescriptions, notes about the visit, and schedule a follow-up date if needed. This creates a complete medical history for the patient.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">How do I set follow-up appointments?</h3>
            <p className="text-sm text-gray-700">
              When recording a consultation, you can set a follow-up date. The system can optionally send automated reminders to the patient and clinic staff.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>Contact clinic administration for additional support</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">
            For technical issues or feature requests, please contact the clinic administrator or IT support team. We&apos;re here to help make your workflow smoother.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
