const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-db';
const DEFAULT_HOSPITAL_NAME = process.env.DEFAULT_HOSPITAL_NAME || 'Health One Demo Clinic';
const DEFAULT_HOSPITAL_SLUG = process.env.DEFAULT_HOSPITAL_SLUG || 'health-one-demo-clinic';

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    brandColor: { type: String, default: '#275cc2' },
    subscriptionPlan: { type: String, default: 'trial' },
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'past_due', 'suspended', 'cancelled'],
      default: 'trial',
    },
    isActive: { type: Boolean, default: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

async function backfillCollection(db, collectionName, hospitalId) {
  const result = await db.collection(collectionName).updateMany(
    {
      $or: [
        { hospitalId: { $exists: false } },
        { hospitalId: null },
        { hospitalId: '' },
      ],
    },
    {
      $set: { hospitalId },
    }
  );

  console.log(`${collectionName}: ${result.modifiedCount} record(s) assigned`);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);

  const hospital = await Hospital.findOneAndUpdate(
    { slug: DEFAULT_HOSPITAL_SLUG },
    {
      $setOnInsert: {
        name: DEFAULT_HOSPITAL_NAME,
        slug: DEFAULT_HOSPITAL_SLUG,
        subscriptionPlan: 'trial',
        subscriptionStatus: 'trial',
        isActive: true,
        settings: {},
      },
    },
    { new: true, upsert: true }
  );

  const hospitalId = String(hospital._id);
  const db = mongoose.connection.db;
  console.log(`Default hospital: ${hospital.name} (${hospitalId})`);

  const collections = [
    'users',
    'doctors',
    'patients',
    'appointments',
    'consultations',
    'billings',
    'inventories',
    'inventorymovements',
    'reminders',
    'chatmessages',
    'procedureconsumabletemplates',
    'checkins',
  ];

  for (const collectionName of collections) {
    await backfillCollection(db, collectionName, hospitalId);
  }

  const userResult = await db.collection('users').updateMany(
    {
      hospitalId,
      $or: [
        { hospitalSlug: { $exists: false } },
        { hospitalSlug: null },
        { hospitalSlug: '' },
      ],
      isSuperAdmin: { $ne: true },
    },
    {
      $set: { hospitalSlug: DEFAULT_HOSPITAL_SLUG },
    }
  );

  console.log(`users: ${userResult.modifiedCount} hospital slug(s) assigned`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Backfill failed:', error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
