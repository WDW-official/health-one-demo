'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Clock, ExternalLink, Plus, Save, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import {
  CLINIC_TYPE_OPTIONS,
  DEFAULT_CLINIC_TYPES,
  getClinicTypeLabels,
  normalizeClinicTypes,
} from '@/lib/clinic-config';
import { slugifyHospitalName } from '@/lib/tenant-routing';
import type { ClinicType, Hospital, HospitalSubscriptionStatus, User } from '@/lib/types';

type HospitalForm = {
  name: string;
  slug: string;
  clinicTypes: ClinicType[];
  email: string;
  phone: string;
  subscriptionStatus: HospitalSubscriptionStatus;
  trialDays: string;
  subscriptionDays: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

const emptyForm: HospitalForm = {
  name: '',
  slug: '',
  clinicTypes: DEFAULT_CLINIC_TYPES,
  email: '',
  phone: '',
  subscriptionStatus: 'trial',
  trialDays: '14',
  subscriptionDays: '30',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

type SubscriptionDraft = {
  subscriptionStatus: HospitalSubscriptionStatus;
  clinicTypes: ClinicType[];
  trialDays: string;
  subscriptionDays: string;
};

const TRIAL_DAY_OPTIONS = [
  { label: '7 days', value: '7' },
  { label: '14 days', value: '14' },
  { label: '21 days', value: '21' },
  { label: '30 days', value: '30' },
];

const SUBSCRIPTION_DAY_OPTIONS = [
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '180 days', value: '180' },
  { label: '365 days', value: '365' },
];

function statusClass(status: string) {
  const classes: Record<string, string> = {
    trial: 'border-blue-200 bg-blue-50 text-blue-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    past_due: 'border-amber-200 bg-amber-50 text-amber-700',
    suspended: 'border-rose-200 bg-rose-50 text-rose-700',
    cancelled: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return classes[status] || classes.trial;
}

function getExpiryDate(hospital: Hospital) {
  if (hospital.subscriptionStatus === 'trial') return hospital.trialEndsAt;
  if (hospital.subscriptionStatus === 'active') return hospital.currentPeriodEndsAt;
  return hospital.currentPeriodEndsAt || hospital.trialEndsAt;
}

function getDaysRemaining(date?: Date | string | null) {
  if (!date) return null;
  const expiresAt = new Date(date).getTime();
  if (!Number.isFinite(expiresAt)) return null;
  return Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
}

function expiryLabel(hospital: Hospital) {
  const expiry = getExpiryDate(hospital);
  const days = getDaysRemaining(expiry);
  if (days === null) return 'No expiry date set';
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Expires today';
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}

function buildSubscriptionDraft(hospital: Hospital): SubscriptionDraft {
  return {
    subscriptionStatus: hospital.subscriptionStatus || 'trial',
    clinicTypes: normalizeClinicTypes(hospital.clinicTypes),
    trialDays: '',
    subscriptionDays: '',
  };
}

function getDurationInput(status: HospitalSubscriptionStatus) {
  if (status === 'trial') {
    return {
      key: 'trialDays' as const,
      placeholder: 'Select trial days',
      options: TRIAL_DAY_OPTIONS,
    };
  }

  if (status === 'active') {
    return {
      key: 'subscriptionDays' as const,
      placeholder: 'Select subscription days',
      options: SUBSCRIPTION_DAY_OPTIONS,
    };
  }

  return null;
}

export default function PlatformDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<HospitalForm>(emptyForm);
  const [subscriptionDrafts, setSubscriptionDrafts] = useState<Record<string, SubscriptionDraft>>({});
  const [savingHospitalId, setSavingHospitalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const canAccessPlatform = Boolean(user?.role === 'admin' && user.isSuperAdmin);

  const filteredHospitals = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return hospitals;
    return hospitals.filter((hospital) =>
      `${hospital.name} ${hospital.slug} ${hospital.email || ''}`.toLowerCase().includes(search)
    );
  }, [hospitals, searchTerm]);

  const summary = useMemo(() => {
    return {
      total: hospitals.length,
      active: hospitals.filter((hospital) => hospital.subscriptionStatus === 'active').length,
      trial: hospitals.filter((hospital) => hospital.subscriptionStatus === 'trial').length,
      attention: hospitals.filter((hospital) =>
        ['past_due', 'suspended'].includes(hospital.subscriptionStatus)
      ).length,
    };
  }, [hospitals]);

  const fetchHospitals = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await ApiClient.getPlatformHospitals({ limit: 100, skip: 0 });
      const list = response?.data || response?.hospitals || [];
      setHospitals(list);
      setSubscriptionDrafts(
        list.reduce((drafts: Record<string, SubscriptionDraft>, hospital: Hospital) => {
          drafts[hospital.id] = buildSubscriptionDraft(hospital);
          return drafts;
        }, {})
      );
    } catch (loadError) {
      console.error('Failed to load hospitals:', loadError);
      setError('Unable to load hospitals.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFormClinicType = (clinicType: ClinicType) => {
    setForm((current) => {
      const nextClinicTypes = current.clinicTypes.includes(clinicType)
        ? current.clinicTypes.filter((item) => item !== clinicType)
        : [...current.clinicTypes, clinicType];

      return {
        ...current,
        clinicTypes: nextClinicTypes.length > 0 ? nextClinicTypes : DEFAULT_CLINIC_TYPES,
      };
    });
  };

  useEffect(() => {
    queueMicrotask(() => {
      ApiClient.setActiveHospital(null);
      setUser(getCurrentUser());
      setHasMounted(true);
    });
  }, []);

  useEffect(() => {
    if (hasMounted && canAccessPlatform) {
      queueMicrotask(() => {
        void fetchHospitals();
      });
    }
  }, [hasMounted, canAccessPlatform]);

  const updateForm = (key: keyof HospitalForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      slug:
        key === 'slug'
          ? value
          : key === 'name' && !current.slug
            ? slugifyHospitalName(value)
            : current.slug,
    }));
  };

  const handleCreateHospital = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const durationInput = getDurationInput(form.subscriptionStatus);
      await ApiClient.createPlatformHospital({
        name: form.name,
        slug: form.slug,
        clinicTypes: form.clinicTypes,
        email: form.email,
        phone: form.phone,
        subscriptionPlan: form.subscriptionStatus,
        subscriptionStatus: form.subscriptionStatus,
        trialDays: durationInput?.key === 'trialDays' ? Number(form.trialDays) || undefined : undefined,
        subscriptionDays:
          durationInput?.key === 'subscriptionDays' ? Number(form.subscriptionDays) || undefined : undefined,
        adminName: form.adminName || undefined,
        adminEmail: form.adminEmail || undefined,
        adminPassword: form.adminPassword || undefined,
      });
      setForm(emptyForm);
      await fetchHospitals();
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to onboard hospital.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSubscriptionDraft = (
    hospitalId: string,
    key: keyof SubscriptionDraft,
    value: string
  ) => {
    setSubscriptionDrafts((current) => {
      const currentDraft = current[hospitalId] || {
        subscriptionStatus: 'trial',
        clinicTypes: DEFAULT_CLINIC_TYPES,
        trialDays: '',
        subscriptionDays: '',
      };

      return {
        ...current,
        [hospitalId]: {
          ...currentDraft,
          [key]: value,
        },
      };
    });
  };

  const toggleDraftClinicType = (hospital: Hospital, clinicType: ClinicType) => {
    setSubscriptionDrafts((current) => {
      const currentDraft = current[hospital.id] || buildSubscriptionDraft(hospital);
      const nextClinicTypes = currentDraft.clinicTypes.includes(clinicType)
        ? currentDraft.clinicTypes.filter((item) => item !== clinicType)
        : [...currentDraft.clinicTypes, clinicType];

      return {
        ...current,
        [hospital.id]: {
          ...currentDraft,
          clinicTypes: nextClinicTypes.length > 0 ? nextClinicTypes : DEFAULT_CLINIC_TYPES,
        },
      };
    });
  };

  const handleUpdateSubscription = async (hospital: Hospital) => {
    const draft = subscriptionDrafts[hospital.id];
    if (!draft) return;

    setSavingHospitalId(hospital.id);
    setError('');

    try {
      const durationInput = getDurationInput(draft.subscriptionStatus);
      const response = await ApiClient.updatePlatformHospital(hospital.id, {
        subscriptionPlan: draft.subscriptionStatus,
        subscriptionStatus: draft.subscriptionStatus,
        clinicTypes: draft.clinicTypes,
        trialDays: durationInput?.key === 'trialDays' ? Number(draft.trialDays) || undefined : undefined,
        subscriptionDays:
          durationInput?.key === 'subscriptionDays' ? Number(draft.subscriptionDays) || undefined : undefined,
      });
      const updatedHospital = response?.hospital || response?.data;
      if (updatedHospital) {
        setHospitals((current) =>
          current.map((item) => (item.id === hospital.id ? updatedHospital : item))
        );
        setSubscriptionDrafts((current) => ({
          ...current,
          [hospital.id]: {
            subscriptionStatus: updatedHospital.subscriptionStatus || 'trial',
            clinicTypes: normalizeClinicTypes(updatedHospital.clinicTypes),
            trialDays: '',
            subscriptionDays: '',
          },
        }));
      }
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to update hospital subscription.');
    } finally {
      setSavingHospitalId(null);
    }
  };

  if (!hasMounted) {
    return null;
  }

  if (!canAccessPlatform) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Platform Access Required</CardTitle>
            <CardDescription>
              Sign in with a Health One superadmin account to manage hospitals.
            </CardDescription>
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
            <h1 className="text-3xl font-bold text-slate-950">Health One Platform</h1>
            <p className="mt-1 text-slate-600">Onboard hospitals and monitor subscription status.</p>
          </div>
          <Link href="/dashboard" onClick={() => ApiClient.setActiveHospital(null)}>
            <Button variant="outline">Open Demo Dashboard</Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Hospitals', summary.total],
            ['Active', summary.active],
            ['Trial', summary.trial],
            ['Needs Attention', summary.attention],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-950">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Onboard Hospital
              </CardTitle>
              <CardDescription>Create a hospital workspace and optional first admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateHospital} className="space-y-3">
                <Input
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Hospital name"
                  required
                />
                <Input
                  value={form.slug}
                  onChange={(event) => updateForm('slug', slugifyHospitalName(event.target.value))}
                  placeholder="hospital-url-name"
                  required
                />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  placeholder="Hospital email"
                />
                <Input
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                  placeholder="Phone"
                />
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">Clinic Types</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Select every service profile this hospital should support.
                  </p>
                  <div className="mt-3 grid gap-2">
                    {CLINIC_TYPE_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer gap-3 rounded-md border border-white bg-white p-3 text-sm shadow-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.clinicTypes.includes(option.id)}
                          onChange={() => toggleFormClinicType(option.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                        <span>
                          <span className="block font-semibold text-slate-800">{option.label}</span>
                          <span className="block text-xs text-slate-500">{option.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <Select
                  value={form.subscriptionStatus}
                  onValueChange={(value) => updateForm('subscriptionStatus', value as HospitalSubscriptionStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subscription status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {(() => {
                  const durationInput = getDurationInput(form.subscriptionStatus);
                  if (!durationInput) return null;

                  return (
                    <Select
                      value={form[durationInput.key] || 'unset'}
                      onValueChange={(value) => updateForm(durationInput.key, value === 'unset' ? '' : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={durationInput.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="unset">{durationInput.placeholder}</SelectItem>
                      {durationInput.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
                <div className="border-t pt-3">
                  <p className="mb-2 text-sm font-semibold text-slate-700">First Hospital Admin</p>
                  <div className="space-y-3">
                    <Input
                      value={form.adminName}
                      onChange={(event) => updateForm('adminName', event.target.value)}
                      placeholder="Admin name"
                    />
                    <Input
                      type="email"
                      value={form.adminEmail}
                      onChange={(event) => updateForm('adminEmail', event.target.value)}
                      placeholder="Admin email"
                    />
                    <Input
                      type="password"
                      value={form.adminPassword}
                      onChange={(event) => updateForm('adminPassword', event.target.value)}
                      placeholder="Temporary password"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <Button type="submit" disabled={isSaving} className="w-full">
                  {isSaving ? 'Creating...' : 'Create Hospital'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Hospitals</CardTitle>
                  <CardDescription>{filteredHospitals.length} workspace{filteredHospitals.length === 1 ? '' : 's'}</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search hospitals..."
                    className="pl-9 md:w-72"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading hospitals...</div>
              ) : filteredHospitals.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                  No hospitals found.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredHospitals.map((hospital) => (
                    <div key={hospital.id} className="flex flex-col gap-4 rounded-lg border bg-white p-4">
                      <div className="min-w-0">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-500" />
                              <p className="truncate font-semibold text-slate-950">{hospital.name}</p>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">/{hospital.slug}/dashboard</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {getClinicTypeLabels(hospital.clinicTypes).map((label) => (
                                <span
                                  key={`${hospital.id}-${label}`}
                                  className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(hospital.subscriptionStatus)}`}>
                              {hospital.subscriptionStatus.replace('_', ' ')}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                              <Clock className="h-3.5 w-3.5" />
                              {expiryLabel(hospital)}
                            </span>
                            <Link
                              href={`/${hospital.slug}/dashboard`}
                              onClick={() => ApiClient.setActiveHospital({ id: hospital.id, slug: hospital.slug })}
                            >
                              <Button variant="outline" size="sm">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-800">Clinic Types</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {CLINIC_TYPE_OPTIONS.map((option) => {
                            const draft = subscriptionDrafts[hospital.id] || buildSubscriptionDraft(hospital);
                            const isSelected = draft.clinicTypes.includes(option.id);

                            return (
                              <label
                                key={`${hospital.id}-${option.id}`}
                                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                                  isSelected
                                    ? 'border-teal-200 bg-white text-teal-800'
                                    : 'border-slate-200 bg-white text-slate-600'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleDraftClinicType(hospital, option.id)}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                <span className="font-medium">{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[150px_150px_auto] md:items-center">
                        {(() => {
                          const draft = subscriptionDrafts[hospital.id] || buildSubscriptionDraft(hospital);
                          const durationInput = getDurationInput(draft.subscriptionStatus);

                          return (
                            <>
                        <Select
                          value={subscriptionDrafts[hospital.id]?.subscriptionStatus || hospital.subscriptionStatus}
                          onValueChange={(value) =>
                            updateSubscriptionDraft(
                              hospital.id,
                              'subscriptionStatus',
                              value as HospitalSubscriptionStatus
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="past_due">Past due</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        {durationInput ? (
                          <Select
                            value={draft[durationInput.key] || 'unset'}
                            onValueChange={(value) =>
                              updateSubscriptionDraft(
                                hospital.id,
                                durationInput.key,
                                value === 'unset' ? '' : value
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={durationInput.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="unset">{durationInput.placeholder}</SelectItem>
                            {durationInput.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="hidden md:block" />
                        )}
                        <Button
                          type="button"
                          size="sm"
                          disabled={savingHospitalId === hospital.id}
                          onClick={() => handleUpdateSubscription(hospital)}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {savingHospitalId === hospital.id ? 'Saving...' : 'Save'}
                        </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
