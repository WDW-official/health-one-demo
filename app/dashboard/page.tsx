'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, FileText, Stethoscope, Sparkles, ArrowUpRight, Activity, Package2 } from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { User, SponsoredItem } from '@/lib/types';
import { DashboardWorkflow } from '@/components/dashboard-workflow';
import { DoctorDashboard } from '@/components/doctor-dashboard';
import { LoadingState } from '@/components/loading-state';
import { ApiClient } from '@/lib/api-client';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    totalConsultations: 0,
    upcomingAppointments: 0,
    totalDoctors: 0,
    totalSponsoredItems: 0,
  });
  const [upcomingAppts, setUpcomingAppts] = useState<any[]>([]);
  const [patientMap, setPatientMap] = useState<Map<string, { mrn?: string; name: string }>>(new Map());
  const [sponsoredItems, setSponsoredItems] = useState<SponsoredItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const currentUser = getCurrentUser();
        setUser(currentUser);

        if (!currentUser) {
          setError('Please log in');
          return;
        }

        if (currentUser.role === 'doctor' && currentUser.doctorId) {
          return;
        }

        const today = new Date();
        const upcomingEnd = new Date(today);
        upcomingEnd.setMonth(upcomingEnd.getMonth() + 3);

        const [patientsRes, appointmentsRes, consultationsRes, doctorsRes, upcomingRes, sponsoredRes] = await Promise.all([
          ApiClient.getAllPatients({ limit: 1 }),
          ApiClient.getAllAppointments({ limit: 1 }),
          ApiClient.getAllConsultations({ limit: 1 }),
          ApiClient.getAllDoctors({ limit: 1 }),
          ApiClient.getAppointmentsByDateRange(today.toISOString(), upcomingEnd.toISOString(), {
            limit: 5,
            status: 'scheduled',
          }),
          ApiClient.getSponsoredItems().catch(() => null),
        ]);

        const patients = patientsRes?.data || [];
        setPatientMap(
          new Map(
            (patients as { id: string; mrn?: string; firstName: string; lastName: string }[]).map((patient) => [
              patient.id,
              {
                mrn: patient.mrn,
                name: `${patient.firstName} ${patient.lastName}`,
              },
            ])
          )
        );

        setStats({
          totalPatients: patientsRes?.total || 0,
          totalAppointments: appointmentsRes?.total || 0,
          totalConsultations: consultationsRes?.total || 0,
          upcomingAppointments: upcomingRes?.total || 0,
          totalDoctors: doctorsRes?.total || 0,
          totalSponsoredItems: sponsoredRes?.totalItems || 0,

        });

        setUpcomingAppts(upcomingRes?.data || []);
        setSponsoredItems(sponsoredRes?.data || sponsoredRes?.sponsoredItems || []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <LoadingState label="Loading clinic overview" className="glass-panel rounded-4xl p-8" />
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-4xl p-8">
        <p className="text-sm font-semibold text-rose-700">Unable to load dashboard</p>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  // Show doctor dashboard if user is a doctor
  if (user?.role === 'doctor' && user?.doctorId) {
    return <DoctorDashboard doctorId={user.doctorId} doctorName={user.name} />;
  }

  return (
    <div className="space-y-8">
      <section className="glass-panel section-grid overflow-hidden rounded-4xl">
        <div className="grid gap-0 ">
          <div className="relative p-6 md:p-8 lg:p-10">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(124,199,184,0.18),transparent_65%)] blur-3xl" />
            <div className="relative space-y-6">
              {/* <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900">
                <Sparkles className="h-4 w-4" />
                Real-time clinic operations
              </div> */}
              <div className="max-w-3xl space-y-4">
                <h1 className="text-3xl uppercase font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Clinic dashboard.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  Track patient flow, see today’s work at a glance, and move quickly from intake to consultation without losing context.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/patients/new">
                  <Button className="rounded-2xl clinic-gradient text-white shadow-lg shadow-teal-950/20">
                    Add patient
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/patients">
                  <Button variant="outline" className="rounded-2xl border-slate-200 bg-white/70">
                    Returning patient
                  </Button>
                </Link>
                <Link href="/dashboard/appointments/new">
                  <Button variant="outline" className="rounded-2xl border-slate-200 bg-white/70">
                    Schedule appointment
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className=" border-t border-white/60 bg-white/50 p-6 md:p-8 lg:border-l lg:border-t-0">
            <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4">
              {[
                { label: 'Active patients', value: stats.totalPatients, tone: 'from-teal-500/10 to-teal-500/0', icon: Users },
                { label: 'Scheduled appointments', value: stats.totalAppointments, tone: 'from-blue-500/10 to-blue-500/0', icon: Calendar },
                { label: 'Doctors', value: stats.totalDoctors, tone: 'from-indigo-500/10 to-indigo-500/0', icon: Stethoscope },
                { label: 'Consultations', value: stats.totalConsultations, tone: 'from-amber-500/10 to-amber-500/0', icon: Activity },
                // { label: 'Sponsored items', value: stats.totalSponsoredItems, tone: 'from-emerald-500/10 to-emerald-500/0', icon: Package2 },
              ].map((item) => (
                <div key={item.label} className={`rounded-3xl border border-white/70 bg-linear-to-br ${item.tone} p-4 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-950">{item.value}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-slate-700 shadow-sm">
                      <item.icon className="h-5 w-5" />
                    </div>
                  </div>
                  {item.label === 'Scheduled appointments' && (
                    <p className="mt-3 text-sm text-slate-600">{stats.upcomingAppointments} upcoming visits</p>
                  )}
                  {/* {item.label === 'Sponsored items' && (
                    <p className="mt-3 text-sm text-slate-600">{stats.paidSponsoredItems} items paid for</p>
                  )} */}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* <Card className="glass-panel border-white/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-slate-950">Items Sponsored</CardTitle>
          <CardDescription className="text-slate-600">
            Total items available and how many have been paid for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sponsoredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-10 text-center">
              <p className="text-sm text-slate-500">No sponsored items added yet</p>
            </div>
          ) : (
            <ChartContainer
              config={{
                totalQuantity: { label: 'Items we have', color: '#0f766e' },
                paidQuantity: { label: 'Items paid for', color: '#1d4ed8' },
              }}
              className="h-[320px] w-full"
            >
              <BarChart data={sponsoredItems} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs text-slate-500"
                />
                <YAxis tickLine={false} axisLine={false} className="text-xs text-slate-500" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="totalQuantity" fill="var(--color-totalQuantity)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="paidQuantity" fill="var(--color-paidQuantity)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card> */}

      {/* Workflow Section - Admin only */}
      <DashboardWorkflow />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="glass-panel border-white/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-slate-950">Upcoming appointments</CardTitle>
            <CardDescription className="text-slate-600">
              Next 5 scheduled consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppts.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppts.map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/dashboard/appointments/${apt.id}`}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                        Appointment {apt.appointmentNumber || apt.id}
                      </p>
                      {patientMap.get(apt.patientId) ? (
                        <>
                          <p className="text-sm font-semibold text-slate-950">
                            {patientMap.get(apt.patientId)?.mrn || apt.patientId} • {patientMap.get(apt.patientId)?.name}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-teal-700">
                            MRN {patientMap.get(apt.patientId)?.mrn || apt.patientId}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-slate-950">
                          {apt.patientName || 'Patient'}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-600">
                        {new Date(apt.dateTime).toLocaleString()}
                      </p>
                      <span className="mt-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold capitalize text-teal-800">
                        {apt.type}
                      </span>
                    </div>
                    <span>
                      <Button size="sm" className="rounded-2xl clinic-gradient text-white">
                        View details
                      </Button>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-10 text-center">
                <p className="text-sm text-slate-500">No upcoming appointments</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-950">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/patients/new" className="block">
              <Button className="h-12 w-full justify-start rounded-2xl clinic-gradient text-white">
                <Users className="mr-2 h-4 w-4" />
                Add new patient
              </Button>
            </Link>
            <Link href="/dashboard/patients" className="block">
              <Button className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white/80" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Returning patient
              </Button>
            </Link>
            <Link href="/dashboard/appointments/new" className="block">
              <Button className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white/80" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule appointment
              </Button>
            </Link>
            <Link href="/dashboard/patients" className="block">
              <Button className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white/80" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                View patient files
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
