'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';

import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { getSubscriptionLifecycle } from '@/lib/subscription-lifecycle';
import { withHospitalDashboardPath } from '@/lib/tenant-routing';
import type { Hospital } from '@/lib/types';

type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  amount: number;
  amountKobo: number;
  currency: string;
  maxUsers: number;
  included: string[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(value?: Date | string | null) {
  if (!value) return 'Not set';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not set';
  return date.toLocaleDateString();
}

export default function HospitalSubscriptionBillingPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const currentUser = getCurrentUser();

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [settingsResponse, plansResponse] = await Promise.all([
          ApiClient.getHospitalSettings(),
          ApiClient.getSubscriptionPlans(),
        ]);
        if (!mounted) return;

        const nextHospital = settingsResponse?.hospital || settingsResponse?.data || null;
        const nextPlans = plansResponse?.plans || [];
        setHospital(nextHospital);
        setPlans(nextPlans);
        setSelectedPlanId(nextPlans[0]?.id || '');
      } catch (loadError: any) {
        if (!mounted) return;
        setError(loadError?.message || 'Unable to load subscription billing.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!reference) return;

    const verifyPayment = async () => {
      setIsVerifying(true);
      setError('');
      setMessage('');

      try {
        await ApiClient.verifySubscriptionPayment(reference);
        const settingsResponse = await ApiClient.getHospitalSettings();
        setHospital(settingsResponse?.hospital || settingsResponse?.data || null);
        setMessage('Payment confirmed. Subscription renewed successfully.');
      } catch (verifyError: any) {
        setError(verifyError?.message || 'Unable to verify subscription payment.');
      } finally {
        setIsVerifying(false);
      }
    };

    void verifyPayment();
  }, [reference]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );
  const lifecycle = hospital ? getSubscriptionLifecycle(hospital) : null;

  const startPayment = async () => {
    if (!selectedPlan) return;

    setIsStartingPayment(true);
    setError('');
    setMessage('');

    try {
      const response = await ApiClient.initializeSubscriptionPayment({ planId: selectedPlan.id });
      if (!response?.authorizationUrl) {
        throw new Error('Paystack did not return a payment URL.');
      }
      window.location.href = response.authorizationUrl;
    } catch (paymentError: any) {
      setError(paymentError?.message || 'Unable to start Paystack payment.');
      setIsStartingPayment(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading subscription billing..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Subscription Billing</h1>
          <p className="mt-1 text-slate-600">Renew hospital access with Paystack.</p>
        </div>
        <Link href={withHospitalDashboardPath('/dashboard/settings', currentUser)}>
          <Button variant="outline">Back to Settings</Button>
        </Link>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isVerifying && <LoadingState label="Verifying Paystack payment..." />}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Select Renewal Plan</CardTitle>
            <CardDescription>Payment will renew the subscription automatically after Paystack confirms it.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-100'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-950">{plan.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{plan.description}</span>
                  <span className="mt-4 block text-2xl font-bold text-slate-950">{formatNaira(plan.amount)}</span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">per month</span>
                  <span className="mt-3 block text-sm font-semibold text-slate-800">
                    Up to {plan.maxUsers} users
                  </span>
                  <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    What&apos;s included
                  </span>
                  <span className="mt-2 block space-y-1">
                    {(plan.included || []).slice(0, 6).map((item) => (
                      <span key={item} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </span>
                    ))}
                    {(plan.included || []).length > 6 && (
                      <span className="block text-xs font-medium text-slate-500">
                        +{plan.included.length - 6} more
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-700" />
              Renewal Summary
            </CardTitle>
            <CardDescription>{hospital?.name || 'Hospital workspace'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold capitalize text-slate-950">
                  {hospital?.subscriptionStatus?.replace('_', ' ') || 'Unknown'}
                </span>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-slate-500">Current expiry</span>
                <span className="font-semibold text-slate-950">{formatDate(lifecycle?.expiry)}</span>
              </div>
              {lifecycle?.status === 'past_due' && lifecycle.graceDaysRemaining !== null && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  Suspends in {lifecycle.graceDaysRemaining} day{lifecycle.graceDaysRemaining === 1 ? '' : 's'}.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Selected plan</p>
              <p className="mt-1 font-semibold text-slate-950">{selectedPlan?.name || 'No plan selected'}</p>
              {selectedPlan && (
                <p className="mt-1 text-sm text-slate-500">
                  {selectedPlan.maxUsers} users included
                </p>
              )}
              <p className="mt-3 text-2xl font-bold text-slate-950">
                {selectedPlan ? formatNaira(selectedPlan.amount) : formatNaira(0)}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">Monthly renewal</p>
            </div>

            <Button
              type="button"
              onClick={startPayment}
              disabled={!selectedPlan || isStartingPayment || isVerifying}
              className="w-full"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isStartingPayment ? 'Opening Paystack...' : 'Pay with Paystack'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
