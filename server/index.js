require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'santi-rojas-secret-2024';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/* ─── DB ──────────────────────────────────────────────────────────────────── */
const isProduction = process.env.NODE_ENV === 'production';
const DB_PATH = isProduction ? '/tmp/peluqueria.db' : path.join(__dirname, 'peluqueria.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS weekly_schedule (
    weekday INTEGER PRIMARY KEY,
    start_time TEXT,
    end_time TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    total_visits INTEGER DEFAULT 0,
    last_visit TEXT,
    preferred_service TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT DEFAULT '',
    service TEXT NOT NULL DEFAULT 'Corte',
    service_duration INTEGER DEFAULT 30,
    price INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    internal_notes TEXT DEFAULT '',
    source TEXT DEFAULT '',
    cancel_token TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS appointment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER,
    action TEXT NOT NULL,
    actor TEXT DEFAULT 'system',
    old_date TEXT,
    old_time TEXT,
    new_date TEXT,
    new_time TEXT,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS blocked_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL
  );
`);

// Migrate existing appointments table safely
const apptCols = db.prepare('PRAGMA table_info(appointments)').all().map(c => c.name);
if (!apptCols.includes('cancel_token'))    db.exec('ALTER TABLE appointments ADD COLUMN cancel_token TEXT');
if (!apptCols.includes('source'))          db.exec("ALTER TABLE appointments ADD COLUMN source TEXT DEFAULT ''");
if (!apptCols.includes('service_duration'))db.exec('ALTER TABLE appointments ADD COLUMN service_duration INTEGER DEFAULT 30');
if (!apptCols.includes('price'))           db.exec('ALTER TABLE appointments ADD COLUMN price INTEGER DEFAULT 0');
if (!apptCols.includes('internal_notes'))  db.exec("ALTER TABLE appointments ADD COLUMN internal_notes TEXT DEFAULT ''");
if (!apptCols.includes('client_id'))       db.exec('ALTER TABLE appointments ADD COLUMN client_id INTEGER');

/* ─── Seeds ───────────────────────────────────────────────────────────────── */
if (db.prepare('SELECT COUNT(*) as c FROM weekly_schedule').get().c === 0) {
  const ins = db.prepare('INSERT INTO weekly_schedule (weekday,start_time,end_time,active) VALUES (?,?,?,?)');
  ins.run(0,null,null,0); ins.run(1,'09:00','19:00',1); ins.run(2,'09:00','19:00',1);
  ins.run(3,'09:00','19:00',1); ins.run(4,'09:00','19:00',1); ins.run(5,'09:00','19:00',1);
  ins.run(6,'09:00','15:00',1);
}
if (db.prepare('SELECT COUNT(*) as c FROM admin_users').get().c === 0) {
  db.prepare('INSERT INTO admin_users (email,password_hash,name) VALUES (?,?,?)').run('admin@santirojas.com', bcrypt.hashSync('admin123',10), 'Santi Rojas');
}
const defaultConfig = { businessName:'Santi Rojas', address:'Buenos Aires, Argentina', whatsapp:'+5491123456789', email:'info@santirojas.com', slotMinutes:'30', minNoticeMinutes:'60', maxDaysAhead:'30' };
const insConfig = db.prepare('INSERT OR IGNORE INTO config (key,value) VALUES (?,?)');
for (const [k,v] of Object.entries(defaultConfig)) insConfig.run(k,v);

/* ─── Email ───────────────────────────────────────────────────────────────── */
let mailer = null;
if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
}

async function sendMail(to, subject, html) {
  if (!mailer || !to || !to.includes('@')) return;
  try { await mailer.sendMail({ from: process.env.MAIL_FROM || 'Santi Rojas <noreply@santirojas.com>', to, subject, html }); }
  catch (err) { console.error('Email error:', err.message); }
}

function emailBooking(apt, cfg) {
  const cancelLink = `${FRONTEND_URL}/cancelar/${apt.cancel_token}`;
  const waLink = `https://wa.me/${(cfg.whatsapp||'').replace(/\D/g,'')}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
<tr><td align="center" style="padding:40px 16px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid #222;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#1a1400,#111);padding:32px;text-align:center;border-bottom:2px solid #C9A84C;">
  <p style="color:#C9A84C;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">✂️ Barbería Premium</p>
  <h1 style="color:#F5F0E8;font-size:28px;margin:0;font-weight:900">${cfg.businessName}</h1>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="color:#C9A84C;font-size:20px;text-align:center;margin:0 0 24px">¡Turno confirmado!</h2>
  <table width="100%" cellpadding="12" cellspacing="0" style="background:#1a1a1a;border-radius:10px;border:1px solid #2a2a2a;margin-bottom:24px;">
    <tr><td style="color:#888;font-size:13px;border-bottom:1px solid #222;">📅 Fecha</td><td style="color:#F5F0E8;font-weight:700;border-bottom:1px solid #222;">${apt.date}</td></tr>
    <tr><td style="color:#888;font-size:13px;border-bottom:1px solid #222;">🕐 Horario</td><td style="color:#C9A84C;font-weight:700;border-bottom:1px solid #222;">${apt.start_time} — ${apt.end_time} hs</td></tr>
    <tr><td style="color:#888;font-size:13px;border-bottom:1px solid #222;">✂️ Servicio</td><td style="color:#F5F0E8;border-bottom:1px solid #222;">${apt.service}</td></tr>
    <tr><td style="color:#888;font-size:13px;">👤 Cliente</td><td style="color:#F5F0E8;">${apt.client_name}</td></tr>
  </table>
  <p style="color:#888;font-size:13px;text-align:center;margin-bottom:24px">¿Necesitás cancelar? Podés hacerlo hasta 1 hora antes.</p>
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td align="center" style="padding:0 8px;">
      <a href="${cancelLink}" style="display:inline-block;padding:14px 28px;background:#c0392b;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Cancelar turno</a>
    </td>
    <td align="center" style="padding:0 8px;">
      <a href="${waLink}" style="display:inline-block;padding:14px 28px;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">WhatsApp</a>
    </td>
  </tr></table>
  <hr style="border:none;border-top:1px solid #222;margin:28px 0">
  <p style="color:#555;font-size:12px;text-align:center;margin:0">${cfg.address} · ${cfg.whatsapp}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function emailCancellation(apt, cfg, byAdmin = false) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
<tr><td align="center" style="padding:40px 16px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid #222;">
<tr><td style="background:#1a0000;padding:32px;text-align:center;border-bottom:2px solid #c0392b;">
  <h1 style="color:#F5F0E8;font-size:24px;margin:0;font-weight:900">${cfg.businessName}</h1>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="color:#e74c3c;font-size:20px;text-align:center;margin:0 0 16px">Turno cancelado</h2>
  <p style="color:#aaa;text-align:center;margin-bottom:24px;font-size:14px">${byAdmin ? 'El turno fue cancelado por el negocio.' : 'Tu turno fue cancelado correctamente.'}</p>
  <table width="100%" cellpadding="10" cellspacing="0" style="background:#1a1a1a;border-radius:10px;border:1px solid #2a2a2a;margin-bottom:24px;">
    <tr><td style="color:#888;font-size:13px;">📅</td><td style="color:#F5F0E8;">${apt.date} a las ${apt.start_time} hs</td></tr>
    <tr><td style="color:#888;font-size:13px;">✂️</td><td style="color:#F5F0E8;">${apt.service}</td></tr>
  </table>
  <p style="color:#888;font-size:13px;text-align:center;">Podés reservar un nuevo turno cuando quieras.</p>
  <p style="color:#555;font-size:12px;text-align:center;margin-top:24px">${cfg.address} · ${cfg.whatsapp}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function emailReschedule(apt, cfg) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
<tr><td align="center" style="padding:40px 16px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid #222;">
<tr><td style="background:#001a0d;padding:32px;text-align:center;border-bottom:2px solid #C9A84C;">
  <h1 style="color:#F5F0E8;font-size:24px;margin:0;">${cfg.businessName}</h1>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="color:#C9A84C;font-size:20px;text-align:center;margin:0 0 16px">Turno reprogramado</h2>
  <p style="color:#aaa;text-align:center;margin-bottom:24px;font-size:14px">Tu turno fue movido a una nueva fecha y hora.</p>
  <table width="100%" cellpadding="10" cellspacing="0" style="background:#1a1a1a;border-radius:10px;border:1px solid #2a2a2a;margin-bottom:24px;">
    <tr><td style="color:#888;font-size:13px;">📅 Nueva fecha</td><td style="color:#C9A84C;font-weight:700;">${apt.date} a las ${apt.start_time} hs</td></tr>
    <tr><td style="color:#888;font-size:13px;">✂️ Servicio</td><td style="color:#F5F0E8;">${apt.service}</td></tr>
  </table>
  <p style="color:#555;font-size:12px;text-align:center;">${cfg.address} · ${cfg.whatsapp}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/* ─── Auth ────────────────────────────────────────────────────────────────── */
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ ok: false, message: 'No autorizado' });
  try { req.admin = jwt.verify(header.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ ok: false, message: 'Token inválido o expirado' }); }
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function getConfig() {
  return Object.fromEntries(db.prepare('SELECT key,value FROM config').all().map(r => [r.key, r.value]));
}
function getSchedule() {
  return db.prepare('SELECT * FROM weekly_schedule ORDER BY weekday').all();
}
function generateSlots(dateStr, schedule, slotMinutes, appointments, blocks, now, minNotice) {
  const date = new Date(dateStr + 'T00:00:00');
  const weekday = date.getDay();
  const dayConfig = schedule.find(d => d.weekday === weekday);
  if (!dayConfig || !dayConfig.active || !dayConfig.start_time) return [];
  const [sh,sm] = dayConfig.start_time.split(':').map(Number);
  const [eh,em] = dayConfig.end_time.split(':').map(Number);
  const startMins = sh*60+sm, endMins = eh*60+em;
  const minAllowed = new Date(now.getTime() + minNotice*60000);
  const slots = [];
  for (let m = startMins; m < endMins; m += slotMinutes) {
    const hh = String(Math.floor(m/60)).padStart(2,'0');
    const mm = String(m%60).padStart(2,'0');
    const time = `${hh}:${mm}`;
    const slotDt = new Date(`${dateStr}T${time}:00`);
    const isPast = slotDt < minAllowed;
    const isOccupied = appointments.some(a => a.date===dateStr && a.start_time===time && a.status==='confirmed');
    const isBlocked = blocks.some(b => b.date===dateStr && time>=b.start_time && time<b.end_time);
    slots.push({ time, available: !isPast && !isOccupied && !isBlocked, isPast, isOccupied, isBlocked });
  }
  return slots;
}

function upsertClient(name, phone, email, service) {
  const today = new Date().toISOString().split('T')[0];
  let client = db.prepare('SELECT * FROM clients WHERE phone = ?').get(phone);
  if (!client) {
    const r = db.prepare('INSERT INTO clients (name,phone,email,preferred_service,total_visits,last_visit) VALUES (?,?,?,?,1,?)').run(name, phone, email||'', service, today);
    client = db.prepare('SELECT * FROM clients WHERE id = ?').get(r.lastInsertRowid);
  } else {
    db.prepare('UPDATE clients SET total_visits=total_visits+1, last_visit=?, preferred_service=?, name=CASE WHEN ?!=\'\' THEN ? ELSE name END, email=CASE WHEN ?!=\'\' THEN ? ELSE email END WHERE id=?')
      .run(today, service, name, name, email||'', email||'', client.id);
    client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client.id);
  }
  return client;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RUTAS PÚBLICAS
═══════════════════════════════════════════════════════════════════════════ */

app.get('/api/config', (req, res) => {
  const cfg = getConfig();
  const schedule = getSchedule();
  res.json({ ok: true, config: { ...cfg, slotMinutes: parseInt(cfg.slotMinutes), minNoticeMinutes: parseInt(cfg.minNoticeMinutes), maxDaysAhead: parseInt(cfg.maxDaysAhead) }, schedule });
});

app.get('/api/slots', (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ ok: false, message: 'Fecha inválida' });
  const cfg = getConfig();
  const slots = generateSlots(date, getSchedule(), parseInt(cfg.slotMinutes),
    db.prepare('SELECT * FROM appointments WHERE date=?').all(date),
    db.prepare('SELECT * FROM blocks WHERE date=?').all(date),
    new Date(), parseInt(cfg.minNoticeMinutes));
  res.json({ ok: true, slots, date });
});

app.get('/api/blocked-dates', (req, res) => {
  const { from, to } = req.query;
  let q = 'SELECT * FROM blocked_dates WHERE 1=1';
  const params = [];
  if (from) { q += ' AND date >= ?'; params.push(from); }
  if (to)   { q += ' AND date <= ?'; params.push(to); }
  res.json({ ok: true, blockedDates: db.prepare(q).all(...params) });
});

app.post('/api/book', async (req, res) => {
  const { date, time, clientName, clientPhone, clientEmail, service, notes, source } = req.body;
  if (!date || !time || !clientName || !clientPhone)
    return res.status(400).json({ ok: false, message: 'Faltan campos requeridos' });

  const cfg = getConfig();
  const apts = db.prepare('SELECT * FROM appointments WHERE date=?').all(date);
  const blks = db.prepare('SELECT * FROM blocks WHERE date=?').all(date);

  // Check blocked date
  const bdBlocked = db.prepare('SELECT id FROM blocked_dates WHERE date=?').get(date);
  if (bdBlocked) return res.status(409).json({ ok: false, message: 'El día está completamente bloqueado' });

  const slots = generateSlots(date, getSchedule(), parseInt(cfg.slotMinutes), apts, blks, new Date(), parseInt(cfg.minNoticeMinutes));
  const slot = slots.find(s => s.time === time);
  if (!slot?.available) return res.status(409).json({ ok: false, message: 'El horario ya no está disponible' });

  const [h,m] = time.split(':').map(Number);
  const endMins = h*60+m+parseInt(cfg.slotMinutes);
  const endTime = `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`;
  const cancelToken = crypto.randomBytes(32).toString('hex');

  const client = upsertClient(clientName, clientPhone, clientEmail, service);

  const result = db.prepare(`INSERT INTO appointments (date,start_time,end_time,client_name,client_phone,client_email,service,notes,source,cancel_token,status,client_id) VALUES (?,?,?,?,?,?,?,?,?,?,'confirmed',?)`)
    .run(date, time, endTime, clientName, clientPhone, clientEmail||'', service||'Corte', notes||'', source||'', cancelToken, client.id);

  db.prepare('INSERT INTO appointment_history (appointment_id,action,actor) VALUES (?,?,?)').run(result.lastInsertRowid,'created','client');

  const apt = db.prepare('SELECT * FROM appointments WHERE id=?').get(result.lastInsertRowid);
  res.json({ ok: true, appointment: apt });

  sendMail(clientEmail, `Turno confirmado — ${cfg.businessName}`, emailBooking(apt, cfg));
});

// Cancelación pública por token (link del email)
app.get('/api/cancel/:token', async (req, res) => {
  const apt = db.prepare('SELECT * FROM appointments WHERE cancel_token=?').get(req.params.token);
  if (!apt) return res.status(404).json({ ok: false, message: 'Turno no encontrado o ya fue procesado' });
  if (apt.status !== 'confirmed') return res.json({ ok: false, message: 'El turno ya está cancelado o fue atendido' });

  const cfg = getConfig();
  db.prepare("UPDATE appointments SET status='cancelled' WHERE id=?").run(apt.id);
  db.prepare('INSERT INTO appointment_history (appointment_id,action,actor) VALUES (?,?,?)').run(apt.id,'cancelled','client');

  res.json({ ok: true, message: 'Turno cancelado correctamente' });
  sendMail(apt.client_email, `Turno cancelado — ${cfg.businessName}`, emailCancellation(apt, cfg, false));
});

/* ═══════════════════════════════════════════════════════════════════════════
   RUTAS ADMIN
═══════════════════════════════════════════════════════════════════════════ */

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Email y contraseña requeridos' });
  const user = db.prepare('SELECT * FROM admin_users WHERE email=?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ ok: false, message: 'Email o contraseña incorrectos' });
  const token = jwt.sign({ id:user.id, email:user.email, name:user.name }, JWT_SECRET, { expiresIn:'8h' });
  res.json({ ok: true, token, name: user.name });
});

app.get('/api/admin/me', authRequired, (req, res) => res.json({ ok: true, admin: req.admin }));

app.get('/api/admin/agenda', authRequired, (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ ok: false, message: 'Falta parámetro date' });
  const cfg = getConfig();
  const appointments = db.prepare('SELECT * FROM appointments WHERE date=? ORDER BY start_time').all(date);
  const blocks = db.prepare('SELECT * FROM blocks WHERE date=? ORDER BY start_time').all(date);
  const isBlocked = !!db.prepare('SELECT id FROM blocked_dates WHERE date=?').get(date);
  const slots = isBlocked ? [] : generateSlots(date, getSchedule(), parseInt(cfg.slotMinutes), appointments, blocks, new Date(), 0);
  res.json({ ok: true, slots, appointments, blocks, isBlocked, date });
});

app.get('/api/admin/appointments', authRequired, (req, res) => {
  const { date, status, from, to } = req.query;
  let q = 'SELECT * FROM appointments WHERE 1=1';
  const params = [];
  if (date)   { q += ' AND date=?'; params.push(date); }
  if (status) { q += ' AND status=?'; params.push(status); }
  if (from)   { q += ' AND date>=?'; params.push(from); }
  if (to)     { q += ' AND date<=?'; params.push(to); }
  q += ' ORDER BY date,start_time';
  res.json({ ok: true, appointments: db.prepare(q).all(...params) });
});

// Crear turno manualmente (admin)
app.post('/api/admin/appointments', authRequired, async (req, res) => {
  const { date, time, clientName, clientPhone, clientEmail, service, notes, internalNotes, source, price, force } = req.body;
  if (!date || !time || !clientName || !clientPhone)
    return res.status(400).json({ ok: false, message: 'Faltan campos requeridos' });

  if (!force) {
    const bd = db.prepare('SELECT id FROM blocked_dates WHERE date=?').get(date);
    if (bd) return res.status(409).json({ ok: false, message: 'El día está bloqueado. Usar force:true para ignorar.' });
    const occupied = db.prepare("SELECT id FROM appointments WHERE date=? AND start_time=? AND status='confirmed'").get(date, time);
    if (occupied) return res.status(409).json({ ok: false, message: 'Ese horario ya está ocupado' });
  }

  const cfg = getConfig();
  const sm = parseInt(cfg.slotMinutes);
  const [h,m] = time.split(':').map(Number);
  const endMins = h*60+m+sm;
  const endTime = `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`;
  const cancelToken = crypto.randomBytes(32).toString('hex');

  const client = upsertClient(clientName, clientPhone, clientEmail, service);

  const result = db.prepare(`INSERT INTO appointments (date,start_time,end_time,client_name,client_phone,client_email,service,notes,internal_notes,source,price,cancel_token,status,client_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'confirmed',?)`)
    .run(date, time, endTime, clientName, clientPhone, clientEmail||'', service||'Corte', notes||'', internalNotes||'', source||'admin', price||0, cancelToken, client.id);

  db.prepare('INSERT INTO appointment_history (appointment_id,action,actor) VALUES (?,?,?)').run(result.lastInsertRowid,'created','admin');
  const apt = db.prepare('SELECT * FROM appointments WHERE id=?').get(result.lastInsertRowid);
  res.json({ ok: true, appointment: apt });
  if (clientEmail) sendMail(clientEmail, `Turno confirmado — ${cfg.businessName}`, emailBooking(apt, cfg));
});

app.post('/api/admin/appointments/:id/cancel', authRequired, async (req, res) => {
  const apt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!apt) return res.status(404).json({ ok: false, message: 'Turno no encontrado' });
  if (apt.status !== 'confirmed') return res.status(400).json({ ok: false, message: 'El turno no está confirmado' });
  db.prepare("UPDATE appointments SET status='cancelled' WHERE id=?").run(req.params.id);
  db.prepare('INSERT INTO appointment_history (appointment_id,action,actor) VALUES (?,?,?)').run(apt.id,'cancelled','admin');
  res.json({ ok: true });
  const cfg = getConfig();
  if (apt.client_email) sendMail(apt.client_email, `Turno cancelado — ${cfg.businessName}`, emailCancellation(apt, cfg, true));
});

app.post('/api/admin/appointments/:id/status', authRequired, (req, res) => {
  const { status } = req.body;
  if (!['confirmed','cancelled','attended','no-show'].includes(status))
    return res.status(400).json({ ok: false, message: 'Estado inválido' });
  const apt = db.prepare('SELECT id FROM appointments WHERE id=?').get(req.params.id);
  if (!apt) return res.status(404).json({ ok: false, message: 'Turno no encontrado' });
  db.prepare('UPDATE appointments SET status=? WHERE id=?').run(status, req.params.id);
  db.prepare('INSERT INTO appointment_history (appointment_id,action,actor) VALUES (?,?,?)').run(apt.id, status==='attended'?'attended':status==='no-show'?'no-show':'status_change', 'admin');
  res.json({ ok: true });
});

app.put('/api/admin/appointments/:id/reschedule', authRequired, async (req, res) => {
  const { date, time } = req.body;
  const apt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!apt) return res.status(404).json({ ok: false, message: 'Turno no encontrado' });
  if (apt.status !== 'confirmed') return res.status(400).json({ ok: false, message: 'El turno no está confirmado' });

  const occupied = db.prepare("SELECT id FROM appointments WHERE date=? AND start_time=? AND status='confirmed' AND id!=?").get(date, time, apt.id);
  if (occupied) return res.status(409).json({ ok: false, message: 'Ese horario ya está ocupado' });

  const cfg = getConfig();
  const sm = parseInt(cfg.slotMinutes);
  const [h,m] = time.split(':').map(Number);
  const endMins = h*60+m+sm;
  const endTime = `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`;

  db.prepare('INSERT INTO appointment_history (appointment_id,action,actor,old_date,old_time,new_date,new_time) VALUES (?,?,?,?,?,?,?)').run(apt.id,'rescheduled','admin',apt.date,apt.start_time,date,time);
  db.prepare('UPDATE appointments SET date=?,start_time=?,end_time=? WHERE id=?').run(date,time,endTime,apt.id);

  const updated = db.prepare('SELECT * FROM appointments WHERE id=?').get(apt.id);
  res.json({ ok: true, appointment: updated });
  if (apt.client_email) sendMail(apt.client_email, `Turno reprogramado — ${cfg.businessName}`, emailReschedule(updated, cfg));
});

app.put('/api/admin/appointments/:id/internal-notes', authRequired, (req, res) => {
  const { internalNotes } = req.body;
  db.prepare('UPDATE appointments SET internal_notes=? WHERE id=?').run(internalNotes||'', req.params.id);
  res.json({ ok: true });
});

// Blocks (slots individuales)
app.get('/api/admin/blocks', authRequired, (req, res) => {
  const { date } = req.query;
  let q = 'SELECT * FROM blocks';
  const params = [];
  if (date) { q += ' WHERE date=?'; params.push(date); }
  q += ' ORDER BY date,start_time';
  res.json({ ok: true, blocks: db.prepare(q).all(...params) });
});

app.post('/api/admin/blocks', authRequired, (req, res) => {
  const { date, startTime, endTime, reason } = req.body;
  if (!date || !startTime || !endTime) return res.status(400).json({ ok: false, message: 'Faltan campos requeridos' });
  const result = db.prepare('INSERT INTO blocks (date,start_time,end_time,reason) VALUES (?,?,?,?)').run(date,startTime,endTime,reason||'');
  res.json({ ok: true, block: db.prepare('SELECT * FROM blocks WHERE id=?').get(result.lastInsertRowid) });
});

app.delete('/api/admin/blocks/:id', authRequired, (req, res) => {
  if (!db.prepare('SELECT id FROM blocks WHERE id=?').get(req.params.id)) return res.status(404).json({ ok: false, message: 'No encontrado' });
  db.prepare('DELETE FROM blocks WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Blocked dates (días completos)
app.get('/api/admin/blocked-dates', authRequired, (req, res) => {
  res.json({ ok: true, blockedDates: db.prepare('SELECT * FROM blocked_dates ORDER BY date').all() });
});

app.post('/api/admin/blocked-dates', authRequired, (req, res) => {
  const { date, reason } = req.body;
  if (!date) return res.status(400).json({ ok: false, message: 'Falta fecha' });
  try {
    const result = db.prepare('INSERT INTO blocked_dates (date,reason) VALUES (?,?)').run(date, reason||'');
    res.json({ ok: true, blockedDate: db.prepare('SELECT * FROM blocked_dates WHERE id=?').get(result.lastInsertRowid) });
  } catch { res.status(409).json({ ok: false, message: 'Ese día ya está bloqueado' }); }
});

app.delete('/api/admin/blocked-dates/:id', authRequired, (req, res) => {
  if (!db.prepare('SELECT id FROM blocked_dates WHERE id=?').get(req.params.id)) return res.status(404).json({ ok: false, message: 'No encontrado' });
  db.prepare('DELETE FROM blocked_dates WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Clientes (CRM)
app.get('/api/admin/clients', authRequired, (req, res) => {
  const { q } = req.query;
  let query = 'SELECT * FROM clients';
  const params = [];
  if (q) { query += ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?'; params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
  query += ' ORDER BY total_visits DESC, last_visit DESC';
  res.json({ ok: true, clients: db.prepare(query).all(...params) });
});

app.get('/api/admin/clients/:id', authRequired, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id);
  if (!client) return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
  const history = db.prepare('SELECT * FROM appointments WHERE client_id=? ORDER BY date DESC,start_time DESC').all(req.params.id);
  res.json({ ok: true, client, history });
});

app.post('/api/admin/clients', authRequired, (req, res) => {
  const { name, phone, email, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ ok: false, message: 'Nombre y teléfono requeridos' });
  try {
    const r = db.prepare('INSERT INTO clients (name,phone,email,notes) VALUES (?,?,?,?)').run(name, phone, email||'', notes||'');
    res.json({ ok: true, client: db.prepare('SELECT * FROM clients WHERE id=?').get(r.lastInsertRowid) });
  } catch { res.status(409).json({ ok: false, message: 'Ya existe un cliente con ese teléfono' }); }
});

app.put('/api/admin/clients/:id', authRequired, (req, res) => {
  const { name, phone, email, notes, preferred_service } = req.body;
  const client = db.prepare('SELECT id FROM clients WHERE id=?').get(req.params.id);
  if (!client) return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
  db.prepare('UPDATE clients SET name=?,phone=?,email=?,notes=?,preferred_service=? WHERE id=?').run(name,phone,email||'',notes||'',preferred_service||'',req.params.id);
  res.json({ ok: true, client: db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id) });
});

// Schedule
app.get('/api/admin/schedule', authRequired, (req, res) => res.json({ ok: true, schedule: getSchedule() }));

app.put('/api/admin/schedule', authRequired, (req, res) => {
  const { schedule } = req.body;
  if (!Array.isArray(schedule)) return res.status(400).json({ ok: false, message: 'Formato inválido' });
  const upd = db.prepare('UPDATE weekly_schedule SET start_time=?,end_time=?,active=? WHERE weekday=?');
  db.transaction(() => { for (const d of schedule) upd.run(d.start_time||null,d.end_time||null,d.active?1:0,d.weekday); })();
  res.json({ ok: true, schedule: getSchedule() });
});

// Stats
app.get('/api/admin/stats', authRequired, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const monthStart = today.slice(0,7)+'-01';
  res.json({ ok: true,
    stats: {
      todayTotal:  db.prepare("SELECT COUNT(*) as c FROM appointments WHERE date=? AND status='confirmed'").get(today).c,
      weekTotal:   db.prepare("SELECT COUNT(*) as c FROM appointments WHERE date>=? AND status='confirmed'").get(weekStartStr).c,
      monthTotal:  db.prepare("SELECT COUNT(*) as c FROM appointments WHERE date>=? AND status='confirmed'").get(monthStart).c,
      cancelled:   db.prepare("SELECT COUNT(*) as c FROM appointments WHERE date>=? AND status='cancelled'").get(monthStart).c,
      totalClients: db.prepare('SELECT COUNT(*) as c FROM clients').get().c,
    },
    todayApts: db.prepare("SELECT * FROM appointments WHERE date=? ORDER BY start_time").all(today)
  });
});

// Analytics
app.get('/api/admin/analytics', authRequired, (req, res) => {
  const byDayOfWeek = db.prepare(`
    SELECT CAST(strftime('%w', date) AS INTEGER) as dow, COUNT(*) as count
    FROM appointments WHERE status IN ('confirmed','attended') GROUP BY dow ORDER BY dow
  `).all();

  const byService = db.prepare(`
    SELECT service, COUNT(*) as count FROM appointments
    WHERE status IN ('confirmed','attended') GROUP BY service ORDER BY count DESC LIMIT 8
  `).all();

  const byHour = db.prepare(`
    SELECT start_time, COUNT(*) as count FROM appointments
    WHERE status IN ('confirmed','attended') GROUP BY start_time ORDER BY start_time
  `).all();

  const monthlyRaw = db.prepare(`
    SELECT substr(date,1,7) as month,
      COUNT(*) as total,
      SUM(CASE WHEN (SELECT COUNT(*) FROM appointments a2 WHERE a2.client_phone=appointments.client_phone AND a2.date < appointments.date)=0 THEN 1 ELSE 0 END) as new_clients
    FROM appointments WHERE status IN ('confirmed','attended')
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all().reverse();

  const currentMonth = new Date().toISOString().slice(0,7);
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth()-1)).toISOString().slice(0,7);

  const revCurrent = db.prepare("SELECT SUM(price) as rev FROM appointments WHERE substr(date,1,7)=? AND status IN ('confirmed','attended')").get(currentMonth);
  const revLast    = db.prepare("SELECT SUM(price) as rev FROM appointments WHERE substr(date,1,7)=? AND status IN ('confirmed','attended')").get(lastMonth);
  const totalClients = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
  const vipClients   = db.prepare('SELECT COUNT(*) as c FROM clients WHERE total_visits >= 10').get().c;

  res.json({ ok: true, byDayOfWeek, byService, byHour, monthlyStats: monthlyRaw,
    revenue: { current: revCurrent.rev||0, last: revLast.rev||0 },
    clients: { total: totalClients, vip: vipClients }
  });
});

// Config
app.put('/api/admin/config', authRequired, (req, res) => {
  const allowed = ['businessName','address','whatsapp','email','slotMinutes','minNoticeMinutes','maxDaysAhead'];
  const upd = db.prepare('INSERT OR REPLACE INTO config (key,value) VALUES (?,?)');
  db.transaction(() => { for (const k of allowed) if (req.body[k]!==undefined) upd.run(k,String(req.body[k])); })();
  res.json({ ok: true, config: getConfig() });
});

app.post('/api/admin/change-password', authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM admin_users WHERE id=?').get(req.admin.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ ok: false, message: 'Contraseña actual incorrecta' });
  if (newPassword.length < 6) return res.status(400).json({ ok: false, message: 'Mínimo 6 caracteres' });
  db.prepare('UPDATE admin_users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword,10), req.admin.id);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

/* ─── Start ───────────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`✂️  Santi Rojas API en http://localhost:${PORT}`);
  console.log(`📋 Admin: admin@santirojas.com / admin123`);
  if (!mailer) console.log('⚠️  Email no configurado (MAIL_HOST/MAIL_USER/MAIL_PASS en .env)');
});
