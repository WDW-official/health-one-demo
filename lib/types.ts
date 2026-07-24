// User roles
import type { ProcedureType } from './procedure-types';
import type { ConsultationProcedure } from './procedure-types';

export type UserRole = 'admin' | 'doctor';

export type HospitalSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type ClinicType = 'dental' | 'family_medical' | 'small_hospital' | 'eye_clinic';

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  clinicTypes: ClinicType[];
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  brandColor?: string;
  subscriptionPlan: string;
  subscriptionStatus: HospitalSubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodEndsAt?: Date | null;
  isActive: boolean;
  settings?: {
    billing?: Record<string, unknown>;
    consultation?: Record<string, unknown>;
    inventory?: Record<string, unknown>;
    notifications?: Record<string, unknown>;
    branding?: {
      logoSize?: number;
      [key: string]: unknown;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// User authentication
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  hospitalId?: string | null;
  hospitalSlug?: string | null;
  doctorId?: string; // Reference to Doctor if role is 'doctor'
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt: Date;
}

// Doctor information
export interface Doctor {
  id: string;
  hospitalId?: string | null;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  availableSlots: string[]; // Time slots like "09:00", "09:30", etc
  workingDays: string[]; // Days like "Monday", "Tuesday", etc
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatMessage {
  id: string;
  hospitalId?: string | null;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ChatUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  hospitalId?: string | null;
  hospitalSlug?: string | null;
  doctorId?: string;
  unreadCount?: number;
  latestMessage?: string;
  latestAt?: Date;
}

// Patient information
export interface Patient {
  id: string;
  hospitalId?: string | null;
  mrn?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  familyStatus?: 'individual' | 'family';
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
  notes?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Appointment scheduling
export interface Appointment {
  id: string;
  hospitalId?: string | null;
  appointmentNumber?: string;
  patientId: string;
  doctorId: string;
  patientName?: string; // Cached for display
  doctorName?: string; // Cached for display
  dateTime: Date;
  duration: number; // in minutes
  type: ProcedureType;
  status: 'scheduled' | 'completed' | 'cancelled' | 'noshow';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ConsultationPaymentStatus = 'paid' | 'unpaid' | 'partially_paid' | 'hmo_pending';
export type BillingPaymentStatus =
  | 'Pending Billing'
  | 'Pending Payment'
  | 'Part Paid'
  | 'Paid'
  | 'HMO Pending'
  | 'HMO Approved'
  | 'HMO Paid'
  | 'Cancelled'
  | 'Refunded'
  | 'Outstanding';
export type PaymentStatus = ConsultationPaymentStatus | BillingPaymentStatus;

export type PaymentMethod =
  | 'Cash'
  | 'Bank transfer'
  | 'POS/card'
  | 'HMO'
  | 'Part cash / part HMO'
  | 'Part payment'
  | 'Outstanding balance'
  | 'Other';

export type HmoClaimStatus =
  | 'Not Applicable'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Submitted'
  | 'Awaiting Payment'
  | 'Paid'
  | 'Part Paid'
  | 'Disputed';

export interface BillingItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface BillingPayment {
  id?: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  receiptNumber: string;
  recordedByUserId?: string;
  recordedByName?: string;
  paidAt: Date;
  notes?: string;
}

export interface Billing {
  id: string;
  hospitalId?: string | null;
  invoiceNumber: string;
  clinicName: string;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  consultationId: string;
  doctorId: string;
  doctorName?: string;
  consultationDate: Date;
  items: BillingItem[];
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: BillingPaymentStatus;
  payments: BillingPayment[];
  hmoProvider?: string;
  hmoPlan?: string;
  hmoApprovalCode?: string;
  hmoApprovalStatus?: string;
  hmoAmountCovered: number;
  hmoPatientAmount: number;
  hmoOutstandingAmount: number;
  hmoClaimSubmissionDate?: Date;
  hmoClaimPaymentDate?: Date;
  hmoClaimStatus: HmoClaimStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CheckInStatus = 'waiting' | 'with_doctor' | 'completed' | 'cancelled';

export interface CheckIn {
  id: string;
  hospitalId?: string | null;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  appointmentNumber?: string;
  checkedInByUserId: string;
  checkedInByName: string;
  checkedInAt: Date;
  status: CheckInStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Consultation records
export interface Consultation {
  id: string;
  hospitalId?: string | null;
  clinicType?: ClinicType;
  specialtyFields?: ConsultationSpecialtyFields;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  patientName?: string;
  doctorName?: string;
  presentingComplaints?: string;
  examination?: string;
  diagnosis: string;
  treatmentPlan?: string;
  clinicalNotes?: ConsultationClinicalNote[];
  procedures?: ConsultationProcedure[];
  estimatedConsumables?: ConsultationConsumableUsage[];
  actualConsumables?: ConsultationConsumableUsage[];
  consumablesDeductedAt?: Date;
  treatment: string;
  prescription: string;
  paymentAmount?: number;
  paymentStatus?: ConsultationPaymentStatus;
  nextVisitDate?: Date;
  notes: string;
  chartBlocks?: ConsultationChartBlock[];
  attachments?: ConsultationAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsultationClinicalNote {
  enteredAt: Date;
  enteredByUserId?: string;
  enteredByName?: string;
  clinicType?: ClinicType;
  specialtyFields?: ConsultationSpecialtyFields;
  presentingComplaints?: string;
  impressionDiagnosis?: string;
  treatmentPlan?: string;
  notes?: string;
}

export interface ConsultationSpecialtyFields {
  eyeClinic?: {
    visualAcuityRight?: string;
    visualAcuityLeft?: string;
    intraocularPressureRight?: string;
    intraocularPressureLeft?: string;
    refractionRight?: string;
    refractionLeft?: string;
    anteriorSegment?: string;
    posteriorSegment?: string;
    eyeDiagnosis?: string;
    recommendations?: string;
  };
  familyMedical?: {
    bloodPressure?: string;
    temperature?: string;
    pulse?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
    height?: string;
    systemicReview?: string;
    assessment?: string;
    medicalPlan?: string;
  };
}

export interface ConsultationConsumableUsage {
  name: string;
  quantity: number;
  unit: string;
  procedure?: string;
  category?: string;
  source?: 'standard' | 'actual';
  inventoryItemId?: string;
  availableQuantity?: number;
  hasSufficientStock?: boolean;
  notes?: string;
}

export interface ConsultationChartBlock {
  upperLeft: string;
  upperRight: string;
  lowerLeft: string;
  lowerRight: string;
}

export interface ConsultationAttachment {
  url: string;
  publicId?: string;
  name: string;
  mimeType?: string;
  kind?: 'image' | 'file';
}

// Appointment reminder
export type ReminderChannel = 'email' | 'sms' | 'whatsapp';
export type ReminderCategory = 'appointment' | 'birthday' | 'custom';
export type ReminderStatus = 'draft' | 'queued' | 'sent' | 'failed';

export interface Reminder {
  id: string;
  hospitalId?: string | null;
  appointmentId?: string;
  patientId: string;
  doctorId?: string;
  subject?: string;
  message: string;
  channel: ReminderChannel;
  category: ReminderCategory;
  reminderType?: 'day_before' | 'hour_before' | 'birthday' | 'custom';
  scheduledFor?: Date;
  sentAt?: Date;
  status: ReminderStatus;
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SponsoredItem {
  id: string;
  name: string;
  category?: string;
  totalQuantity: number;
  paidQuantity: number;
  note?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Inventory & Stock Management
export interface Inventory {
  id: string;
  hospitalId?: string | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'needs-review';
  lastUpdated: string;
}

export interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  needsReviewCount: number;
  recentlyUpdatedCount: number;
}

export interface InventoryActivity {
  id: string;
  description: string;
  timestamp: string;
}
