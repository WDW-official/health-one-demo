import type { ClinicType } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACTIVE_HOSPITAL_ID_KEY = 'healthone_active_hospital_id';
const ACTIVE_HOSPITAL_SLUG_KEY = 'healthone_active_hospital_slug';
const DEMO_HOSPITAL_SETTINGS_KEY = 'healthone_demo_hospital_settings';

type ListParams = {
  limit?: number;
  skip?: number;
  search?: string;
  date?: string;
  doctorId?: string;
  patientId?: string;
  appointmentId?: string;
  consultationId?: string;
  category?: string;
  recipientId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  diagnosis?: string;
};

type CreateHospitalData = {
  name: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
  clinicTypes?: ClinicType[];
  logoUrl?: string;
  brandColor?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  trialDays?: number;
  subscriptionDays?: number;
  trialEndsAt?: string | Date | null;
  currentPeriodEndsAt?: string | Date | null;
  settings?: Record<string, unknown>;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
};

type UpdatePlatformHospitalData = Partial<Omit<CreateHospitalData, 'adminName' | 'adminEmail' | 'adminPassword'>>;

type HospitalSettingsData = {
  address?: string;
  logoUrl?: string;
  brandColor?: string;
  settings?: Record<string, unknown>;
};

function getDefaultDemoHospitalSettings() {
  const now = new Date();

  return {
    id: 'demo',
    name: 'Health One Dental Clinic',
    slug: 'demo',
    clinicTypes: ['dental'] as ClinicType[],
    email: 'info@healthone.com',
    phone: '',
    address: '',
    logoUrl: '',
    brandColor: '#275cc2',
    subscriptionPlan: 'demo',
    subscriptionStatus: 'active',
    trialEndsAt: null,
    currentPeriodEndsAt: null,
    isActive: true,
    settings: {
      branding: {
        logoSize: 48,
      },
    },
    createdAt: now,
    updatedAt: now,
  };
}

function buildQuery(params: ListParams = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

function normalizeDocument<T extends Record<string, any>>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;
  if (!doc.id && doc._id) {
    return { ...doc, id: String(doc._id) };
  }
  return doc;
}

function normalizeArray<T extends Record<string, any>>(items: T[] = []) {
  return items.map((item) => normalizeDocument(item));
}

function normalizeAppointment<T extends Record<string, any>>(appointment: T) {
  const normalized = normalizeDocument(appointment);
  if (!normalized || typeof normalized !== 'object') return normalized;
  return {
    ...normalized,
    dateTime: normalized.dateTime ? new Date(normalized.dateTime as string) : normalized.dateTime,
    createdAt: normalized.createdAt ? new Date(normalized.createdAt as string) : normalized.createdAt,
    updatedAt: normalized.updatedAt ? new Date(normalized.updatedAt as string) : normalized.updatedAt,
  };
}

function normalizeConsultation<T extends Record<string, any>>(consultation: T) {
  const normalized = normalizeDocument(consultation);
  if (!normalized || typeof normalized !== 'object') return normalized;
  return {
    ...normalized,
    nextVisitDate: normalized.nextVisitDate ? new Date(normalized.nextVisitDate as string) : normalized.nextVisitDate,
    clinicalNotes: (normalized.clinicalNotes || []).map((note: any) => ({
      ...note,
      enteredAt: note.enteredAt ? new Date(note.enteredAt as string) : note.enteredAt,
    })),
    createdAt: normalized.createdAt ? new Date(normalized.createdAt as string) : normalized.createdAt,
    updatedAt: normalized.updatedAt ? new Date(normalized.updatedAt as string) : normalized.updatedAt,
  };
}

function normalizeBilling<T extends Record<string, any>>(billing: T) {
  const normalized = normalizeDocument(billing);
  if (!normalized || typeof normalized !== 'object') return normalized;
  return {
    ...normalized,
    consultationDate: normalized.consultationDate ? new Date(normalized.consultationDate as string) : normalized.consultationDate,
    hmoClaimSubmissionDate: normalized.hmoClaimSubmissionDate ? new Date(normalized.hmoClaimSubmissionDate as string) : normalized.hmoClaimSubmissionDate,
    hmoClaimPaymentDate: normalized.hmoClaimPaymentDate ? new Date(normalized.hmoClaimPaymentDate as string) : normalized.hmoClaimPaymentDate,
    payments: (normalized.payments || []).map((payment: any) => ({
      ...payment,
      paidAt: payment.paidAt ? new Date(payment.paidAt as string) : payment.paidAt,
    })),
    createdAt: normalized.createdAt ? new Date(normalized.createdAt as string) : normalized.createdAt,
    updatedAt: normalized.updatedAt ? new Date(normalized.updatedAt as string) : normalized.updatedAt,
  };
}

function normalizeReminder<T extends Record<string, any>>(reminder: T) {
  const normalized = normalizeDocument(reminder);
  if (!normalized || typeof normalized !== 'object') return normalized;
  return {
    ...normalized,
    scheduledFor: normalized.scheduledFor ? new Date(normalized.scheduledFor as string) : normalized.scheduledFor,
    sentAt: normalized.sentAt ? new Date(normalized.sentAt as string) : normalized.sentAt,
    createdAt: normalized.createdAt ? new Date(normalized.createdAt as string) : normalized.createdAt,
    updatedAt: normalized.updatedAt ? new Date(normalized.updatedAt as string) : normalized.updatedAt,
  };
}

function normalizeCheckIn<T extends Record<string, any>>(checkIn: T) {
  const normalized = normalizeDocument(checkIn);
  if (!normalized || typeof normalized !== 'object') return normalized;
  return {
    ...normalized,
    checkedInAt: normalized.checkedInAt ? new Date(normalized.checkedInAt as string) : normalized.checkedInAt,
    createdAt: normalized.createdAt ? new Date(normalized.createdAt as string) : normalized.createdAt,
    updatedAt: normalized.updatedAt ? new Date(normalized.updatedAt as string) : normalized.updatedAt,
  };
}

function normalizeChatMessage<T extends Record<string, any>>(message: T) {
  const normalized = normalizeDocument(message);
  if (!normalized || typeof normalized !== 'object') return normalized;
  return {
    ...normalized,
    readAt: normalized.readAt ? new Date(normalized.readAt as string) : normalized.readAt,
    createdAt: normalized.createdAt ? new Date(normalized.createdAt as string) : normalized.createdAt,
    updatedAt: normalized.updatedAt ? new Date(normalized.updatedAt as string) : normalized.updatedAt,
  };
}

function normalizeChatUser<T extends Record<string, any>>(user: T) {
  const normalized = normalizeDocument(user);
  if (!normalized || typeof normalized !== 'object') return normalized;
  return {
    ...normalized,
    latestAt: normalized.latestAt ? new Date(normalized.latestAt as string) : normalized.latestAt,
  };
}

function normalizeSponsoredItem<T extends Record<string, any>>(item: T) {
  const normalized = normalizeDocument(item);
  if (!normalized || typeof normalized !== 'object') return normalized;
  return {
    ...normalized,
    createdAt: normalized.createdAt ? new Date(normalized.createdAt as string) : normalized.createdAt,
    updatedAt: normalized.updatedAt ? new Date(normalized.updatedAt as string) : normalized.updatedAt,
  };
}

export class ApiClient {
  private static token: string | null = null;

  static setActiveHospital(hospital: { id: string; slug: string } | null) {
    if (typeof window === 'undefined') return;

    if (!hospital) {
      localStorage.removeItem(ACTIVE_HOSPITAL_ID_KEY);
      localStorage.removeItem(ACTIVE_HOSPITAL_SLUG_KEY);
      return;
    }

    localStorage.setItem(ACTIVE_HOSPITAL_ID_KEY, hospital.id);
    localStorage.setItem(ACTIVE_HOSPITAL_SLUG_KEY, hospital.slug);
  }

  static getActiveHospital() {
    if (typeof window === 'undefined') return null;

    const id = localStorage.getItem(ACTIVE_HOSPITAL_ID_KEY);
    const slug = localStorage.getItem(ACTIVE_HOSPITAL_SLUG_KEY);
    if (!id || !slug) return null;

    return { id, slug };
  }

  static getDemoHospitalSettings() {
    if (typeof window === 'undefined') return getDefaultDemoHospitalSettings();

    const stored = localStorage.getItem(DEMO_HOSPITAL_SETTINGS_KEY);
    if (!stored) return getDefaultDemoHospitalSettings();

    try {
      return {
        ...getDefaultDemoHospitalSettings(),
        ...JSON.parse(stored),
      };
    } catch {
      return getDefaultDemoHospitalSettings();
    }
  }

  static setDemoHospitalSettings(settingsData: HospitalSettingsData) {
    if (typeof window === 'undefined') return getDefaultDemoHospitalSettings();

    const current = this.getDemoHospitalSettings();
    const next = {
      ...current,
      ...settingsData,
      settings: {
        ...current.settings,
        ...(settingsData.settings || {}),
      },
      updatedAt: new Date(),
    };

    localStorage.setItem(DEMO_HOSPITAL_SETTINGS_KEY, JSON.stringify(next));
    return next;
  }

  static setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return this.token;
    return this.token || localStorage.getItem('auth_token');
  }

  static clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (typeof window !== 'undefined' && !endpoint.startsWith('/platform')) {
      const activeHospitalId = localStorage.getItem(ACTIVE_HOSPITAL_ID_KEY);
      const activeHospitalSlug = localStorage.getItem(ACTIVE_HOSPITAL_SLUG_KEY);
      if (activeHospitalId) {
        headers.set('x-healthone-hospital-id', activeHospitalId);
      }
      if (activeHospitalSlug) {
        headers.set('x-healthone-hospital-slug', activeHospitalSlug);
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'API request failed');
    }

    return response.json() as Promise<T>;
  }

  // Auth endpoints
  static async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Store token if available
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  static async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  static async resetPassword(token: string, password: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  static async register(email: string, password: string, name: string, role: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
    this.setToken(data.access_token);
    return data;
  }

  static async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'doctor';
    doctorId?: string;
    hospitalId?: string;
    hospitalSlug?: string;
    isSuperAdmin?: boolean;
  }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async getUsers(params: ListParams = {}) {
    return this.request(`/admin/users${buildQuery(params)}`);
  }

  static async updateUserStatus(id: string, isActive: boolean) {
    return this.request(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  static async getPlatformHospitals(params: ListParams = {}) {
    return this.request(`/platform/hospitals${buildQuery(params)}`);
  }

  static async createPlatformHospital(hospitalData: CreateHospitalData) {
    return this.request('/platform/hospitals', {
      method: 'POST',
      body: JSON.stringify(hospitalData),
    });
  }

  static async updatePlatformHospital(id: string, hospitalData: UpdatePlatformHospitalData) {
    return this.request(`/platform/hospitals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(hospitalData),
    });
  }

  static async getHospitalSettings() {
    return this.request('/hospital/settings');
  }

  static async updateHospitalSettings(settingsData: HospitalSettingsData) {
    return this.request('/hospital/settings', {
      method: 'PATCH',
      body: JSON.stringify(settingsData),
    });
  }

  static async uploadHospitalLogo(file: File) {
    const formData = new FormData();
    formData.append('logo', file);

    const headers = new Headers();
    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (typeof window !== 'undefined') {
      const activeHospitalId = localStorage.getItem(ACTIVE_HOSPITAL_ID_KEY);
      const activeHospitalSlug = localStorage.getItem(ACTIVE_HOSPITAL_SLUG_KEY);
      if (activeHospitalId) {
        headers.set('x-healthone-hospital-id', activeHospitalId);
      }
      if (activeHospitalSlug) {
        headers.set('x-healthone-hospital-slug', activeHospitalSlug);
      }
    }

    const response = await fetch(`${API_URL}/hospital/logo`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Logo upload failed');
    }

    return response.json();
  }

  // Patient endpoints
  static async createPatient(patientData: any) {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  }

  static async getAllPatients(params: ListParams = {}) {
    const response = await this.request<any>(`/patients${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []),
      patients: normalizeArray(response?.patients || []),
    };
  }

  static async getPatient(id: string) {
    const response = await this.request<any>(`/patients/${id}`);
    const patient = normalizeDocument(response?.patient || response?.data || {});
    return {
      ...response,
      data: patient,
      patient,
    };
  }

  static async updatePatient(id: string, patientData: any) {
    return this.request(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patientData),
    });
  }

  static async deletePatient(id: string) {
    return this.request(`/patients/${id}`, {
      method: 'DELETE',
    });
  }

  static async searchPatients(query: string) {
    return this.request(`/patients/search?q=${encodeURIComponent(query)}`);
  }

  static async getPatientsByDoctor(doctorId: string) {
    return this.request(`/patients/doctor/${doctorId}`);
  }

  static async uploadPatientImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new Headers();
    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}/upload/patient-image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    return response.json();
  }

  static async updatePatientImage(id: string, imageUrl: string) {
    return this.request(`/patients/${id}/profile-image`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  }

  // Doctor endpoints
  static async createDoctor(doctorData: any) {
    return this.request('/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  }

  static async getAllDoctors(params: ListParams = {}) {
    const response = await this.request<any>(`/doctors${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []),
      doctors: normalizeArray(response?.doctors || []),
    };
  }

  static async getDoctor(id: string) {
    const response = await this.request<any>(`/doctors/${id}`);
    const doctor = normalizeDocument(response?.doctor || response?.data || {});
    return {
      ...response,
      data: doctor,
      doctor,
    };
  }

  static async updateDoctor(id: string, doctorData: any) {
    return this.request(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(doctorData),
    });
  }

  static async deleteDoctor(id: string) {
    return this.request(`/doctors/${id}`, {
      method: 'DELETE',
    });
  }

  static async getDoctorsBySpecialization(specialization: string) {
    return this.request(`/doctors/specialization/${specialization}`);
  }

  static async uploadDoctorImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new Headers();
    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}/upload/doctor-image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    return response.json();
  }

  static async updateDoctorImage(id: string, imageUrl: string) {
    return this.request(`/doctors/${id}/profile-image`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  }

  // Appointment endpoints
  static async createAppointment(appointmentData: any) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  static async getAllAppointments(params: ListParams = {}) {
    const response = await this.request<any>(`/appointments${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []),
      appointments: normalizeArray(response?.appointments || []),
    };
  }

  static async getAppointment(id: string) {
    const response = await this.request<any>(`/appointments/${id}`);
    const appointment = normalizeAppointment(response?.appointment || response?.data || {});
    return {
      ...response,
      data: appointment,
      appointment,
    };
  }

  static async updateAppointment(id: string, appointmentData: any) {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  }

  static async deleteAppointment(id: string) {
    return this.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  static async getUpcomingAppointments() {
    return this.request('/appointments/upcoming');
  }

  static async getAppointmentsByPatient(patientId: string) {
    const response = await this.request<any>(`/appointments/patient/${patientId}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeAppointment),
      appointments: normalizeArray(response?.appointments || []).map(normalizeAppointment),
    };
  }

  static async getAppointmentsByDoctor(doctorId: string, params: ListParams = {}) {
    const response = await this.request<any>(`/appointments/doctor/${doctorId}${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeAppointment),
      appointments: normalizeArray(response?.appointments || []).map(normalizeAppointment),
    };
  }

  static async getAppointmentsByDateRange(
    startDate: string,
    endDate: string,
    params: Omit<ListParams, 'startDate' | 'endDate'> = {},
  ) {
    const response = await this.request<any>(
      `/appointments/date-range${buildQuery({ startDate, endDate, ...params })}`,
    );
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeAppointment),
      appointments: normalizeArray(response?.appointments || []).map(normalizeAppointment),
    };
  }

  // Check-in endpoints
  static async getCheckIns(params: ListParams = {}) {
    const response = await this.request<any>(`/check-ins${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeCheckIn),
      checkIns: normalizeArray(response?.checkIns || []).map(normalizeCheckIn),
    };
  }

  static async createCheckIn(checkInData: any) {
    const response = await this.request<any>('/check-ins', {
      method: 'POST',
      body: JSON.stringify(checkInData),
    });
    const checkIn = normalizeCheckIn(response?.checkIn || response?.data || {});
    return {
      ...response,
      data: checkIn,
      checkIn,
    };
  }

  static async updateCheckIn(id: string, checkInData: any) {
    const response = await this.request<any>(`/check-ins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(checkInData),
    });
    const checkIn = normalizeCheckIn(response?.checkIn || response?.data || {});
    return {
      ...response,
      data: checkIn,
      checkIn,
    };
  }

  // Consultation endpoints
  static async createConsultation(consultationData: any) {
    return this.request('/consultations', {
      method: 'POST',
      body: JSON.stringify(consultationData),
    });
  }

  static async getAllConsultations(params: ListParams = {}) {
    const response = await this.request<any>(`/consultations${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeConsultation),
      consultations: normalizeArray(response?.consultations || []).map(normalizeConsultation),
    };
  }

  static async getConsultation(id: string) {
    const response = await this.request<any>(`/consultations/${id}`);
    const consultation = normalizeConsultation(response?.consultation || response?.data || {});
    return {
      ...response,
      data: consultation,
      consultation,
    };
  }

  static async updateConsultation(id: string, consultationData: any) {
    const response = await this.request<any>(`/consultations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(consultationData),
    });
    const consultation = normalizeConsultation(response?.consultation || response?.data || {});
    const billing = response?.billing ? normalizeBilling(response.billing) : response?.billing;
    return {
      ...response,
      data: consultation,
      consultation,
      billing,
    };
  }

  static async deleteConsultation(id: string) {
    return this.request(`/consultations/${id}`, {
      method: 'DELETE',
    });
  }

  static async getConsultationsByPatient(patientId: string) {
    const response = await this.request<any>(`/consultations/patient/${patientId}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeConsultation),
      consultations: normalizeArray(response?.consultations || []).map(normalizeConsultation),
    };
  }

  static async getConsultationsByDoctor(doctorId: string, params: ListParams = {}) {
    const response = await this.request<any>(`/consultations/doctor/${doctorId}${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeConsultation),
      consultations: normalizeArray(response?.consultations || []).map(normalizeConsultation),
    };
  }

  static async getConsultationByAppointment(appointmentId: string) {
    const response = await this.request<any>(`/consultations/appointment/${appointmentId}`);
    const rawConsultation = response?.consultation ?? response?.data ?? null;
    const consultation = rawConsultation ? normalizeConsultation(rawConsultation) : null;
    return {
      ...response,
      data: consultation,
      consultation,
    };
  }

  static async getUpcomingFollowUps() {
    return this.request('/consultations/upcoming-followups');
  }

  static async suggestConsultationDiagnosis(data: any) {
    return this.request('/consultations/ai-diagnosis', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Billing endpoints
  static async getBilling(params: ListParams & { hmoProvider?: string; hmoClaimStatus?: string } = {}) {
    const response = await this.request<any>(`/billing${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeBilling),
      billing: normalizeArray(response?.billing || []).map(normalizeBilling),
    };
  }

  static async getBillingRecord(id: string) {
    const response = await this.request<any>(`/billing/${id}`);
    const billing = normalizeBilling(response?.billing || response?.data || {});
    return {
      ...response,
      data: billing,
      billing,
    };
  }

  static async updateBillingRecord(id: string, billingData: any) {
    const response = await this.request<any>(`/billing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(billingData),
    });
    const billing = normalizeBilling(response?.billing || response?.data || {});
    return {
      ...response,
      data: billing,
      billing,
    };
  }

  static async recordBillingPayment(id: string, paymentData: any) {
    const response = await this.request<any>(`/billing/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    const billing = normalizeBilling(response?.billing || response?.data || {});
    return {
      ...response,
      data: billing,
      billing,
    };
  }

  // Reminder endpoints
  static async getReminders(params: ListParams = {}) {
    const response = await this.request<any>(`/reminders${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeReminder),
      reminders: normalizeArray(response?.reminders || []).map(normalizeReminder),
    };
  }

  static async createReminder(reminderData: any) {
    const response = await this.request<any>('/reminders', {
      method: 'POST',
      body: JSON.stringify(reminderData),
    });
    const reminder = normalizeReminder(response?.reminder || response?.data || {});
    return {
      ...response,
      data: reminder,
      reminder,
    };
  }

  static async sendReminder(id: string) {
    const response = await this.request<any>(`/reminders/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const reminder = normalizeReminder(response?.reminder || response?.data || {});
    return {
      ...response,
      data: reminder,
      reminder,
      whatsappUrl: response?.whatsappUrl,
    };
  }

  static async dispatchReminders() {
    return this.request('/reminders/dispatch', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Chat endpoints
  static async getChatMessages(params: ListParams = {}) {
    const response = await this.request<any>(`/chat${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeChatMessage),
      messages: normalizeArray(response?.messages || []).map(normalizeChatMessage),
    };
  }

  static async getChatUsers(params: ListParams = {}) {
    const response = await this.request<any>(`/chat/users${buildQuery(params)}`);
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeChatUser),
      users: normalizeArray(response?.users || []).map(normalizeChatUser),
    };
  }

  static async sendChatMessage(message: string, recipientId: string) {
    const response = await this.request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, recipientId }),
    });
    const chatMessage = normalizeChatMessage(response?.chatMessage || response?.data || {});
    return {
      ...response,
      data: chatMessage,
      chatMessage,
    };
  }

  // Sponsored items endpoints
  static async getSponsoredItems() {
    const response = await this.request<any>('/sponsored-items');
    return {
      ...response,
      data: normalizeArray(response?.data || []).map(normalizeSponsoredItem),
      sponsoredItems: normalizeArray(response?.sponsoredItems || []).map(normalizeSponsoredItem),
    };
  }

  // Inventory Report endpoints
  static async getInventoryReport(params: ListParams = {}) {
    return this.request(`/reports/inventory${buildQuery(params)}`);
  }

  static async getInventorySummary() {
    return this.request('/reports/inventory/summary');
  }

  static async getLowStockItems() {
    return this.request('/reports/inventory/low-stock');
  }

  static async getInventoryActivity() {
    return this.request('/reports/inventory/activity');
  }

  static async createStockItem(stockData: any) {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(stockData),
    });
  }

  static async updateStockItem(id: string, stockData: any) {
    return this.request(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(stockData),
    });
  }

  static async deleteStockItem(id: string) {
    return this.request(`/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  static async getInventoryCategories() {
    return this.request('/inventory/categories');
  }

  static async createInventoryCategory(name: string) {
    return this.request('/inventory/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  static async getInventorySuppliers() {
    return this.request('/inventory/suppliers');
  }

  static async getProcedureConsumableTemplates(params: ListParams = {}) {
    return this.request(`/inventory/procedure-consumables${buildQuery(params)}`);
  }

  static async seedProcedureConsumableTemplates() {
    return this.request('/inventory/procedure-consumables', {
      method: 'POST',
    });
  }
}
