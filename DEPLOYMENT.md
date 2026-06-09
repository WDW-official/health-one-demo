# Deployment Guide - Health One Dental Clinic

Complete guide for deploying the full-stack application.

## Architecture Overview

```
Frontend (Next.js 15)  ------>  Backend (NestJS)  ------>  MongoDB
   Port 3000                      Port 3001                 
   (Vercel)                      (Vercel, AWS, etc)    (MongoDB Atlas)
                                                 |
                                            Cloudinary
                                         (Image Storage)
```

## Prerequisites

1. **Frontend Hosting**: Vercel, Netlify, or similar
2. **Backend Hosting**: Vercel, AWS, DigitalOcean, Heroku, or Render
3. **Database**: MongoDB Atlas (recommended for cloud deployment)
4. **Storage**: Cloudinary account (free tier available)
5. **Domain**: Optional, for custom domain

## Step 1: Setup MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (Free tier is sufficient for testing)
4. Create a database user with strong password
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/clinic-db`
6. Update `MONGODB_URI` in backend environment

## Step 2: Setup Cloudinary

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for free account
3. Go to Dashboard to find:
   - Cloud Name
   - API Key
   - API Secret
4. Store these securely for backend configuration

## Step 3: Deploy Backend

### Option A: Deploy to Vercel

1. Push backend code to GitHub
2. Go to Vercel dashboard
3. Import project, select the `backend` directory as root
4. Add environment variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your-super-secret-key
   JWT_EXPIRATION=7d
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   FRONTEND_URL=https://your-frontend-domain.com
   NODE_ENV=production
   ```
5. Deploy

Backend URL will be: `https://your-vercel-project.vercel.app/api`

### Option B: Deploy to AWS EC2

1. Launch EC2 instance (Ubuntu 20.04)
2. SSH into instance
3. Install Node.js:
   ```bash
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Install MongoDB (or use Atlas)
5. Clone repository and install dependencies:
   ```bash
   git clone your-repo-url
   cd backend
   npm install
   npm run build
   ```
6. Setup environment file
7. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start "npm run start:prod" --name clinic-api
   pm2 startup
   pm2 save
   ```
8. Setup Nginx as reverse proxy (optional but recommended)

### Option C: Deploy to Render

1. Push code to GitHub
2. Go to Render dashboard
3. Create new Web Service
4. Connect GitHub repository
5. Set build command: `npm install && npm run build`
6. Set start command: `npm run start:prod`
7. Add environment variables
8. Deploy

## Step 4: Deploy Frontend

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Go to Vercel dashboard
3. Import project (root directory)
4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url/api
   ```
5. Deploy

Frontend URL will be: `https://your-frontend-project.vercel.app`

### Deploy to Netlify

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run: `npm run build`
3. Deploy: `netlify deploy --prod --dir=.next`

## Step 5: Configure CORS

Update backend's CORS settings in `main.ts`:

```typescript
app.enableCors({
  origin: 'https://your-frontend-domain.com',
  credentials: true,
});
```

## Step 6: Database Setup & Migration

### Initialize MongoDB Collections and Indexes

Connect to MongoDB and create initial data:

```javascript
// Collections will auto-create with Mongoose
// Indexes are defined in schemas automatically

// Optional: Seed initial admin user
db.users.insertOne({
  email: 'admin@clinic.com',
  password: 'hashed_password',
  name: 'Admin User',
  role: 'admin',
  isActive: true
})
```

## Step 7: Testing

### Test Backend API

```bash
# Test patient search (fastest endpoint)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-backend-url/api/patients/search?q=john"

# Test doctor listing
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-backend-url/api/doctors"
```

### Test Frontend

1. Open `https://your-frontend-domain.com`
2. Login with credentials
3. Test patient search
4. Verify image uploads to Cloudinary
5. Check appointment calendar functionality

## Performance Optimization

### Backend

1. **Enable MongoDB compression**: Add to connection string
2. **Use read replicas** for scaling
3. **Implement caching** with Redis (optional)
4. **Monitor with**: New Relic, DataDog, or CloudWatch

### Frontend

1. **Vercel Analytics**: Automatic with Vercel deployment
2. **Image optimization**: Already configured with Next.js Image
3. **Bundle analysis**: `npm run build -- --analyze`

## Security Checklist

- [ ] Change JWT_SECRET to strong random string
- [ ] Use HTTPS everywhere
- [ ] Enable MongoDB network access restrictions
- [ ] Setup rate limiting on API
- [ ] Enable CORS only for your domain
- [ ] Use environment variables for all secrets
- [ ] Enable database backups
- [ ] Setup monitoring and alerts
- [ ] Regular security updates

## Environment Variables Checklist

### Backend Production
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=very-long-random-string
JWT_EXPIRATION=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=https://your-domain.com
NODE_ENV=production
PORT=3001
```

### Frontend Production
```
NEXT_PUBLIC_API_URL=https://your-backend-url/api
```

## Troubleshooting

### Backend won't connect to MongoDB
- Check connection string
- Verify IP whitelist in MongoDB Atlas
- Test with: `mongosh "your-connection-string"`

### CORS errors
- Verify FRONTEND_URL in backend
- Check browser console for exact URL
- Update CORS origin to match exactly

### Image upload fails
- Verify Cloudinary credentials
- Check file size limit (5MB)
- Verify network access to Cloudinary

### Patient search slow
- Ensure text indexes are created in MongoDB
- Check MongoDB Atlas performance metrics
- Consider adding read replicas

## Monitoring & Logging

### Backend Logs
- Vercel: Real-time logs in dashboard
- AWS: CloudWatch logs
- Self-hosted: Check PM2 logs with `pm2 logs`

### Database Monitoring
- MongoDB Atlas has built-in monitoring
- Set up alerts for slow queries

## Scaling

As traffic grows:

1. **Add database read replicas**
2. **Implement Redis caching** for frequently accessed data
3. **Use CDN** for static assets
4. **Implement API rate limiting**
5. **Scale backend horizontally** with load balancer

## Rollback Procedure

1. Keep previous working versions deployed
2. Backend: Use Vercel's automatic rollback or redeploy previous commit
3. Frontend: Same as backend
4. Database: MongoDB Atlas has built-in backups

## Support & Updates

- Monitor NestJS changelog: https://nestjs.com/
- Monitor Next.js releases: https://nextjs.org/
- Keep dependencies updated: `npm outdated`
- Security patches: `npm audit`

## Cost Estimation (Monthly)

- **Vercel Frontend**: Free tier or $20/mo Pro
- **Vercel Backend**: $20/mo (on Pro)
- **MongoDB Atlas**: Free tier (small apps) or $57/mo (M10)
- **Cloudinary**: Free tier (excellent for starting)
- **Total**: $40-100/month for production

**Free tier**: Frontend + Backend on free Vercel, MongoDB Atlas free, Cloudinary free = $0
