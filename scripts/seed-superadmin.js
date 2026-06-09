const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-db';
const EMAIL = process.env.SEED_SUPERADMIN_EMAIL || 'admin@clinic.com';
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'password123';
const NAME = process.env.SEED_SUPERADMIN_NAME || 'Super Admin';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'doctor'], default: 'admin' },
    isSuperAdmin: { type: Boolean, default: false },
    doctorId: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

async function main() {
  await mongoose.connect(MONGODB_URI);

  const User = mongoose.models.User || mongoose.model('User', userSchema);
  const existing = await User.findOne({ email: EMAIL.toLowerCase() });

  if (existing) {
    existing.name = NAME;
    existing.role = 'admin';
    existing.isSuperAdmin = true;
    existing.doctorId = null;
    existing.password = PASSWORD;
    await existing.save();
    console.log(`Updated existing user and promoted to superadmin: ${EMAIL}`);
  } else {
    const user = new User({
      email: EMAIL.toLowerCase(),
      password: PASSWORD,
      name: NAME,
      role: 'admin',
      isSuperAdmin: true,
      doctorId: null,
    });
    await user.save();
    console.log(`Created superadmin: ${EMAIL}`);
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Seed failed:', error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
