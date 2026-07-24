import type { ClinicType } from './types';

export const DEFAULT_CLINIC_TYPES: ClinicType[] = ['dental'];

export const CLINIC_TYPE_OPTIONS = [
  {
    id: 'dental',
    label: 'Dental',
    description: 'Dental consultations, procedures, charting, inventory, and billing.',
  },
  {
    id: 'family_medical',
    label: 'Family Medical Center',
    description: 'General outpatient care, family medicine visits, and follow-ups.',
  },
  {
    id: 'small_hospital',
    label: 'Small Hospital',
    description: 'Multi-service hospital workflows across doctors, visits, and payments.',
  },
  {
    id: 'eye_clinic',
    label: 'Eye Clinic',
    description: 'Eye-care consultations, optical services, and clinic records.',
  },
] as const satisfies ReadonlyArray<{
  id: ClinicType;
  label: string;
  description: string;
}>;

const CLINIC_TYPE_IDS = new Set<ClinicType>(CLINIC_TYPE_OPTIONS.map((option) => option.id));

export function normalizeClinicTypes(value: unknown): ClinicType[] {
  const rawValues = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const selected = rawValues.filter((item): item is ClinicType =>
    CLINIC_TYPE_IDS.has(String(item) as ClinicType)
  );

  return selected.length > 0 ? Array.from(new Set(selected)) : DEFAULT_CLINIC_TYPES;
}

export function getClinicTypeLabel(value: string) {
  return CLINIC_TYPE_OPTIONS.find((option) => option.id === value)?.label || 'Dental';
}

export function getClinicTypeLabels(value: unknown) {
  return normalizeClinicTypes(value).map(getClinicTypeLabel);
}
