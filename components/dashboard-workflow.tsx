'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Patient } from '@/lib/types';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Search, Plus, UserPlus, ArrowRight, ClipboardList, Sparkles } from 'lucide-react';

export function DashboardWorkflow() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setIsSearching(false);
        setSearchResults([]);
        return;
      }

      try {
        const currentUser = getCurrentUser();
        const res = await ApiClient.getAllPatients({
          search: searchQuery.trim(),
          doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
          limit: 10,
          skip: 0,
        });
        setIsSearching(true);
        setSearchResults(res?.data || []);
      } catch (error) {
        console.error('Patient search failed:', error);
        setSearchResults([]);
        setIsSearching(true);
      }
    };

    const timer = setTimeout(handleSearch, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const workflowSteps = [
    { number: 1, label: 'Open Dashboard', icon: '📋' },
    { number: 2, label: 'Register/Search Patient', icon: '🔍' },
    { number: 3, label: 'Patient File Created', icon: '📄' },
    { number: 4, label: 'Assign Doctor', icon: '👨‍⚕️' },
    { number: 5, label: 'Consultation', icon: '💬' },
    { number: 6, label: 'Treatment', icon: '🦷' },
    { number: 7, label: 'Follow-up', icon: '📅' },
    { number: 8, label: 'Reminder', icon: '🔔' },
  ];

  return (
    <div className="space-y-8">
      {/* <Card className="glass-panel overflow-hidden">
        <CardHeader className="pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">
            <Sparkles className="h-3.5 w-3.5" />
            Patient journey
          </div>
          <CardTitle className="text-2xl font-semibold text-slate-950">
            Patient care workflow
          </CardTitle>
          <CardDescription className="text-slate-600">
            Complete patient journey from arrival to follow-up
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-8">
            {workflowSteps.map((step, idx) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full clinic-gradient text-lg font-semibold text-white shadow-md shadow-teal-950/20 transition-transform hover:scale-105">
                    {step.number}
                  </div>
                  <p className="mt-3 text-center text-xs font-semibold text-slate-700">{step.label}</p>
                </div>
                {idx < workflowSteps.length - 1 && (
                  <div className="hidden md:flex flex-col items-center mb-8">
                    <ArrowRight className="h-5 w-5 text-teal-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card> */}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="glass-panel transition-all hover:-translate-y-1">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-50 p-2.5">
                <UserPlus className="h-5 w-5 text-teal-700" />
              </div>
              <span>Register Patient</span>
            </CardTitle>
            <CardDescription className="text-slate-600">Add a new patient to the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Start the intake process for a new patient. Collect information and create their complete medical record.
            </p>
            <Link href="/dashboard/patients/new">
              <Button className="h-11 w-full rounded-2xl clinic-gradient text-white">
                <Plus className="mr-2 h-4 w-4" />
                New Patient
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-panel transition-all hover:-translate-y-1">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-50 p-2.5">
                <Search className="h-5 w-5 text-sky-700" />
              </div>
              <span>Find Patient</span>
            </CardTitle>
            <CardDescription className="text-slate-600">Quick access to existing records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by MRN, name, phone, or email..."
                className="h-11 rounded-2xl border-slate-200 bg-white/80 pl-11 focus-visible:ring-teal-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isSearching && (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((patient) => (
                    <Link key={patient.id} href={`/dashboard/patients/${patient.id}`}>
                      <div className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white/70 p-3 transition-all hover:border-teal-200 hover:bg-teal-50/60">
                        <p className="text-sm font-semibold text-slate-900">
                          {patient.mrn || patient.id} • {patient.firstName} {patient.lastName}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{patient.phone}</p>
                        {patient.assignedDoctorName && (
                          <p className="mt-1 text-xs font-medium text-teal-700">Dr. {patient.assignedDoctorName}</p>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-6 text-center">
                    <p className="text-sm text-slate-500">No patients found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* <Card className="glass-panel overflow-hidden">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-950">
            <ClipboardList className="h-5 w-5 text-teal-700" />
            Workflow overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {[
              {
                step: 'NEW PATIENTS',
                description: 'Open dashboard -> Register patient -> Create medical file',
              },
              {
                step: 'RETURNING PATIENTS',
                description: 'Open dashboard -> Search patient -> Access existing record',
              },
              {
                step: 'CONSULTATION',
                description: 'Assign doctor -> Schedule appointment -> Document findings',
              },
              {
                step: 'TREATMENT & FOLLOW-UP',
                description: 'Record treatment -> Plan follow-up -> Send reminders',
              },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4 border-b border-slate-200 pb-4 last:border-b-0">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full clinic-gradient text-sm font-semibold text-white shadow-md shadow-teal-950/20">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold">{item.step}</h4>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}
