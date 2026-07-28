'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Search } from 'lucide-react';

import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import type { User } from '@/lib/types';

type SubscriptionPayment = {
  id: string;
  hospitalName: string;
  hospitalSlug: string;
  planName: string;
  durationDays: number;
  amount: number;
  currency: string;
  paymentProvider?: 'paystack' | 'manual';
  providerReference: string;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: string | Date | null;
  renewalStartsAt?: string | Date | null;
  renewalEndsAt?: string | Date | null;
  createdAt?: string | Date | null;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'Not set';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not set';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    failed: 'border-red-200 bg-red-50 text-red-700',
  };

  return classes[status] || classes.pending;
}

function providerLabel(provider?: string) {
  if (provider === 'manual') return 'Manual';
  return 'Paystack';
}

function providerValue(provider?: string) {
  return provider === 'manual' ? 'manual' : 'paystack';
}

export default function PlatformPaymentsPage() {
  const [user] = useState<User | null>(() => getCurrentUser());
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(() => {
    const currentUser = getCurrentUser();
    return Boolean(currentUser?.role === 'admin' && currentUser.isSuperAdmin);
  });
  const [error, setError] = useState('');

  const canAccessPlatform = Boolean(user?.role === 'admin' && user.isSuperAdmin);

  const filteredPayments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      const matchesMethod = methodFilter === 'all' || providerValue(payment.paymentProvider) === methodFilter;
      const matchesSearch =
        !search ||
        `${payment.hospitalName} ${payment.hospitalSlug} ${payment.providerReference} ${providerLabel(payment.paymentProvider)}`
          .toLowerCase()
          .includes(search);
      return matchesStatus && matchesMethod && matchesSearch;
    });
  }, [methodFilter, payments, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: payments.length,
      paid: payments.filter((payment) => payment.status === 'paid').length,
      pending: payments.filter((payment) => payment.status === 'pending').length,
      manual: payments.filter((payment) => providerValue(payment.paymentProvider) === 'manual').length,
      paystack: payments.filter((payment) => providerValue(payment.paymentProvider) === 'paystack').length,
      revenue: payments
        .filter((payment) => payment.status === 'paid')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    };
  }, [payments]);

  useEffect(() => {
    const loadPayments = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await ApiClient.getPlatformSubscriptionPayments({ limit: 100, skip: 0 });
        setPayments(response?.payments || response?.data || []);
      } catch (loadError: any) {
        setError(loadError?.message || 'Unable to load subscription payments.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.role === 'admin' && user.isSuperAdmin) {
      void loadPayments();
    }
  }, [user]);

  if (isLoading) {
    return <LoadingState label="Loading subscription payments..." />;
  }

  if (!canAccessPlatform) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Platform Access Required</CardTitle>
            <CardDescription>Sign in with a Health One superadmin account to view payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Subscription Payments</h1>
            <p className="mt-1 text-slate-600">Track Paystack and manual subscription payments.</p>
          </div>
          <Link href="/platform">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Platform
            </Button>
          </Link>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-5">
          {[
            ['Records', summary.total],
            ['Paid', summary.paid],
            ['Manual', summary.manual],
            ['Paystack', summary.paystack],
            ['Revenue', formatNaira(summary.revenue)],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-950">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Records
                </CardTitle>
                <CardDescription>{filteredPayments.length} record{filteredPayments.length === 1 ? '' : 's'}</CardDescription>
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search hospital or reference..."
                    className="pl-9 md:w-72"
                  />
                </div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    <SelectItem value="paystack">Paystack</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                No subscription payments found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                      <th className="py-3 pr-4">Hospital</th>
                      <th className="py-3 pr-4">Plan</th>
                      <th className="py-3 pr-4">Amount</th>
                      <th className="py-3 pr-4">Method</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Reference</th>
                      <th className="py-3 pr-4">Paid At</th>
                      <th className="py-3">Renewal Ends</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-slate-950">{payment.hospitalName}</p>
                          <p className="text-xs text-slate-500">/{payment.hospitalSlug}/dashboard</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-900">{payment.planName}</p>
                          <p className="text-xs text-slate-500">{payment.durationDays} days</p>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-slate-950">{formatNaira(payment.amount)}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {providerLabel(payment.paymentProvider)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-600">{payment.providerReference}</td>
                        <td className="py-3 pr-4 text-slate-600">{formatDate(payment.paidAt)}</td>
                        <td className="py-3 text-slate-600">{formatDate(payment.renewalEndsAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
