# Quick Start - Backend API Setup

Get the Health One Dental Clinic backend running in 5 minutes.

## Prerequisites
- Node.js 18+ installed
- npm available

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Setup MongoDB (Choose One)

### Option A: Local MongoDB (Fastest)
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Verify
mongosh
```

### Option B: MongoDB Atlas (Cloud - Recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster (M0 free tier)
4. Add IP to whitelist (0.0.0.0/0 for development)
5. Create database user
6. Get connection string

## Step 3: Setup Cloudinary

1. Go to https://cloudinary.com/users/register/free
2. Sign up
3. Go to Dashboard
4. Copy your credentials

## Step 4: Configure Environment

Create `.env.local`:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/clinic-db

# Or if using Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clinic-db?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=dev-secret-key-change-in-production

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Step 5: Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## Test It Works

### 1. Test Patient Search
```bash
curl http://localhost:3000/api/patients/search?q=test
```

Should return: `{ "patients": [], "count": 0 }`

### 2. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@clinic.com",
    "password": "admin123",
    "name": "Admin",
    "role": "admin"
  }'
```

### 3. Create Patient
```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-0100",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "address": "123 Main St",
    "city": "NYC",
    "state": "NY",
    "zipCode": "10001",
    "emergencyContactName": "Jane",
    "emergencyContactPhone": "555-0101"
  }'
```

### 4. Search Patient (Should be instant!)
```bash
curl http://localhost:3000/api/patients/search?q=john
```

## API Endpoints Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/patients` | List patients |
| GET | `/api/patients/search?q=name` | **Fast search** |
| POST | `/api/patients` | Create patient |
| GET | `/api/patients/[id]` | Get patient |
| PUT | `/api/patients/[id]` | Update patient |
| DELETE | `/api/patients/[id]` | Delete patient |
| GET | `/api/doctors` | List doctors |
| POST | `/api/doctors` | Create doctor |
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |
| GET | `/api/consultations` | List consultations |
| POST | `/api/consultations` | Create consultation |
| POST | `/api/upload` | Upload image |

## Database Collections

Automatically created on first use:
- `users` - Authentication
- `patients` - Patient records
- `doctors` - Doctor profiles
- `appointments` - Scheduling
- `consultations` - Medical records

## File Structure

```
/app/api/
├── auth/login
├── auth/register
├── patients/
├── doctors/
├── appointments/
├── consultations/
└── upload/

/lib/
├── mongodb.ts (connection)
├── jwt.ts (tokens)
├── cloudinary.ts (images)
└── models/
    ├── User.ts
    ├── Patient.ts
    ├── Doctor.ts
    ├── Appointment.ts
    └── Consultation.ts
```

## Common Issues

### "MONGODB_URI is not defined"
- Add `MONGODB_URI` to `.env.local`
- Restart dev server after changes

### "Cannot connect to MongoDB"
- Verify MongoDB is running
- Check connection string is correct
- Verify network access (Atlas)

### "Cloudinary upload fails"
- Verify credentials in `.env.local`
- Check API key and secret
- Ensure cloud name is correct

## Next Steps

1. **Integration**: Connect frontend to API
2. **Auth**: Add JWT middleware for protected endpoints
3. **Notifications**: Add email/SMS reminders
4. **Reports**: Generate patient/appointment reports
5. **Analytics**: Track clinic metrics

## Resources

- **Full API Docs**: See `API_ROUTES.md`
- **MongoDB Setup**: See `MONGODB_SETUP.md`
- **Cloudinary Setup**: See `CLOUDINARY_SETUP.md`
- **Complete Guide**: See `BACKEND_IMPLEMENTATION.md`

## That's It!

Your backend is now ready to handle:
- ✅ User authentication
- ✅ Patient management with instant search
- ✅ Doctor management
- ✅ Appointment scheduling
- ✅ Medical consultations
- ✅ Image uploads

Start building the frontend integration next!
