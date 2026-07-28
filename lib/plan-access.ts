import { getSubscriptionPlan, SUBSCRIPTION_PLANS } from './subscription-plans';

export const FEATURE_KEYS = {
  exportableReports: 'exportable_reports',
  aiAssistant: 'ai_assistant',
} as const;

const DEFAULT_PLAN_ID = 'clinic';

export function getHospitalPlan(hospital: any) {
  return getSubscriptionPlan(String(hospital?.subscriptionPlan || '')) || getSubscriptionPlan(DEFAULT_PLAN_ID);
}

export function getHospitalEnabledFeatures(hospital: any) {
  const configuredFeatures = hospital?.settings?.enabledFeatures;
  if (Array.isArray(configuredFeatures) && configuredFeatures.length > 0) {
    return configuredFeatures.map(String);
  }

  return getHospitalPlan(hospital)?.features || [];
}

export function hasHospitalFeature(hospital: any, feature: string) {
  return getHospitalEnabledFeatures(hospital).includes(feature);
}

export function getHospitalMaxUsers(hospital: any) {
  const configuredLimit = Number(hospital?.settings?.planLimits?.maxUsers);
  if (Number.isFinite(configuredLimit) && configuredLimit > 0) return configuredLimit;

  return getHospitalPlan(hospital)?.maxUsers || SUBSCRIPTION_PLANS[0]?.maxUsers || 10;
}

export function getPlanSettings(planId: string) {
  const plan = getSubscriptionPlan(planId) || getSubscriptionPlan(DEFAULT_PLAN_ID);

  return {
    planLimits: {
      maxUsers: plan?.maxUsers || 10,
    },
    enabledFeatures: plan?.features || [],
  };
}
