# MongoDB Setup Guide

Complete guide for setting up MongoDB locally and with MongoDB Atlas for the Health One Dental Clinic system.

## Local MongoDB Setup

### Installation

#### macOS (Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Windows
1. Download from https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. MongoDB will run as a Windows Service automatically

#### Linux (Ubuntu)
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

### Verify Installation

```bash
mongosh
db.adminCommand('ping')
```

## MongoDB Atlas Cloud Setup (Recommended)

MongoDB Atlas is the official MongoDB cloud platform - free tier available.

### Step 1: Create an Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Complete the verification process

### Step 2: Create a Cluster
1. Click "Create a Database"
2. Choose the **Free** tier (M0 Sandbox)
3. Select your region (closest to your location for best performance)
4. Give it a name: `clinic-db` or similar
5. Click "Create Deployment"

### Step 3: Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development, add `0.0.0.0/0` (allows all IPs)
4. For production, add your specific server IP
5. Click "Confirm"

### Step 4: Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Set username and password (save these!)
4. Grant role: "Atlas Admin" for development
5. Click "Add User"

### Step 5: Get Connection String
1. Go to your Cluster
2. Click "Connect"
3. Choose "Drivers"
4. Select Node.js and version 4.1 or later
5. Copy the connection string

The connection string will look like:
```
mongodb+srv://username:password@cluster.mongodb.net/clinic-db?retryWrites=true&w=majority
```

Replace:
- `username` - Your database user
- `password` - Your database password
- `cluster` - Your cluster name

## Update Environment Variables

### Local Development (.env.local)
```env
MONGODB_URI=mongodb://localhost:27017/clinic-db
JWT_SECRET=dev-secret-key-change-in-production
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Production (.env.production)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clinic-db?retryWrites=true&w=majority
JWT_SECRET=your-secure-production-secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Database Collections

The application automatically creates these collections with indexes:

### Collections
1. **users** - Authentication and user management
2. **patients** - Patient records with text search indexes
3. **doctors** - Doctor profiles and availability
4. **appointments** - Appointment scheduling
5. **consultations** - Medical consultation records

### Indexes

#### Patient Collection (Fast Search)
```javascript
// Text index for search
db.patients.createIndex({
  firstName: "text",
  lastName: "text",
  email: "text",
  phone: "text"
});

// Single field indexes
db.patients.createIndex({ email: 1 });
db.patients.createIndex({ phone: 1 });
db.patients.createIndex({ assignedDoctorId: 1 });
db.patients.createIndex({ isActive: 1 });
```

#### Appointment Collection (Calendar Queries)
```javascript
db.appointments.createIndex({ patientId: 1, status: 1 });
db.appointments.createIndex({ doctorId: 1, status: 1 });
db.appointments.createIndex({ dateTime: 1, status: 1 });
```

## Verify Database Connection

Test the connection from your Next.js app:

```bash
npm run dev
```

Check your terminal for successful connection messages.

## Mongoose Features Used

The application uses Mongoose with these features:

1. **Schema Validation** - Automatic validation on save
2. **Pre-hooks** - Password hashing before user save
3. **Indexes** - Optimized queries
4. **Soft Deletes** - Mark inactive instead of deleting
5. **Timestamps** - Auto `createdAt` and `updatedAt`
6. **Methods** - Custom methods like `comparePassword()`

## Database Backup & Restore

### MongoDB Atlas Backup
1. Go to your Cluster
2. Click "Backup"
3. Backups are automatic (daily for free tier)
4. To restore, click "Restore" on a snapshot

### Manual Local Backup
```bash
# Export data
mongoexport --db clinic-db --collection patients --out patients.json

# Import data
mongoimport --db clinic-db --collection patients --file patients.json
```

## Monitoring & Performance

### Monitor Atlas Cluster
1. Go to your Cluster
2. Click "Monitoring"
3. View:
   - Query efficiency
   - Network I/O
   - Storage usage
   - Connection count

### Performance Tips

1. **Use Text Indexes** - For patient search (already configured)
2. **Compound Indexes** - For common multi-field queries
3. **Connection Pooling** - Mongoose handles this automatically
4. **Avoid Large Projections** - Only fetch needed fields
5. **Pagination** - Use limit/skip for large datasets

## Troubleshooting

### Connection Refused
**Local MongoDB:**
```bash
# Check if MongoDB is running
mongosh

# If not, start it
mongod
```

**Atlas Connection:**
- Check IP whitelist includes your IP
- Verify username/password
- Check network connectivity
- Verify connection string format

### Slow Queries
1. Check indexes exist with `db.collection.getIndexes()`
2. Use MongoDB compass for query analysis
3. Check MongoDB Atlas metrics

### Database Too Large
- Clean up old consultations
- Archive old appointments
- Consider sharding for production

## MongoDB Compass (Visual Tool)

MongoDB Compass is a GUI tool for MongoDB:

1. Download from https://www.mongodb.com/products/tools/compass
2. Connect to your MongoDB instance
3. Browse collections
4. Run queries visually
5. Create indexes

## Next Steps

1. Install MongoDB locally or create Atlas account
2. Update `.env.local` with connection string
3. Run `npm run dev`
4. Test API endpoints with the patient search: `/api/patients/search?q=john`

Performance should be instant (<50ms) for patient search even with 1000+ records!
