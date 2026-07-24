'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AuthLogo } from '@/components/auth-logo';
import { ApiClient } from '@/lib/api-client';
import { setAuthToken, setCurrentUser, startAuthSession } from '@/lib/auth';
import { getErrorMessage } from '@/lib/error-message';
import { getHospitalDashboardPath } from '@/lib/tenant-routing';
import { toast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await ApiClient.login(email, password);
      if (result?.passwordResetRequired && result.resetToken) {
        router.push(`/reset-password?token=${encodeURIComponent(result.resetToken)}&firstLogin=1`);
        return;
      }

      if (result?.user) {
        setCurrentUser(result.user);
        if (result.token) {
          setAuthToken(result.token);
        }
        startAuthSession(result.user);
        toast({
          title: 'Welcome back',
          description: `Signed in as ${result.user.name}.`,
        });
        if (result.user.isSuperAdmin) {
          ApiClient.setActiveHospital(null);
        }
        router.push(result.user.isSuperAdmin ? '/platform' : getHospitalDashboardPath(result.user));
      } else {
        const message = 'Invalid email or password';
        setError(message);
        toast({ title: 'Login failed', description: message, variant: 'destructive' });
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Login failed. Please try again.');
      setError(message);
      toast({ title: 'Login failed', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="section-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,199,184,0.28),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(53,92,155,0.18),transparent_24%)]" />
      <div className="relative mx-auto flex w-full max-w-md items-center justify-center">
        {/* <div className="glass-panel relative overflow-hidden rounded-[2rem] p-8 md:p-10 lg:p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(124,199,184,0.35),transparent_65%)] blur-2xl" />
          <div className="relative space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-teal-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-teal-900">
              <Sparkles className="h-4 w-4" />
              Patient management for a modern dental workflow
            </div>

            <div className="max-w-xl space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl clinic-gradient text-white shadow-lg shadow-teal-950/20">
                <Stethoscope className="h-7 w-7" />
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Health One
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-600 md:text-lg">
                A calm, clinical workspace for registering patients, managing appointments, and tracking consultations without the clutter.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Users2, label: 'Patient records' },
                { icon: Calendar, label: 'Appointments' },
                { icon: Shield, label: 'Secure access' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4">
                  <item.icon className="h-5 w-5 text-teal-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Patient intake and search in one place',
                'Dashboard views for admin and doctors',
                'Appointment and consultation tracking',
                'A cleaner workflow for front desk teams',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/75 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div> */}

        <Card className="glass-panel w-full border-white/60 shadow-none">
          <CardHeader className="space-y-2 pb-6">
            <AuthLogo />
            <CardTitle className="text-2xl text-slate-950">Sign in</CardTitle>
            <CardDescription className="text-slate-600">
              Use your clinic account to continue to the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 rounded-2xl border-slate-200 bg-white/80 focus-visible:ring-teal-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 rounded-2xl border-slate-200 bg-white/80 focus-visible:ring-teal-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-2xl clinic-gradient text-white shadow-lg shadow-teal-950/20 transition-transform hover:scale-[1.01]"
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    <span className="sr-only">Signing in</span>
                  </>
                ) : (
                  'Enter dashboard'
                )}
              </Button>
            </form>

            {/* <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Demo accounts
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-teal-100 bg-teal-50/80 p-3">
                  <p className="text-sm font-semibold text-slate-900">Admin</p>
                  <p className="text-xs text-slate-600">admin@clinic.com</p>
                  <p className="text-xs text-slate-500">password123</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3">
                  <p className="text-sm font-semibold text-slate-900">Doctor</p>
                  <p className="text-xs text-slate-600">doctor@clinic.com</p>
                  <p className="text-xs text-slate-500">password123</p>
                </div>
              </div>
            </div> */}
          </CardContent>
        </Card>
      </div>

      <p className="relative mx-auto mt-6 text-center text-xs text-slate-500">
        © Health One Health Management System. All rights reserved.
      </p>
    </div>
  );
}
