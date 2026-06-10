'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { AuthLogo } from '@/components/auth-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ApiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const result = await ApiClient.forgotPassword(email);
      setMessage(result?.message || 'If that email exists, a password reset link has been sent.');
    } catch (err: any) {
      setError(err.message || 'Unable to send reset email right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="section-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,199,184,0.28),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(53,92,155,0.18),transparent_24%)]" />
      <div className="relative mx-auto flex w-full max-w-md items-center justify-center">
        <Card className="glass-panel w-full border-white/60 shadow-none">
          <CardHeader className="space-y-2 pb-6">
            <AuthLogo />
            <CardTitle className="text-2xl text-slate-950">Forgot password</CardTitle>
            <CardDescription className="text-slate-600">
              Enter your clinic account email and we will send a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <span>{message}</span>
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
                  onChange={(event) => setEmail(event.target.value)}
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
                    <span className="sr-only">Sending reset link</span>
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>

            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline"
            >
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>

      <p className="relative mx-auto mt-6 text-center text-xs text-slate-500">
        © Health One Health Management System. All rights reserved.
      </p>
    </div>
  );
}
