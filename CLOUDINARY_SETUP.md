# Cloudinary Setup Guide

Complete guide for integrating Cloudinary for image storage in the Health One Dental Clinic system.

## What is Cloudinary?

Cloudinary is a cloud-based image and video hosting service that provides:
- Automatic image optimization
- Responsive image delivery
- Image transformations
- CDN distribution
- Free tier (25GB/month)

## Account Setup

### Step 1: Create Account
1. Go to https://cloudinary.com/users/register/free
2. Sign up with email
3. Verify your email
4. Complete profile setup

### Step 2: Dashboard
After login, you'll see your Dashboard with:
- Cloud Name
- API Key
- API Secret

**Keep these credentials secure!**

### Step 3: Get Your Credentials

In your Cloudinary Dashboard:
1. Go to "Settings" (gear icon)
2. Click "API Keys" tab
3. You'll see:
   - **Cloud Name** - Your unique identifier
   - **API Key** - Public key
   - **API Secret** - Keep this private!

## Environment Variables

Add to your `.env.local`:

```env
# Public - can be exposed
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# Private - keep secret
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## API Endpoint Usage

### Upload Image
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('folder', 'patients'); // or 'doctors'

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

const { url, publicId } = await response.json();
```

### Delete Image
```javascript
// When updating patient/doctor image
await deleteImage(publicId);
```

## Folder Structure

Organization in Cloudinary:

```
clinic/
├── patients/
│   ├── patient1-id.jpg
│   ├── patient2-id.jpg
│   └── ...
├── doctors/
│   ├── doctor1-id.jpg
│   ├── doctor2-id.jpg
│   └── ...
└── other/
```

## Storage Limits

**Free Tier:**
- 25GB total storage
- 50,000 transformations/month
- Up to 10 concurrent uploads

**Paid Plans:**
- Starting at $89/month
- Unlimited storage
- More transformations

## Image Optimization

Cloudinary automatically:
- Compresses images (50-80% reduction)
- Serves optimal format (WebP for modern browsers)
- Responsive delivery based on device
- CDN distribution for fast loading

## Advanced Features (Optional)

### Image Transformations
```javascript
// Resize and crop
const url = `https://res.cloudinary.com/${cloudName}/image/upload/w_300,h_300,c_fill/v1/clinic/patients/photo.jpg`;

// Add watermark
const url = `https://res.cloudinary.com/${cloudName}/image/upload/l_text:Arial_30:Protected,w_300,h_100,c_fit/v1/clinic/patients/photo.jpg`;

// Apply filters
const url = `https://res.cloudinary.com/${cloudName}/image/upload/e_sepia/v1/clinic/patients/photo.jpg`;
```

### Signed URLs (Security)
For production, use signed URLs:

```javascript
import { v2 as cloudinary } from 'cloudinary';

const signedUrl = cloudinary.url('clinic/patients/photo.jpg', {
  sign_url: true,
  type: 'authenticated',
});
```

## Next.js Image Component Integration

### Using Next.js Image Component
```jsx
import Image from 'next/image';

export default function PatientProfile({ imageUrl }) {
  return (
    <Image
      src={imageUrl}
      alt="Patient photo"
      width={300}
      height={300}
      // Cloudinary will optimize automatically
    />
  );
}
```

### Configure next.config.js
```javascript
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};
```

## Upload Form Example

```jsx
import { useState } from 'react';

export default function ImageUpload({ folder = 'patients' }) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const { url } = await res.json();
      setImageUrl(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {imageUrl && <img src={imageUrl} alt="Uploaded" />}
    </div>
  );
}
```

## Security Best Practices

1. **Keep API Secret Safe**
   - Never expose in frontend code
   - Never commit to version control
   - Use environment variables

2. **Signed URLs** - For sensitive images

3. **Access Control** - Cloudinary Dashboard:
   - Go to Settings → Security
   - Configure allowed domains
   - Enable CORS if needed

4. **File Size Limits**
   - Frontend: Validate before upload
   - Backend: Check in `/api/upload`

## Monitoring & Analytics

### Storage & Bandwidth
1. Dashboard → Analytics
2. View storage usage
3. Monitor bandwidth costs
4. Track transformation usage

### Audit
1. Dashboard → API Keys
2. Can view upload history
3. Monitor API usage

## Troubleshooting

### Upload Fails
1. Check API credentials are correct
2. Verify `.env.local` has right values
3. Check file size (< 100MB recommended)
4. Check file format (JPG, PNG, WebP, etc.)

### Image Not Loading
1. Check URL is accessible
2. Verify Cloudinary domain is in CORS whitelist
3. Check if image was deleted from Cloudinary

### Slow Uploads
1. Cloudinary usually < 2s per image
2. Check internet connection
3. Large files may need optimization

## Free Tier vs Paid

| Feature | Free | Paid |
|---------|------|------|
| Storage | 25GB | Unlimited |
| Bandwidth | 50GB/month | Unlimited |
| Transformations | 50,000/month | Unlimited |
| API Rate Limit | 500 req/hour | Higher |
| Support | Community | Email |
| Cost | Free | From $89/month |

## Migration

If switching image providers:

1. **Export current images** from old provider
2. **Bulk upload** to Cloudinary
3. **Update database** with new Cloudinary URLs
4. **Test** all image references
5. **Delete** old provider account (after verification)

## Advanced Use Cases

### Real-time Collaboration
- Share images with edit permissions
- Cloudinary provides sharing links

### Analytics
- Track which images viewed most
- Patient profile image popularity

### Compliance
- HIPAA compliance available on Enterprise plan
- For sensitive medical images

## Next Steps

1. Create Cloudinary account
2. Copy Cloud Name, API Key, API Secret
3. Add to `.env.local`
4. Test image upload with `/api/upload` endpoint
5. Verify images appear in Cloudinary Dashboard

Images are now cloud-hosted with automatic optimization and CDN delivery!
