const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-db';

const patientSchema = new mongoose.Schema(
  {
    mrn: String,
    email: String,
    phone: String,
    medicalHistory: String,
  },
  { timestamps: true, strict: false }
);

function stripImportPhoneSuffix(phone) {
  return String(phone || '').replace(/-ARC[A-Z0-9]+$/i, '');
}

function cleanEmail(email) {
  const value = String(email || '').trim();

  if (!value || value.toLowerCase().endsWith('@legacy.local')) {
    return 'Not provided';
  }

  return value.replace(/\+arc[a-z0-9-]+@/i, '@');
}

async function dropIndexIfExists(collection, indexName) {
  const indexes = await collection.indexes();
  if (indexes.some((index) => index.name === indexName)) {
    await collection.dropIndex(indexName);
    console.log(`Dropped index: ${indexName}`);
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
  await dropIndexIfExists(Patient.collection, 'email_1');
  await dropIndexIfExists(Patient.collection, 'phone_1');

  const patients = await Patient.find({
    $or: [
      { email: /@legacy\.local$/i },
      { email: /\+arc[a-z0-9-]+@/i },
      { phone: /-ARC[A-Z0-9]+$/i },
      { medicalHistory: /Legacy ID:/i },
    ],
  });

  let updated = 0;

  for (const patient of patients) {
    const nextEmail = cleanEmail(patient.email);
    const nextPhone = stripImportPhoneSuffix(patient.phone);

    if (patient.email !== nextEmail || patient.phone !== nextPhone) {
      patient.email = nextEmail;
      patient.phone = nextPhone || 'Not provided';
      await patient.save();
      updated += 1;
    }
  }

  console.log(`Cleaned ${updated} legacy imported patient record${updated === 1 ? '' : 's'}.`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Cleanup failed:', error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
