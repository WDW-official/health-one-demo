'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Palette, Save, Upload } from 'lucide-react';

import { BrandMark } from '@/components/brand-mark';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiClient } from '@/lib/api-client';
import { CLINIC_TYPE_OPTIONS, normalizeClinicTypes } from '@/lib/clinic-config';
import type { ClinicType, Hospital } from '@/lib/types';

const DEFAULT_BRAND_COLOR = '#275cc2';
const DEFAULT_LOGO_SIZE = 48;
const SUGGESTED_COLORS = [
  { name: 'Health Blue', value: '#275cc2' },
  { name: 'Clinical Teal', value: '#0f766e' },
  { name: 'Care Green', value: '#15803d' },
  { name: 'Calm Sky', value: '#0369a1' },
  { name: 'Royal Indigo', value: '#4338ca' },
  { name: 'Warm Rose', value: '#be123c' },
  { name: 'Slate Pro', value: '#334155' },
  { name: 'Emerald', value: '#047857' },
];

type SettingsForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  clinicTypes: ClinicType[];
  logoUrl: string;
  brandColor: string;
  logoSize: number;
};

function getLogoSize(hospital?: Hospital | null) {
  const logoSize = Number(hospital?.settings?.branding?.logoSize);
  if (!Number.isFinite(logoSize)) return DEFAULT_LOGO_SIZE;
  return Math.min(Math.max(Math.round(logoSize), 32), 96);
}

function toForm(hospital?: Hospital | null): SettingsForm {
  return {
    name: hospital?.name || '',
    phone: hospital?.phone || '',
    email: hospital?.email || '',
    address: hospital?.address || '',
    clinicTypes: normalizeClinicTypes(hospital?.clinicTypes),
    logoUrl: hospital?.logoUrl || '',
    brandColor: hospital?.brandColor || DEFAULT_BRAND_COLOR,
    logoSize: getLogoSize(hospital),
  };
}

export default function SettingsPage() {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [form, setForm] = useState<SettingsForm>(() => toForm(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const isDemoSettings = hospital?.id === 'demo';

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await ApiClient.getHospitalSettings();
        const nextHospital = response?.hospital || response?.data || ApiClient.getDemoHospitalSettings();
        if (!mounted) return;
        setHospital(nextHospital);
        setForm(toForm(nextHospital));
      } catch (loadError: any) {
        if (!mounted) return;
        setError(loadError?.message || 'Unable to load hospital settings.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const logoPreviewSrc = useMemo(() => form.logoUrl.trim() || '/icon.png', [form.logoUrl]);

  const updateForm = (key: keyof SettingsForm, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccess('');
    setError('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSuccess('');
    setError('');

    try {
      if (isDemoSettings) {
        const nextHospital = ApiClient.setDemoHospitalSettings({
          address: form.address,
          logoUrl: form.logoUrl,
          brandColor: form.brandColor,
          settings: {
            branding: {
              logoSize: form.logoSize,
            },
          },
        });
        setHospital(nextHospital as Hospital);
        setForm(toForm(nextHospital as Hospital));
        setSuccess('Demo settings saved. Reloading...');
        window.setTimeout(() => {
          window.location.reload();
        }, 600);
        return;
      }

      const response = await ApiClient.updateHospitalSettings({
        address: form.address,
        logoUrl: form.logoUrl,
        brandColor: form.brandColor,
        settings: {
          branding: {
            logoSize: form.logoSize,
          },
        },
      });
      const nextHospital = response?.hospital || response?.data || null;
      setHospital(nextHospital);
      setForm(toForm(nextHospital));
      setSuccess('Settings saved successfully. Reloading...');
      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to save hospital settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setSuccess('');
    setError('');

    try {
      if (isDemoSettings) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Could not read logo file.'));
          reader.readAsDataURL(file);
        });
        updateForm('logoUrl', dataUrl);
        setSuccess('Demo logo uploaded. Save changes to preview it across the demo dashboard.');
        return;
      }

      const response = await ApiClient.uploadHospitalLogo(file);
      updateForm('logoUrl', response.url);
      setSuccess('Logo uploaded. Save changes to apply it to this hospital.');
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Unable to upload logo.');
    } finally {
      setIsUploadingLogo(false);
      event.target.value = '';
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading settings..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-600">Manage clinic details and hospital branding.</p>
        </div>
        {hospital && (
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            /{hospital.slug}/dashboard
          </div>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Clinic Information</CardTitle>
            <CardDescription>Clinic identity is managed by Health One.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Clinic Name</label>
              <Input
                value={form.name}
                placeholder="Clinic name"
                disabled
                className="bg-slate-50 text-slate-600 disabled:cursor-not-allowed disabled:opacity-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  value={form.phone}
                  placeholder="Phone number"
                  disabled
                  className="bg-slate-50 text-slate-600 disabled:cursor-not-allowed disabled:opacity-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={form.email}
                  placeholder="info@clinic.com"
                  disabled
                  className="bg-slate-50 text-slate-600 disabled:cursor-not-allowed disabled:opacity-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Address</label>
              <Input
                value={form.address}
                onChange={(event) => updateForm('address', event.target.value)}
                placeholder="Clinic address"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Assigned Clinic Types</p>
              <p className="mt-1 text-sm text-slate-500">
                These service profiles are assigned by Health One from the platform dashboard.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CLINIC_TYPE_OPTIONS.map((option) => {
                  const isSelected = form.clinicTypes.includes(option.id);
                  if (!isSelected) return null;

                  return (
                    <span
                      key={option.id}
                      className="rounded-full border border-teal-100 bg-white px-3 py-1.5 text-sm font-semibold text-teal-700"
                    >
                      {option.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>Control the color and logo shown for this hospital.</CardDescription>
          </CardHeader>
        <CardContent className="space-y-5">
            {/* {isDemoSettings && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Demo mode saves these branding changes in this browser only, so you can show the customization feature without a hospital workspace.
              </div>
            )} */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                <BrandMark
                  src={logoPreviewSrc}
                  alt={form.name || 'Hospital logo'}
                  className="shadow-sm"
                  imageClassName="p-1.5"
                  style={{ width: form.logoSize, height: form.logoSize }}
                />
                <div>
                  <p className="font-semibold text-slate-950">{form.name || 'Hospital name'}</p>
                  <p className="text-sm text-slate-500" style={{ color: form.brandColor }}>
                    Brand preview
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Logo</label>
              <div className="grid gap-2">
                <Input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo || isSaving}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingLogo}
                  className="justify-start"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploadingLogo ? 'Uploading logo...' : 'Upload Logo'}
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Logo URL</label>
              <Input
                value={form.logoUrl}
                onChange={(event) => updateForm('logoUrl', event.target.value)}
                placeholder="/clinic-logo.png"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Brand Color</label>
              <div className="mb-3 grid grid-cols-4 gap-2">
                {SUGGESTED_COLORS.map((color) => {
                  const isSelected = form.brandColor.toLowerCase() === color.value.toLowerCase();

                  return (
                    <button
                      key={color.value}
                      type="button"
                      title={color.name}
                      aria-label={color.name}
                      onClick={() => updateForm('brandColor', color.value)}
                      className={`h-10 rounded-lg border transition ${
                        isSelected
                          ? 'border-slate-950 ring-2 ring-slate-300'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.brandColor}
                  onChange={(event) => updateForm('brandColor', event.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={form.brandColor}
                  onChange={(event) => updateForm('brandColor', event.target.value)}
                  placeholder="#275cc2"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="text-sm font-medium">Logo Size</label>
                <span className="text-sm text-slate-500">{form.logoSize}px</span>
              </div>
              <Input
                type="range"
                min="32"
                max="96"
                value={form.logoSize}
                onChange={(event) => updateForm('logoSize', Number(event.target.value))}
              />
            </div>

            <Button type="submit" disabled={isSaving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
