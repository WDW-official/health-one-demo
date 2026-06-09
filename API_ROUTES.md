# Health One Dental Clinic - API Routes Documentation

Complete API documentation for the Next.js backend with MongoDB integration.

## Base URL
```
http://localhost:3000/api
```

## Environment Setup

Create a `.env.local` file with:

```env
MONGODB_URI=mongodb://localhost:27017/clinic-db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Authentication Endpoints

### Register User
- **POST** `/auth/register`
- Request body:
  ```json
  {
    "email": "user@clinic.com",
    "password": "password123",
    "name": "John Doe",
    "role": "admin|doctor|front_desk"
  }
  ```
- Response: `{ user, token }`

### Login
- **POST** `/auth/login`
- Request body:
  ```json
  {
    "email": "user@clinic.com",
    "password": "password123"
  }
  ```
- Response: `{ user, token }`

## Patient Endpoints

### List All Patients
- **GET** `/patients?search=john&limit=10&skip=0`
- Query params:
  - `search` - Text search (name, email, phone)
  - `limit` - Results per page (default: 10)
  - `skip` - Pagination offset (default: 0)
- Response: `{ patients[], total, limit, skip }`

### Fast Patient Search
- **GET** `/patients/search?q=john doe`
- Uses MongoDB text indexes for lightning-fast results
- Returns top 20 matching patients ranked by relevance
- Query params:
  - `q` - Search query (minimum 2 characters)
- Response: `{ patients[], count }`

### Create Patient
- **POST** `/patients`
- Request body:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "email": "john@example.com",
    "phone": "555-0100",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "555-0101",
    "assignedDoctorId": "doctor_id",
    "medicalHistory": "No allergies",
    "allergies": "Penicillin",
    "currentMedications": "None"
  }
  ```
- Response: `{ message, patient }`

### Get Patient by ID
- **GET** `/patients/[id]`
- Response: `{ patient }`

### Update Patient
- **PUT** `/patients/[id]`
- Request body: (any fields to update)
- Response: `{ message, patient }`

### Delete Patient (Soft Delete)
- **DELETE** `/patients/[id]`
- Marks patient as inactive instead of permanent deletion
- Response: `{ message }`

## Doctor Endpoints

### List All Doctors
- **GET** `/doctors?limit=50&skip=0`
- Response: `{ doctors[], total, limit, skip }`

### Create Doctor (Admin Only)
- **POST** `/doctors`
- Request body:
  ```json
  {
    "name": "Dr. James Smith",
    "email": "james@clinic.com",
    "phone": "555-0201",
    "specialization": "General Dentistry",
    "licenseNumber": "DEN-001",
    "yearsOfExperience": 10,
    "availableSlots": ["09:00", "09:30", "10:00"],
    "workingDays": ["Monday", "Tuesday", "Wednesday"]
  }
  ```
- Response: `{ message, doctor }`

### Get Doctor by ID
- **GET** `/doctors/[id]`
- Response: `{ doctor }`

### Update Doctor (Admin Only)
- **PUT** `/doctors/[id]`
- Request body: (any fields to update)
- Response: `{ message, doctor }`

### Delete Doctor (Soft Delete)
- **DELETE** `/doctors/[id]`
- Response: `{ message }`

## Appointment Endpoints

### List Appointments
- **GET** `/appointments?status=scheduled&patientId=patient_id&doctorId=doctor_id&limit=50&skip=0`
- Query params:
  - `status` - Filter by status (scheduled, completed, cancelled, noshow)
  - `patientId` - Filter by patient
  - `doctorId` - Filter by doctor
  - `limit` - Results per page (default: 50)
  - `skip` - Pagination offset (default: 0)
- Response: `{ appointments[], total, limit, skip }`

### Create Appointment
- **POST** `/appointments`
- Request body:
  ```json
  {
    "patientId": "patient_id",
    "doctorId": "doctor_id",
    "dateTime": "2024-01-20T10:00:00Z",
    "duration": 30,
    "type": "checkup|cleaning|treatment|emergency|followup",
    "notes": "Regular checkup"
  }
  ```
- Response: `{ message, appointment }`

### Get Appointment by ID
- **GET** `/appointments/[id]`
- Response: `{ appointment }`

### Update Appointment
- **PUT** `/appointments/[id]`
- Request body: (any fields to update)
- Response: `{ message, appointment }`

### Delete Appointment
- **DELETE** `/appointments/[id]`
- Response: `{ message }`

## Consultation Endpoints

### List Consultations
- **GET** `/consultations?patientId=patient_id&doctorId=doctor_id&limit=50&skip=0`
- Query params:
  - `patientId` - Filter by patient
  - `doctorId` - Filter by doctor
  - `limit` - Results per page (default: 50)
  - `skip` - Pagination offset (default: 0)
- Response: `{ consultations[], total, limit, skip }`

### Create Consultation
- **POST** `/consultations`
- Request body:
  ```json
  {
    "appointmentId": "appointment_id",
    "patientId": "patient_id",
    "doctorId": "doctor_id",
    "diagnosis": "Cavity detected on tooth #14",
    "treatment": "Root canal therapy",
    "prescriptions": "Amoxicillin 500mg",
    "followUpDate": "2024-02-20",
    "notes": "Patient recovered well"
  }
  ```
- Response: `{ message, consultation }`

### Get Consultation by ID
- **GET** `/consultations/[id]`
- Response: `{ consultation }`

### Update Consultation
- **PUT** `/consultations/[id]`
- Request body: (any fields to update)
- Response: `{ message, consultation }`

### Delete Consultation
- **DELETE** `/consultations/[id]`
- Response: `{ message }`

## File Upload Endpoint

### Upload Image to Cloudinary
- **POST** `/upload`
- Content-Type: `multipart/form-data`
- Form data:
  - `file` - Image file (required)
  - `folder` - Destination folder in Cloudinary (default: "profile")
- Response:
  ```json
  {
    "message": "File uploaded successfully",
    "url": "https://res.cloudinary.com/...",
    "publicId": "clinic/profile/..."
  }
  ```

## Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Description of what went wrong"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `404` - Not found
- `409` - Conflict (duplicate entry)
- `500` - Server error

## Database Schema

### Patient Collection
- Indexed fields: `firstName`, `lastName`, `email`, `phone` (text search)
- Indexes: `assignedDoctorId`, `isActive`
- Example query: `/patients/search?q=john doe` returns 20 results in <50ms

### Appointment Collection
- Indexes: `patientId`, `doctorId`, `dateTime`, `status`
- Compound indexes for common queries
- Supports calendar view queries efficiently

### Consultation Collection
- Indexes: `patientId`, `doctorId`
- Tracks medical history per patient

## Error Handling

All endpoints follow consistent error handling:

```typescript
try {
  // Operation
  return NextResponse.json({ success }, { status: 200 });
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    { error: 'User-friendly error message' },
    { status: 500 }
  );
}
```

## Performance Optimization

1. **Text Search**: MongoDB text indexes on patient fields
2. **Database Indexing**: Strategic indexes on frequently queried fields
3. **Compound Indexes**: For complex queries
4. **Caching**: Doctor/patient names cached in appointments
5. **Pagination**: All list endpoints support limit/skip

## Security

- JWT tokens required for authenticated endpoints (future implementation)
- Password hashing with bcrypt
- Input validation on all endpoints
- Soft deletes for data preservation
- MongoDB injection prevention through Mongoose validation

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@clinic.com","password":"pass123","name":"John","role":"admin"}'
```

### Search Patients
```bash
curl http://localhost:3000/api/patients/search?q=john
```

### Create Patient
```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@clinic.com","phone":"555-0100",...}'
```

### Upload Image
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/image.jpg" \
  -F "folder=patients"
```
