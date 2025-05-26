const mongoose = require('mongoose');
const eventSchema = new mongoose.Schema({
  date: String,
  title: String,
  desc: String,
});
module.exports = mongoose.model('Event', eventSchema);
