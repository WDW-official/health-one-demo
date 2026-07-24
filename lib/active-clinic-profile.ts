import { DEFAULT_CLINIC_TYPES, normalizeClinicTypes } from './clinic-config';
import type { ClinicType } from './types';

const ACTIVE_CLINIC_PROFILE_KEY = 'healthone_active_clinic_profile';

function buildStorageKey(hospitalKey?: string | null) {
  return `${ACTIVE_CLINIC_PROFILE_KEY}:${hospitalKey || 'demo'}`;
}

export function getActiveClinicProfile(
  availableClinicTypes: unknown,
  hospitalKey?: string | null
): ClinicType {
  const clinicTypes = normalizeClinicTypes(availableClinicTypes);

  if (typeof window === 'undefined') {
    return clinicTypes[0] || DEFAULT_CLINIC_TYPES[0];
  }

  const stored = window.localStorage.getItem(buildStorageKey(hospitalKey));
  if (stored && clinicTypes.includes(stored as ClinicType)) {
    return stored as ClinicType;
  }

  return clinicTypes[0] || DEFAULT_CLINIC_TYPES[0];
}

export function setActiveClinicProfile(
  clinicType: ClinicType,
  availableClinicTypes: unknown,
  hospitalKey?: string | null
) {
  const clinicTypes = normalizeClinicTypes(availableClinicTypes);
  const nextClinicType = clinicTypes.includes(clinicType) ? clinicType : clinicTypes[0];

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(buildStorageKey(hospitalKey), nextClinicType);
    window.dispatchEvent(
      new CustomEvent('healthone:active-clinic-profile-change', {
        detail: { clinicType: nextClinicType, hospitalKey: hospitalKey || 'demo' },
      })
    );
  }

  return nextClinicType;
}
