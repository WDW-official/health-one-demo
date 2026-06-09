# Role-Based Access Control Documentation

## Overview

The Health One Dental Clinic system now implements a simplified two-role model with specialized access controls for healthcare professionals.

## Roles

### 1. Admin (SuperAdmin)
- **Responsibilities**: Full system management, clinic operations
- **Can Access**:
  - Dashboard with clinic-wide statistics
  - Patient Management (CRUD for all patients)
  - Doctor Management (CRUD for all doctors)
  - Appointment Management (view/manage all appointments)
  - Consultation Records (view all consultations)
  - System Settings and Configuration
  - Help & Documentation

- **Cannot Access**: Nothing - full administrative access

- **Special Flag**: `isSuperAdmin` boolean (all admins currently have this)

### 2. Doctor
- **Responsibilities**: Patient care, consultation records, appointment management
- **Can Access**:
  - Personal Dashboard showing:
    - Total appointments count
    - Today's appointments
    - Upcoming appointments
    - Completed appointments count
  - Only patients assigned to them
  - Only appointments assigned to them
  - Only consultations for their patients
  - Help & Documentation

- **Cannot Access**:
  - Other doctors' patient lists
  - Other doctors' appointments
  - Doctor Management (cannot add/edit/delete doctors)
  - Clinic Settings
  - System Configuration
  - Patients not assigned to them

## Database Schema Changes

### User Model
```typescript
interface IUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'doctor'; // Only these two roles
  isSuperAdmin?: boolean;    // Flags if admin is superadmin
  doctorId?: string;         // Reference to Doctor if role is 'doctor'
  createdAt: Date;
  updatedAt: Date;
}
```

### Doctor Assignment
- When a user is created with role "doctor", they must have a corresponding `doctorId`
- This `doctorId` links the user account to their professional profile
- Doctors can see patients where `assignedDoctorId` matches their `doctorId`

## API Endpoints with Role Filtering

### Patients Endpoint
```
GET /api/patients?doctorId={doctorId}
```
When `doctorId` is provided, only returns patients assigned to that doctor.

### Appointments Endpoint
```
GET /api/appointments?doctorId={doctorId}
```
When `doctorId` is provided, only returns appointments for that doctor.

### Consultations Endpoint
```
GET /api/consultations?doctorId={doctorId}
```
When `doctorId` is provided, only returns consultations for that doctor's patients.

## Frontend Implementation

### Dashboard Routing
The dashboard automatically routes users to the appropriate view:

```typescript
// In /app/dashboard/page.tsx
if (user?.role === 'doctor' && user?.doctorId) {
  return <DoctorDashboard doctorId={user.doctorId} doctorName={user.name} />;
}
// Admin sees the admin dashboard with workflow controls
```

### Sidebar Navigation
The sidebar automatically filters menu items based on user role:
- **Admin**: Sees all menu items (Patients, Doctors, Appointments, Consultations, Settings)
- **Doctor**: Sees limited items (Dashboard, Patients, Appointments, Consultations, Help)

### Protected Routes
- `/dashboard/doctors` - Admin only
- `/dashboard/settings` - Admin only
- `/dashboard` - Shows different content based on role

## Demo Credentials

### Admin User
- **Email**: admin@clinic.com
- **Password**: password123
- **Access**: Full system access

### Doctor User
- **Email**: doctor@clinic.com
- **Password**: password123
- **Access**: Only assigned patients and their data
- **Doctor ID**: d1 (linked to Dr. James Smith)

## Migration Path

### If upgrading from old system:
1. Remove all `front_desk` role users from database
2. Update user roles to either `admin` or `doctor`
3. For doctor users, set the `doctorId` field to link to their Doctor profile
4. Verify `isSuperAdmin` is set appropriately for admin users

## Security Considerations

1. **Doctor Isolation**: Doctors can only access their own patients and appointments
2. **Database Queries**: Always include `assignedDoctorId` filter when fetching patient data for doctors
3. **Frontend Protection**: Role-based sidebar filtering prevents UI confusion
4. **Backend Enforcement**: API endpoints must validate user role and enforce filters

## Future Enhancements

Potential additions to the role system:
- Receptionist role (limited patient view, appointment scheduling only)
- Manager role (statistics and reporting without full admin access)
- Custom role creation system
- Department-based access controls
- Time-based access permissions (on-duty scheduling)

## Common Scenarios

### Scenario 1: Doctor logs in
1. System checks `user.role === 'doctor'`
2. Renders `DoctorDashboard` with their stats
3. Patient lists are filtered by `user.doctorId`
4. Sidebar hides admin-only items

### Scenario 2: Admin logs in
1. System checks `user.role === 'admin'`
2. Renders standard `DashboardWorkflow` with clinic overview
3. Patient lists show all patients
4. Sidebar shows all management options

### Scenario 3: Doctor tries to access another doctor's patient
1. Frontend sidebar doesn't show a global patient list link
2. If URL is manually typed, API filters by doctorId
3. If patient not assigned to requesting doctor, 403 error
4. Doctor sees "Not found" or "Unauthorized"
