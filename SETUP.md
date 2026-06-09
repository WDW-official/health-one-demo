# Complete Setup Guide - Health One Dental Clinic

Full instructions for setting up and running the application locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Testing the Application](#testing-the-application)
4. [Troubleshooting](#troubleshooting)
5. [Production Deployment](#production-deployment)

## Prerequisites

### Required Software

- **Node.js** 18+ (Download from https://nodejs.org/)
- **npm** 9+ (comes with Node.js)
- **MongoDB** 4.4+ (Install locally or use MongoDB Atlas)
- **Git** (for version control)

### Required Accounts

1. **MongoDB Account**: https://www.mongodb.com/cloud/atlas
   - Free tier is sufficient for testing
   
2. **Cloudinary Account**: https://cloudinary.com/
   - Free tier includes 25GB storage
   
3. **GitHub Account**: https://github.com
   - For version control and deployment

### Verify Installation

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

## Local Development Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/your-username/clinic-management.git
cd clinic-management
```

### Step 2: Setup MongoDB (Local Option)

**Option A: Use MongoDB Atlas (Recommended)**

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account and cluster
3. Create database user and get connection string
4. Skip to Step 3

**Option B: Install MongoDB Locally**

**Windows:**
- Download installer: https://www.mongodb.com/try/download/community
- Run installer and follow steps
- MongoDB runs on `localhost:27017`

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### Step 3: Setup Cloudinary

1. Sign up at https://cloudinary.com/ (free account)
2. Go to Dashboard
3. Note your:
   - Cloud Name
   - API Key
   - Generate API Secret (for security)

### Step 4: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your values
nano .env
# or use your preferred editor
```

**Edit `.backend/.env`:**
```env
PORT=3001
NODE_ENV=development

# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/clinic-db

# Or MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clinic-db?retryWrites=true&w=majority

JWT_SECRET=your-development-secret-key-here
JWT_EXPIRATION=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FRONTEND_URL=http://localhost:3000
```

### Step 5: Start Backend Server

```bash
# From backend directory
npm run start:dev
```

Expected output:
```
Clinic Backend Server running on http://localhost:3001
```

### Step 6: Setup Frontend

```bash
# Navigate back to root, then setup frontend
cd ..

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Edit if needed (already configured for local backend)
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Step 7: Start Frontend Server

```bash
# From root directory
npm run dev
```

Expected output:
```
Local:        http://localhost:3000
```

## Testing the Application

### Open Browser

1. Navigate to http://localhost:3000
2. You should see the login page

### Test Login Credentials

The application comes with pre-seeded test data in localStorage. To use the backend:

**Admin Account:**
```
Email: admin@clinic.com
Password: password123
```

**Doctor Account:**
```
Email: doctor@clinic.com
Password: password123
```

**Front Desk Account:**
```
Email: staff@clinic.com
Password: password123
```

### Test Patient Search (Most Important)

1. Login as Admin
2. Navigate to Dashboard
3. Use the "Search Patient" feature
4. Type a patient name
5. Should see fast results from backend search endpoint

### Test Image Upload

1. Go to Patients > New Patient
2. Fill in patient details
3. Submit form
4. Check Cloudinary dashboard to verify image upload

### API Testing with cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"password123"}'

# Get all patients
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/patients

# Search patients (FAST!)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/patients/search?q=john"

# Get all doctors
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/doctors
```

## Troubleshooting

### Backend Won't Start

**Error: `Error: connect ECONNREFUSED 127.0.0.1:27017`**

MongoDB is not running. Either:
1. Start local MongoDB: `mongod` or `sudo systemctl start mongod`
2. Or use MongoDB Atlas (update `MONGODB_URI`)

**Error: `Error: Invalid JWT Secret`**

Update `JWT_SECRET` in `.env` to a non-empty string.

### Frontend Can't Connect to Backend

**Error: `Failed to fetch from API`**

1. Check backend is running on port 3001
2. Check `NEXT_PUBLIC_API_URL=http://localhost:3001/api` in `.env.local`
3. Check CORS is enabled in backend (should be automatic)

### Patient Search Returns No Results

1. Verify backend is running
2. Check MongoDB has patient data: `db.patients.find()`
3. Ensure text indexes are created (automatic with Mongoose)

### Image Upload Fails

1. Verify Cloudinary credentials in `.env`
2. Check file size (must be < 5MB)
3. Verify Cloudinary account is active

### Port Already in Use

**Port 3000 or 3001 already in use:**

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change PORT in backend/.env
PORT=3002
```

## Project Structure

```
clinic-management/
├── frontend/                 # Next.js 15 frontend
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── backend/                  # NestJS backend
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── schemas/         # MongoDB schemas
│   │   ├── modules/         # Feature modules
│   │   ├── config/          # Configuration
│   │   └── common/          # Shared utilities
│   └── package.json
│
└── Documentation
    ├── README.md            # Project overview
    ├── SETUP.md            # This file
    ├── DEPLOYMENT.md       # Production deployment
    └── WORKFLOW_GUIDE.md   # User guide
```

## Development Workflow

### Making Code Changes

1. **Backend Changes:**
   ```bash
   # Changes auto-reload with npm run start:dev
   # Edit files in backend/src/
   # Server restarts automatically
   ```

2. **Frontend Changes:**
   ```bash
   # Changes auto-reload with npm run dev
   # Edit files in app/, components/, lib/
   # Page refreshes automatically
   ```

### Testing Changes

1. Start both servers (backend and frontend)
2. Make changes
3. Test in browser
4. Check console for errors

### Committing Code

```bash
git add .
git commit -m "feat: add patient search optimization"
git push origin main
```

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Backend server port | 3001 |
| NODE_ENV | Environment | development, production |
| MONGODB_URI | Database connection | mongodb://localhost:27017/clinic-db |
| JWT_SECRET | JWT signing secret | any-random-string |
| JWT_EXPIRATION | Token expiry | 7d |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name | your-cloud |
| CLOUDINARY_API_KEY | Cloudinary API key | your-key |
| CLOUDINARY_API_SECRET | Cloudinary API secret | your-secret |
| FRONTEND_URL | Frontend URL | http://localhost:3000 |

### Frontend (`.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:3001/api |

## Next Steps

1. **Explore the codebase**: Check out the modules to understand structure
2. **Read API docs**: See `backend/README.md` for all endpoints
3. **Try all features**: Create patients, appointments, consultations
4. **Test performance**: Patient search should be very fast
5. **Deploy**: Follow `DEPLOYMENT.md` when ready

## Getting Help

### Check These First

1. Terminal error messages - they're usually helpful
2. Browser console (F12) for frontend errors
3. MongoDB Atlas dashboard for database status
4. Cloudinary dashboard for image upload issues

### Common Issues & Solutions

- **MongoDB connection fails?** → Check `MONGODB_URI` and IP whitelist
- **Patient search slow?** → Ensure text indexes are created in MongoDB
- **Image upload fails?** → Verify Cloudinary credentials and file size
- **Login fails?** → Check JWT_SECRET is set and not empty

### Useful Commands

```bash
# Check if port is in use
lsof -i :3000
lsof -i :3001

# Kill process on port
lsof -ti:3001 | xargs kill -9

# Check MongoDB status
mongosh --eval "db.version()"

# View backend logs
npm run start:dev  # Shows real-time logs

# Check installed packages
npm list --depth=0
```

## Performance Tips

1. **Patient Search:**
   - Ensure MongoDB text indexes are active
   - Search returns up to 20 results for performance

2. **Image Uploads:**
   - Optimize images before upload (< 2MB ideal)
   - Cloudinary handles resizing automatically

3. **Database:**
   - Use MongoDB Atlas for better performance
   - Enable compression in connection string

## Security Notes

- Never commit `.env` files to version control
- Change `JWT_SECRET` for production
- Don't share API keys
- Use HTTPS in production
- Implement rate limiting for production

## Support

For issues or questions:
1. Check this guide first
2. Review the code comments
3. Check backend/README.md for API details
4. Review DEPLOYMENT.md for production issues

---

**You're all set! Start developing! 🚀**
