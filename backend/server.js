require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ---- MODELS ----

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' },
});

const eventSchema = new mongoose.Schema({
  date: String,
  title: String,
  desc: String,
});

const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const adminMsgSchema = new mongoose.Schema({
  from: String, // username of user
  text: String,
  createdAt: { type: Date, default: Date.now },
  reply: { type: String, default: '' },
  repliedAt: Date
});

const User     = mongoose.model('User', userSchema);
const Event    = mongoose.model('Event', eventSchema);
const Message  = mongoose.model('Message', messageSchema);
const AdminMsg = mongoose.model('AdminMsg', adminMsgSchema);

// ---- APP SETUP ----

const app = express();

// === CORS CONFIG: allow GitHub Pages frontend ===
app.use(cors({
  origin: [
    "https://danyaari123.github.io", // your GitHub Pages site
    "http://localhost:3000",         // for local dev testing
  ],
  credentials: false // If you use cookies, set true; JWT in header is false
}));

app.use(express.json());

// ---- MONGOOSE CONNECTION ----

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calendar-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// ---- AUTH MIDDLEWARE ----

const auth = (requiredRole) => async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || (requiredRole && user.role !== requiredRole))
      return res.sendStatus(403);
    req.user = user;
    next();
  } catch (err) {
    res.sendStatus(401);
  }
};

// ---- ROUTES ----

// Login (returns JWT + role)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.sendStatus(401);
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, role: user.role });
});

// --- CALENDAR EVENTS ---
app.get('/api/events', async (req, res) => {
  const events = await Event.find();
  res.json(events);
});

app.post('/api/events', auth('admin'), async (req, res) => {
  await Event.create(req.body);
  res.sendStatus(201);
});

app.delete('/api/events/:id', auth('admin'), async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- PUBLIC UPDATES / MESSAGES ---

app.get('/api/messages', async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
});

app.post('/api/messages', auth('admin'), async (req, res) => {
  await Message.create({ user: req.user.username, text: req.body.text });
  res.sendStatus(201);
});

// --- USER TO ADMIN QUESTIONS ---

// User submits question to admins
app.post('/api/ask-admins', auth(), async (req, res) => {
  if (!req.body.text || !req.body.text.trim()) return res.status(400).json({ error: 'Empty message' });
  await AdminMsg.create({ from: req.user.username, text: req.body.text.trim() });
  res.sendStatus(201);
});

// Admin gets all user questions (with replies)
app.get('/api/admin-questions', auth('admin'), async (req, res) => {
  const questions = await AdminMsg.find().sort({ createdAt: -1 });
  res.json(questions);
});

// Users see their own messages and replies
app.get('/api/my-questions', auth(), async (req, res) => {
  const questions = await AdminMsg.find({ from: req.user.username }).sort({ createdAt: -1 });
  res.json(questions);
});

// Admin deletes a user-admin thread
app.delete('/api/admin-questions/:id', auth('admin'), async (req, res) => {
  await AdminMsg.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

// Admin replies to a question
app.post('/api/admin-questions/:id/reply', auth('admin'), async (req, res) => {
  const msg = await AdminMsg.findByIdAndUpdate(
    req.params.id,
    { reply: req.body.reply, repliedAt: new Date() },
    { new: true }
  );
  res.json(msg);
});

// ---- START ----

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
