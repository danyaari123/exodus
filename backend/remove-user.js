const mongoose = require('mongoose');
const User = require('./models/User');

const username = process.argv[2];

if (!username) {
  console.log('Usage: node remove-user.js <username>');
  process.exit(1);
}

async function removeUser() {
  await mongoose.connect('mongodb://localhost:27017/calendar-app');
  const res = await User.deleteOne({ username });
  console.log('Removed:', res);
  process.exit();
}

removeUser();
