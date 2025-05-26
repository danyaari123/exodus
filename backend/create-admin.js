const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('C:/Users/User/Desktop/exodus/calendar-app/backend/models/User.js');

async function createAdmin() {
  await mongoose.connect('mongodb://localhost:27017/calendar-app');
  const hash = await bcrypt.hash('admin123', 10);
  await User.create({ username: 'admin', password: hash, role: 'admin' });
  console.log('Admin user created!');
  process.exit();
}

createAdmin();
