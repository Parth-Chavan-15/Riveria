require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.');
  await mongoose.connect(env.MONGODB_URI);
  let user = await User.findOne({ email }).select('+password');
  if (!user) user = new User({ email, password, role: 'admin' });
  else user.role = 'admin';
  await user.save();
  console.log(`Admin account ready: ${email}`);
  await mongoose.disconnect();
}

createAdmin().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
