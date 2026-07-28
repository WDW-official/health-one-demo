export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  amount: number;
  amountKobo: number;
  currency: 'NGN';
  maxUsers: number;
  features: string[];
  included: string[];
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'clinic',
    name: 'Clinic',
    description: 'For clinics building a better care workflow',
    durationDays: 30,
    amount: 25000,
    amountKobo: 2500000,
    currency: 'NGN',
    maxUsers: 10,
    features: [
      'patients',
      'appointments',
      'consultations',
      'prescriptions',
      'billing',
      'staff_dashboard',
      'cloud_hosting',
      'whatsapp_email_support',
      'workflow_support',
    ],
    included: [
      'Up to 10 users',
      'Unlimited patients',
      'Patient records management',
      'Appointment scheduling',
      'Consultation notes',
      'Prescription records',
      'Billing records',
      'Staff dashboard',
      'Cloud hosting included',
      'WhatsApp/email support',
      'Ongoing support for workflow improvement',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing clinics and multi-staff healthcare teams',
    durationDays: 30,
    amount: 35000,
    amountKobo: 3500000,
    currency: 'NGN',
    maxUsers: 20,
    features: [
      'patients',
      'appointments',
      'consultations',
      'prescriptions',
      'billing',
      'staff_dashboard',
      'cloud_hosting',
      'whatsapp_email_support',
      'workflow_support',
      'department_access',
      'analytics_dashboard',
      'exportable_reports',
      'priority_support',
      'ai_assistant',
      'clinic_insights',
      'constant_consultation',
    ],
    included: [
      '11-20 users',
      'Everything in Clinic',
      'Department access',
      'Analytics dashboard',
      'Exportable reports',
      'Priority support',
      "AI Doctor's assistant",
      'Clinic insights',
      'Constant consultation and access',
    ],
  },
];

export function getSubscriptionPlan(planId: string) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || null;
}
