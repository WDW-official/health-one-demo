'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/loading-state';
import { Calendar, Users, CheckCircle, Clock, Sparkles, ArrowUpRight, UserCheck, Stethoscope } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { CheckIn, Patient } from '@/lib/types';

interface DoctorDashboardProps {
  doctorId: string;
  doctorName: string;
}

export function DoctorDashboard({ doctorId, doctorName }: DoctorDashboardProps) {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>([]);
  const [patientMap, setPatientMap] = useState<Map<string, Patient>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const todayKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [appointmentsRes, patientsRes, checkInsRes] = await Promise.all([
          ApiClient.getAppointmentsByDoctor(doctorId),
          ApiClient.getPatientsByDoctor(doctorId).catch(() => ApiClient.getAllPatients({ doctorId, limit: 200, skip: 0 })),
          ApiClient.getCheckIns({ doctorId, date: todayKey(), status: 'waiting', limit: 50 }),
        ]);
        const appointments = appointmentsRes?.data || [];
        const patients = patientsRes?.data || [];
        const checkIns = checkInsRes?.data || [];
        setPatientMap(new Map(patients.map((patient: Patient) => [patient.id, patient])));
        setTodayCheckIns(checkIns);
        
        const today = new Date().toDateString();
        
        const today_apts = appointments.filter(
          (apt: any) => new Date(apt.dateTime).toDateString() === today
        );
        
        const upcoming = appointments.filter(
          (apt: any) => new Date(apt.dateTime) > new Date() && apt.status === 'scheduled'
        );
        
        const completed = appointments.filter(
          (apt: any) => apt.status === 'completed'
        );

        setStats({
          totalAppointments: appointments.length,
          todayAppointments: today_apts.length,
          upcomingAppointments: upcoming.length,
          completedAppointments: completed.length,
        });

        setRecentAppointments(appointments.slice(0, 5));
      } catch (error) {
        console.error('Failed to load appointments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [doctorId]);

  const refreshCheckIns = async () => {
    const res = await ApiClient.getCheckIns({ doctorId, date: todayKey(), status: 'waiting', limit: 50 });
    setTodayCheckIns(res?.data || []);
  };

  const handleCheckInStatus = async (checkIn: CheckIn, status: CheckIn['status']) => {
    try {
      await ApiClient.updateCheckIn(checkIn.id, { status });
      await refreshCheckIns();
    } catch (error) {
      console.error('Failed to update check-in:', error);
      alert('Failed to update check-in');
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading dashboard" />;
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
              <Sparkles className="h-3.5 w-3.5" />
              Doctor workspace
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Welcome, Dr. {doctorName}
              </h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Your appointments, consults, and today’s schedule in one calm, focused view.
              </p>
            </div>
          </div>
          <Link href={`/dashboard/consultations?doctorId=${doctorId}`}>
            <Button className="rounded-2xl clinic-gradient text-white">
              Open consultations
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Total appointments</CardTitle>
            <Calendar className="h-4 w-4 text-teal-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.totalAppointments}</div>
            <p className="mt-1 text-xs text-slate-500">All time</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Today</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.todayAppointments}</div>
            <p className="mt-1 text-xs text-slate-500">Scheduled today</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.upcomingAppointments}</div>
            <p className="mt-1 text-xs text-slate-500">Scheduled</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.completedAppointments}</div>
            <p className="mt-1 text-xs text-slate-500">Finished</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-950">
            <UserCheck className="h-5 w-5 text-teal-700" />
            Checked-in patients today
          </CardTitle>
          <CardDescription>Patients currently waiting for you after front desk check-in</CardDescription>
        </CardHeader>
        <CardContent>
          {todayCheckIns.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No patients are checked in for you right now</p>
          ) : (
            <div className="space-y-3">
              {todayCheckIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/75 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                      MRN {checkIn.patientMrn || checkIn.patientId}
                    </p>
                    <p className="mt-1 font-medium text-slate-950">{checkIn.patientName}</p>
                    <p className="text-sm text-slate-600">
                      Checked in at{' '}
                      {checkIn.checkedInAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      by {checkIn.checkedInByName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {checkIn.appointmentId
                        ? `Appointment ${checkIn.appointmentNumber || checkIn.appointmentId}`
                        : 'Walk-in check-in'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {checkIn.appointmentId && (
                      <Link href={`/dashboard/appointments/${checkIn.appointmentId}`}>
                        <Button variant="outline" size="sm" className="rounded-xl">
                          Open appointment
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleCheckInStatus(checkIn, 'with_doctor')}
                    >
                      <Stethoscope className="mr-2 h-4 w-4" />
                      With doctor
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleCheckInStatus(checkIn, 'completed')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Appointments */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-slate-950">Recent appointments</CardTitle>
          <CardDescription className="text-slate-600">Your upcoming and recent consultations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No appointments yet</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/dashboard/appointments/${appointment.id}`}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 transition-all hover:border-teal-200 hover:shadow-sm md:flex-row md:items-center md:justify-between"
                >
                    <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                      Appointment {appointment.appointmentNumber || appointment.id}
                    </p>
                    <p className="font-medium text-slate-950">
                      {patientMap.get(appointment.patientId)
                        ? `${patientMap.get(appointment.patientId)?.mrn || appointment.patientId} • ${patientMap.get(appointment.patientId)?.firstName} ${patientMap.get(appointment.patientId)?.lastName}`
                        : appointment.type}
                    </p>
                    {patientMap.get(appointment.patientId) && (
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-teal-700">
                        MRN {patientMap.get(appointment.patientId)?.mrn || appointment.patientId}
                      </p>
                    )}
                    <p className="text-sm text-slate-600">
                      {new Date(appointment.dateTime).toLocaleDateString()} at{' '}
                      {new Date(appointment.dateTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        appointment.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : appointment.status === 'scheduled'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {appointment.status}
                    </span>
                    <span>
                      <Button variant="outline" size="sm" className="rounded-xl border-slate-200">
                        View
                      </Button>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-slate-950">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Link href={`/dashboard/patients?doctorId=${doctorId}`}>
              <Button variant="outline" className="h-11 w-full justify-start rounded-2xl border-slate-200 bg-white/80">
                <Users className="w-4 h-4 mr-2" />
                View My Patients
              </Button>
            </Link>
            <Link href={`/dashboard/appointments?doctorId=${doctorId}`}>
              <Button variant="outline" className="h-11 w-full justify-start rounded-2xl border-slate-200 bg-white/80">
                <Calendar className="w-4 h-4 mr-2" />
                View Appointments
              </Button>
            </Link>
            <Link href={`/dashboard/consultations?doctorId=${doctorId}`}>
              <Button variant="outline" className="h-11 w-full justify-start rounded-2xl border-slate-200 bg-white/80">
                <CheckCircle className="w-4 h-4 mr-2" />
                View Consultations
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
