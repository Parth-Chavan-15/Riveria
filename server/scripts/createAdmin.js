require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

async function createAdmin() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || 'admin@riveria.com').trim().toLowerCase();
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'RiveriaAdmin2026!';
  
  console.log(`Connecting to database to provision admin: ${email}...`);
  await mongoose.connect(env.MONGODB_URI);
  let user = await User.findOne({ email }).select('+password');
  if (!user) {
    user = new User({ email, password, role: 'admin' });
    await user.save();
    console.log(`Created new admin account: ${email}`);
  } else {
    user.role = 'admin';
    if (process.argv[3] || process.env.ADMIN_PASSWORD) {
      user.password = password;
    }
    await user.save();
    console.log(`Updated existing user to admin role: ${email}`);
  }
  await mongoose.disconnect();
}

createAdmin().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
