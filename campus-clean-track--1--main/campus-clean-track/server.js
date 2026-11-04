const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.APP_SECRET || 'dev-secret-change-me';
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const OFFICER_EMAILS = (process.env.OFFICER_EMAILS || 'officer@campus.edu')
  .split(',').map(s => s.trim().toLowerCase());

const POINTS = { report: 25, resolved: 15, firstDrive: 50, pledge: 0 };
const BADGES = [
  { name: 'Eco Champion', min: 400 },
  { name: 'Tree Guardian', min: 250 },
  { name: 'Campus Cleaner', min: 100 },
  { name: 'Sprout', min: 0 },
];
const CATEGORIES = ['Waste Overflow', 'Litter on Lawn', 'Broken Dustbin', 'Water Leakage', 'E-Waste', 'Other'];
const SEVERITIES = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'in_progress', 'resolved'];

// ---------- tiny JSON database ----------
let db;
function save() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
const id = () => crypto.randomBytes(6).toString('hex');
const hoursAgo = h => new Date(Date.now() - h * 3600 * 1000).toISOString();

function seed() {
  const mk = (name, dept, points, reported, resolved) => ({
    id: id(), name, email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@campus.edu',
    dept, role: 'student', points, reported, resolved, joinedDrives: [], pledged: true,
    createdAt: hoursAgo(500),
  });
  const users = [
    mk('Asha Verma', 'Computer Science', 440, 14, 6),
    mk('Rohan Iyer', 'Mechanical', 320, 11, 3),
    mk('Priya Nair', 'Civil', 255, 9, 2),
    mk('Dev Patel', 'Hostels', 165, 6, 1),
    mk('Sneha Rao', 'Admin Staff', 115, 4, 1),
    mk('Karan Mehta', 'Electrical', 100, 3, 0),
    mk('Isha Gupta', 'Biotech', 50, 2, 0),
    mk('Vikram Singh', 'Library', 25, 1, 0),
    mk('Meera Das', 'Chemistry', 15, 0, 0),
  ];
  const asha = users[0];
  const eco = { id: id(), name: 'Eco Volunteer', email: 'eco.volunteer@campus.edu', dept: 'Green Council',
    role: 'student', points: 0, reported: 0, resolved: 0, joinedDrives: [], pledged: false, createdAt: hoursAgo(100) };
  const officer = { id: id(), name: 'Campus Officer', email: 'officer@campus.edu', dept: 'Estate Office',
    role: 'officer', points: 0, reported: 0, resolved: 0, joinedDrives: [], pledged: false, createdAt: hoursAgo(600) };
  users.push(eco, officer);

  const r = (title, description, category, location, severity, status, h, author, upvotes = []) => ({
    id: id(), title, description, category, location, severity, status,
    authorId: author.id, upvotes, createdAt: hoursAgo(h), updatedAt: hoursAgo(h),
    resolvedAt: status === 'resolved' ? hoursAgo(h) : null,
  });
  const others = users.slice(1, 5);
  const reports = [
    r('Browser flow test: litter near the library steps', 'Reported by the tier-1 browser happy-path pass to verify the full reporting flow works end to end.', 'Waste Overflow', 'Academic Block A', 'high', 'pending', 7, eco),
    r('Curl smoke test issue on the west lawn', 'Created by the automated curl smoke test - please ignore.', 'Litter on Lawn', 'West Lawn', 'low', 'resolved', 7, eco, [others[0].id]),
    r('Overflowing waste bin behind Block C canteen', 'The waste bin behind the Block C canteen has not been emptied for two days. Bags are piling up on the pavement and attracting stray animals.', 'Waste Overflow', 'Academic Block C', 'high', 'pending', 13, asha),
    r('Broken dustbin near hostel gate', 'The lid of the dustbin at Hostel Gate 2 is broken and waste spills out when it rains.', 'Broken Dustbin', 'Hostel Gate 2', 'medium', 'in_progress', 30, others[3], [asha.id, others[0].id]),
    r('Plastic bottles scattered on amphitheatre steps', 'After Friday\'s event many plastic bottles and wrappers were left on the amphitheatre steps.', 'Litter on Lawn', 'Amphitheatre', 'medium', 'resolved', 52, others[1], [asha.id]),
    r('Water tap leaking in Block B washroom', 'The tap near the washbasin in the ground floor washroom leaks continuously.', 'Water Leakage', 'Academic Block B', 'medium', 'in_progress', 60, others[2], [others[1].id]),
    r('Old keyboards piled in lab store room', 'Dozens of unusable keyboards and chargers are piling up and need e-waste disposal.', 'E-Waste', 'CS Lab Store', 'low', 'pending', 75, asha, [others[2].id]),
    r('Food waste near mess exit', 'Leftover food is being dumped outside the mess exit instead of the compost bin.', 'Waste Overflow', 'Boys Hostel Mess', 'high', 'resolved', 90, others[3], [asha.id, others[1].id, others[2].id]),
    r('Garden waste not collected', 'Cut grass and branches have been lying beside the sports ground for a week.', 'Other', 'Sports Ground', 'low', 'resolved', 110, others[2]),
    r('Overflowing bins at central cafeteria', 'Both bins at the central cafeteria are full by noon every day.', 'Waste Overflow', 'Central Cafeteria', 'medium', 'pending', 120, others[0], [asha.id]),
  ];
  const drives = [
    { id: id(), title: 'Monsoon Clean-Up Drive', date: '2026-11-07', location: 'West Lawn & Amphitheatre',
      description: 'Join the estate team for a guided clean-up of the west lawn and amphitheatre after the rains. Gloves, bags and refreshments provided — earn +50 green points on your first drive.',
      image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=900&q=70', participants: [users[0].id, users[1].id, users[2].id] },
    { id: id(), title: 'Tree Plantation & Mulching Workshop', date: '2026-11-12', location: 'Botanical Garden',
      description: 'A hands-on plantation workshop with the eco club. Plant a sapling, learn mulching, and adopt a tree for the semester. Certificates for all volunteers.',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=900&q=70', participants: [users[1].id] },
    { id: id(), title: 'E-Waste Collection Day', date: '2026-11-21', location: 'Student Activity Centre',
      description: 'Drop off old chargers, headphones, keyboards and batteries at the collection van outside the Student Activity Centre. Safe disposal certified by the campus Green Council.',
      image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=900&q=70', participants: [] },
  ];
  users.slice(0, 3).forEach(u => u.joinedDrives.push(drives[0].id));
  users[1].joinedDrives.push(drives[1].id);
  db = { users, reports, drives, pledgeCount: 9 };
  save();
}

function load() {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { seed(); }
}
load();

// ---------- helpers ----------
const badgeFor = pts => BADGES.find(b => pts >= b.min).name;
const b64 = s => Buffer.from(s).toString('base64url');
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, dept: u.dept, role: u.role,
  points: u.points, badge: badgeFor(u.points), reported: u.reported, resolved: u.resolved,
  joinedDrives: u.joinedDrives, pledged: u.pledged });
const authorName = uid => (db.users.find(u => u.id === uid) || { name: 'Unknown' }).name;
function publicReport(r, viewer) {
  return { id: r.id, title: r.title, description: r.description, category: r.category,
    location: r.location, severity: r.severity, status: r.status, author: authorName(r.authorId),
    photo: r.photo || null, verified: r.verified ?? r.status !== 'pending',
    upvotes: r.upvotes.length, upvoted: viewer ? r.upvotes.includes(viewer.id) : false,
    createdAt: r.createdAt, updatedAt: r.updatedAt, resolvedAt: r.resolvedAt };
}
function publicDrive(d, viewer) {
  return { id: d.id, title: d.title, date: d.date, location: d.location, description: d.description,
    image: d.image, participants: d.participants.length, joined: viewer ? d.participants.includes(viewer.id) : false };
}
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- app ----------
const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  const h = req.headers.authorization || '';
  const p = verify(h.startsWith('Bearer ') ? h.slice(7) : null);
  req.user = p ? db.users.find(u => u.id === p.uid) || null : null;
  next();
});
const needAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Please sign in first.' });
const needOfficer = (req, res, next) => req.user && req.user.role === 'officer' ? next()
  : res.status(403).json({ error: 'Only campus officers can do this.' });

// simple rate limit for login
const attempts = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(t => now - t < 60000);
  list.push(now); attempts.set(ip, list);
  return list.length > 20;
}

// --- auth (development mode: passwordless email login, matching the UI) ---
function loginAs(email, name) {
  email = email.toLowerCase();
  let u = db.users.find(x => x.email === email);
  if (!u) {
    const nice = name || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    u = { id: id(), name: nice, email, dept: 'Student', role: OFFICER_EMAILS.includes(email) ? 'officer' : 'student',
      points: 0, reported: 0, resolved: 0, joinedDrives: [], pledged: false, createdAt: new Date().toISOString() };
    db.users.push(u); save();
  }
  return { token: sign({ uid: u.id, exp: Date.now() + 7 * 24 * 3600 * 1000 }), user: publicUser(u) };
}
app.post('/api/auth/login', (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
  const email = clean(req.body.email, 120);
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  res.json(loginAs(email, clean(req.body.name, 60)));
});
app.post('/api/auth/google', (req, res) => {
  // Development stand-in for Google OAuth. Replace with real ID-token verification in production.
  res.json(loginAs('google.demo@campus.edu', 'Google Demo'));
});
app.get('/api/auth/me', needAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// --- stats ---
app.get('/api/stats', (_req, res) => {
  res.json({
    resolved: db.reports.filter(r => r.status === 'resolved').length,
    totalReports: db.reports.length,
    greenPoints: db.users.reduce((s, u) => s + u.points, 0),
    volunteers: db.pledgeCount,
  });
});

// --- reports ---
app.get('/api/meta', (_req, res) => res.json({ categories: CATEGORIES, severities: SEVERITIES, statuses: STATUSES, points: POINTS }));

app.get('/api/reports', (req, res) => {
  const { status, limit } = req.query;
  let list = [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (STATUSES.includes(status)) list = list.filter(r => r.status === status);
  if (limit) list = list.slice(0, Math.max(1, Math.min(100, Number(limit) || 10)));
  res.json({ total: list.length, reports: list.map(r => publicReport(r, req.user)) });
});

app.post('/api/reports', needAuth, (req, res) => {
  const title = clean(req.body.title, 120), description = clean(req.body.description, 800);
  const location = clean(req.body.location, 80);
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'Other';
  const severity = SEVERITIES.includes(req.body.severity) ? req.body.severity : 'medium';
  if (title.length < 5) return res.status(400).json({ error: 'Title must be at least 5 characters.' });
  if (!location) return res.status(400).json({ error: 'Please tell us where the issue is.' });
  const photo = typeof req.body.photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(req.body.photo) && req.body.photo.length < 700000 ? req.body.photo : null;
  const now = new Date().toISOString();
  const r = { id: id(), title, description, category, location, severity, status: 'pending', photo, verified: false,
    authorId: req.user.id, upvotes: [], createdAt: now, updatedAt: now, resolvedAt: null };
  db.reports.push(r);
  req.user.reported += 1; req.user.points += POINTS.report;
  save();
  res.status(201).json({ report: publicReport(r, req.user), user: publicUser(req.user), pointsEarned: POINTS.report });
});

app.post('/api/reports/:id/upvote', needAuth, (req, res) => {
  const r = db.reports.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Report not found.' });
  const i = r.upvotes.indexOf(req.user.id);
  if (i >= 0) r.upvotes.splice(i, 1); else r.upvotes.push(req.user.id);
  save();
  res.json({ report: publicReport(r, req.user) });
});

app.patch('/api/reports/:id/status', needOfficer, (req, res) => {
  const r = db.reports.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Report not found.' });
  const status = req.body.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const was = r.status;
  r.status = status; r.updatedAt = new Date().toISOString();
  if (status !== 'pending') r.verified = true;
  if (status === 'resolved' && was !== 'resolved') {
    r.resolvedAt = r.updatedAt;
    const author = db.users.find(u => u.id === r.authorId);
    if (author) { author.points += POINTS.resolved; author.resolved += 1; }
  }
  if (was === 'resolved' && status !== 'resolved') {
    r.resolvedAt = null;
    const author = db.users.find(u => u.id === r.authorId);
    if (author) { author.points = Math.max(0, author.points - POINTS.resolved); author.resolved = Math.max(0, author.resolved - 1); }
  }
  save();
  res.json({ report: publicReport(r, req.user) });
});

app.patch('/api/reports/:id/verify', needOfficer, (req, res) => {
  const r = db.reports.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Report not found.' });
  r.verified = !(r.verified ?? r.status !== 'pending');
  if (!r.verified && r.status !== 'pending') return res.status(400).json({ error: 'Move the report back to Pending first.' });
  r.updatedAt = new Date().toISOString(); save();
  res.json({ report: publicReport(r, req.user) });
});

app.delete('/api/reports/:id', needAuth, (req, res) => {
  const i = db.reports.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Report not found.' });
  const r = db.reports[i];
  if (req.user.role !== 'officer' && r.authorId !== req.user.id) return res.status(403).json({ error: 'Not allowed.' });
  db.reports.splice(i, 1); save();
  res.json({ ok: true });
});

// --- leaderboard ---
app.get('/api/leaderboard', (_req, res) => {
  const rows = db.users.filter(u => u.role === 'student' && (u.points > 0 || u.reported > 0))
    .sort((a, b) => b.points - a.points).slice(0, 20)
    .map((u, i) => ({ rank: i + 1, id: u.id, name: u.name, dept: u.dept, reported: u.reported,
      resolved: u.resolved, points: u.points, badge: badgeFor(u.points) }));
  res.json({ leaders: rows, badges: BADGES });
});

// --- drives ---
app.get('/api/drives', (req, res) => {
  const list = [...db.drives].sort((a, b) => a.date.localeCompare(b.date));
  res.json({ drives: list.map(d => publicDrive(d, req.user)) });
});
app.post('/api/drives/:id/join', needAuth, (req, res) => {
  const d = db.drives.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Drive not found.' });
  let earned = 0;
  const joined = d.participants.includes(req.user.id);
  if (joined) {
    d.participants = d.participants.filter(x => x !== req.user.id);
    req.user.joinedDrives = req.user.joinedDrives.filter(x => x !== d.id);
  } else {
    const first = req.user.joinedDrives.length === 0 && !req.user.firstDriveAwarded;
    d.participants.push(req.user.id); req.user.joinedDrives.push(d.id);
    if (first) { req.user.points += POINTS.firstDrive; req.user.firstDriveAwarded = true; earned = POINTS.firstDrive; }
  }
  save();
  res.json({ drive: publicDrive(d, req.user), user: publicUser(req.user), pointsEarned: earned });
});
app.post('/api/drives', needOfficer, (req, res) => {
  const title = clean(req.body.title, 100), date = clean(req.body.date, 10);
  if (title.length < 4 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Title and date (YYYY-MM-DD) are required.' });
  const d = { id: id(), title, date, location: clean(req.body.location, 80), description: clean(req.body.description, 400),
    image: clean(req.body.image, 300), participants: [] };
  db.drives.push(d); save();
  res.status(201).json({ drive: publicDrive(d, req.user) });
});

// --- pledge ---
app.post('/api/pledge', needAuth, (req, res) => {
  if (!req.user.pledged) {
    req.user.pledged = true; req.user.points += POINTS.pledge; db.pledgeCount += 1; save();
  }
  res.json({ user: publicUser(req.user), volunteers: db.pledgeCount });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error.' }); });

app.listen(PORT, () => console.log(`Campus Clean Track running on http://localhost:${PORT}`));
