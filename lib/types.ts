// User roles
import type { ProcedureType } from './procedure-types';
import type { ConsultationProcedure } from './procedure-types';

export type UserRole = 'admin' | 'doctor';

// User authentication
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  doctorId?: string; // Reference to Doctor if role is 'doctor'
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt: Date;
}

// Doctor information
export interface Doctor {
  id: string;
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
  doctorId?: string;
  unreadCount?: number;
  latestMessage?: string;
  latestAt?: Date;
}

// Patient information
export interface Patient {
  id: string;
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
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  patientName?: string;
  doctorName?: string;
  presentingComplaints?: string;
  examination?: string;
  diagnosis: string;
  treatmentPlan?: string;
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
