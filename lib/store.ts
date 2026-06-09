import { Patient, Appointment, Consultation, Reminder, Doctor } from './types';

// Store key constants
const PATIENTS_KEY = 'clinic_patients';
const APPOINTMENTS_KEY = 'clinic_appointments';
const CONSULTATIONS_KEY = 'clinic_consultations';
const REMINDERS_KEY = 'clinic_reminders';
const DOCTORS_KEY = 'clinic_doctors';

/**
 * Initialize localStorage with mock data if empty
 */
export function initializeStore(): void {
  if (typeof window === 'undefined') return;

  // Initialize patients
  if (!localStorage.getItem(PATIENTS_KEY)) {
    const mockPatients: Patient[] = [
      {
        id: 'p1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15',
        gender: 'male',
        email: 'john@example.com',
        phone: '555-0101',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        insuranceProvider: 'BlueCross',
        insurancePolicyNumber: 'BC123456',
        medicalHistory: 'Regular checkups',
        allergies: 'Penicillin',
        currentMedications: 'None',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '555-0102',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: 'p2',
        firstName: 'Sarah',
        lastName: 'Williams',
        dateOfBirth: '1985-08-22',
        gender: 'female',
        email: 'sarah@example.com',
        phone: '555-0103',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        insuranceProvider: 'Aetna',
        insurancePolicyNumber: 'AET789012',
        medicalHistory: 'Diabetes, Regular dental care',
        allergies: 'None',
        currentMedications: 'Metformin',
        emergencyContactName: 'Michael Williams',
        emergencyContactPhone: '555-0104',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      },
      {
        id: 'p3',
        firstName: 'Michael',
        lastName: 'Brown',
        dateOfBirth: '1992-12-10',
        gender: 'male',
        email: 'michael@example.com',
        phone: '555-0105',
        address: '789 Pine Rd',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        insuranceProvider: 'United Healthcare',
        insurancePolicyNumber: 'UH345678',
        medicalHistory: 'Occasional checkups',
        allergies: 'Shellfish',
        currentMedications: 'Vitamin D',
        emergencyContactName: 'Emily Brown',
        emergencyContactPhone: '555-0106',
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-02-10'),
      },
    ];
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(mockPatients));
  }

  // Initialize appointments
  if (!localStorage.getItem(APPOINTMENTS_KEY)) {
    const mockAppointments: Appointment[] = [
      {
        id: 'a1',
        patientId: 'p1',
        doctorId: '2',
        dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        duration: 60,
        type: 'Periapical X-ray',
        status: 'scheduled',
        notes: 'Regular checkup',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'a2',
        patientId: 'p2',
        doctorId: '2',
        dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        duration: 45,
        type: 'Scaling/Polishing',
        status: 'scheduled',
        notes: 'Dental cleaning',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'a3',
        patientId: 'p3',
        doctorId: '2',
        dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        duration: 60,
        type: 'Composite Filling',
        status: 'completed',
        notes: 'Completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(mockAppointments));
  }

  // Initialize consultations
  if (!localStorage.getItem(CONSULTATIONS_KEY)) {
    const mockConsultations: Consultation[] = [
      {
        id: 'c1',
        appointmentId: 'a3',
        patientId: 'p3',
        doctorId: '2',
        diagnosis: 'Cavities in molars',
        treatment: 'Fillings applied',
        prescription: 'Fluoride mouthwash',
        nextVisitDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: 'Patient responded well to treatment',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(mockConsultations));
  }

  // Initialize reminders
  if (!localStorage.getItem(REMINDERS_KEY)) {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify([]));
  }

  // Initialize doctors
  if (!localStorage.getItem(DOCTORS_KEY)) {
    const mockDoctors: Doctor[] = [
      {
        id: 'd1',
        name: 'Dr. James Smith',
        email: 'james.smith@clinic.com',
        phone: '555-0201',
        specialization: 'General Dentistry',
        licenseNumber: 'DEN-001',
        yearsOfExperience: 10,
        availableSlots: ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '15:30'],
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'd2',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@clinic.com',
        phone: '555-0202',
        specialization: 'Orthodontics',
        licenseNumber: 'DEN-002',
        yearsOfExperience: 8,
        availableSlots: ['10:00', '10:30', '11:00', '11:30', '15:00', '15:30', '16:00'],
        workingDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'd3',
        name: 'Dr. Michael Chen',
        email: 'michael.chen@clinic.com',
        phone: '555-0203',
        specialization: 'Periodontics',
        licenseNumber: 'DEN-003',
        yearsOfExperience: 12,
        availableSlots: ['08:00', '08:30', '09:00', '09:30', '13:00', '13:30', '14:00'],
        workingDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    localStorage.setItem(DOCTORS_KEY, JSON.stringify(mockDoctors));
  }
}

// Patient operations
export function getPatients(): Patient[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PATIENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getPatientById(id: string): Patient | undefined {
  return getPatients().find((p) => p.id === id);
}

export function addPatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient {
  const newPatient: Patient = {
    ...patient,
    id: `p${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const patients = getPatients();
  patients.push(newPatient);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
  return newPatient;
}

export function updatePatient(id: string, updates: Partial<Omit<Patient, 'id' | 'createdAt'>>): Patient | null {
  const patients = getPatients();
  const index = patients.findIndex((p) => p.id === id);
  if (index === -1) return null;
  patients[index] = {
    ...patients[index],
    ...updates,
    updatedAt: new Date(),
  };
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
  return patients[index];
}

export function deletePatient(id: string): boolean {
  const patients = getPatients();
  const filtered = patients.filter((p) => p.id !== id);
  if (filtered.length === patients.length) return false;
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(filtered));
  return true;
}

// Appointment operations
export function getAppointments(): Appointment[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(APPOINTMENTS_KEY);
  return data ? JSON.parse(data).map((a: any) => ({ ...a, dateTime: new Date(a.dateTime) })) : [];
}

export function getAppointmentById(id: string): Appointment | undefined {
  return getAppointments().find((a) => a.id === id);
}

export function getAppointmentsByPatientId(patientId: string): Appointment[] {
  return getAppointments().filter((a) => a.patientId === patientId);
}

export function getAppointmentsByDoctorId(doctorId: string): Appointment[] {
  return getAppointments().filter((a) => a.doctorId === doctorId);
}

export function addAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Appointment {
  const newAppointment: Appointment = {
    ...appointment,
    id: `a${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const appointments = getAppointments();
  appointments.push(newAppointment);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
  return newAppointment;
}

export function updateAppointment(id: string, updates: Partial<Omit<Appointment, 'id' | 'createdAt'>>): Appointment | null {
  const appointments = getAppointments();
  const index = appointments.findIndex((a) => a.id === id);
  if (index === -1) return null;
  appointments[index] = {
    ...appointments[index],
    ...updates,
    updatedAt: new Date(),
  };
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
  return appointments[index];
}

// Consultation operations
export function getConsultations(): Consultation[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(CONSULTATIONS_KEY);
  return data ? JSON.parse(data).map((c: any) => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    nextVisitDate: c.nextVisitDate ? new Date(c.nextVisitDate) : undefined,
  })) : [];
}

export function getConsultationsByPatientId(patientId: string): Consultation[] {
  return getConsultations().filter((c) => c.patientId === patientId);
}

export function addConsultation(consultation: Omit<Consultation, 'id' | 'createdAt' | 'updatedAt'>): Consultation {
  const newConsultation: Consultation = {
    ...consultation,
    id: `c${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const consultations = getConsultations();
  consultations.push(newConsultation);
  localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(consultations));
  return newConsultation;
}

export function updateConsultation(id: string, updates: Partial<Omit<Consultation, 'id' | 'createdAt'>>): Consultation | null {
  const consultations = getConsultations();
  const index = consultations.findIndex((c) => c.id === id);
  if (index === -1) return null;
  consultations[index] = {
    ...consultations[index],
    ...updates,
    updatedAt: new Date(),
  };
  localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(consultations));
  return consultations[index];
}

// Reminder operations
export function getReminders(): Reminder[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(REMINDERS_KEY);
  return data ? JSON.parse(data).map((r: any) => ({
    ...r,
    sentAt: r.sentAt ? new Date(r.sentAt) : undefined,
    createdAt: new Date(r.createdAt),
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
    scheduledFor: r.scheduledFor ? new Date(r.scheduledFor) : undefined,
  })) : [];
}

export function addReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
  const newReminder: Reminder = {
    ...reminder,
    id: `r${Date.now()}`,
    createdAt: new Date(),
    status: reminder.status || 'draft',
    message: reminder.message || '',
    channel: reminder.channel || 'email',
    category: reminder.category || 'custom',
    isRead: reminder.isRead ?? false,
  };
  const reminders = getReminders();
  reminders.push(newReminder);
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  return newReminder;
}

// Doctor operations
export function getDoctors(): Doctor[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(DOCTORS_KEY);
  return data ? JSON.parse(data).map((d: any) => ({
    ...d,
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt),
  })) : [];
}

export function getDoctorById(id: string): Doctor | undefined {
  return getDoctors().find((d) => d.id === id);
}

export function getActiveDoctors(): Doctor[] {
  return getDoctors().filter((d) => d.isActive);
}

export function addDoctor(doctor: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>): Doctor {
  const newDoctor: Doctor = {
    ...doctor,
    id: `d${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const doctors = getDoctors();
  doctors.push(newDoctor);
  localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
  return newDoctor;
}

export function updateDoctor(id: string, updates: Partial<Omit<Doctor, 'id' | 'createdAt'>>): Doctor | null {
  const doctors = getDoctors();
  const index = doctors.findIndex((d) => d.id === id);
  if (index === -1) return null;
  doctors[index] = {
    ...doctors[index],
    ...updates,
    updatedAt: new Date(),
  };
  localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
  return doctors[index];
}

export function deleteDoctor(id: string): boolean {
  const doctors = getDoctors();
  const filtered = doctors.filter((d) => d.id !== id);
  if (filtered.length === doctors.length) return false;
  localStorage.setItem(DOCTORS_KEY, JSON.stringify(filtered));
  return true;
}
