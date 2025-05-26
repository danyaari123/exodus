const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('C:/Users/User/Desktop/exodus/calendar-app/backend/models/User'); 

const username = process.argv[2];
const password = process.argv[3];
const role = process.argv[4] || 'user';

if (!username || !password) {
  console.log('Usage: node add-user.js <username> <password> [role]');
  process.exit(1);
}

async function createUser() {
  await mongoose.connect('mongodb://localhost:27017/calendar-app');
  const hash = await bcrypt.hash(password, 10);
  await User.create({ username, password: hash, role });
  console.log(`User "${username}" (${role}) created!`);
  process.exit();
}

createUser();
