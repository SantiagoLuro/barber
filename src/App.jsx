import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, MapPin, Phone, Mail, User, Settings,
  LogOut, Menu, X, ChevronLeft, ChevronRight, Scissors,
  Star, CheckCircle, AlertCircle, Lock, Unlock, BarChart3,
  Shield, RefreshCw, Eye, EyeOff, Trash2, Ban, Check,
  ChevronDown, Users, TrendingUp, Plus, ExternalLink, Instagram
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import AdminCRM from '@/admin/AdminCRM';
import AdminAnalytics from '@/admin/AdminAnalytics';
import AdminCreateAppointment from '@/admin/AdminCreateAppointment';

/* ─── Config ──────────────────────────────────────────────────────────────── */
const API = import.meta.env.VITE_API_URL || '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('adminToken');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error de servidor');
  return data;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SERVICES = ['Corte clásico', 'Corte moderno', 'Barba', 'Corte + Barba', 'Degradé', 'Diseño de cejas'];

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } }
};

/* ─── App ─────────────────────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPage, setAdminPage] = useState('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [config, setConfig] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    apiFetch('/config').then(d => setConfig(d.config)).catch(() => {
      setConfig({ businessName: 'Santi Rojas', whatsapp: '+5491123456789', email: 'info@santirojas.com', address: 'Buenos Aires, Argentina', slotMinutes: 30, minNoticeMinutes: 60, maxDaysAhead: 30 });
    });
    const token = localStorage.getItem('adminToken');
    if (token) {
      apiFetch('/admin/me').then(() => { setIsAdmin(true); }).catch(() => localStorage.removeItem('adminToken'));
    }
  }, []);

  const handleLogin = useCallback(async (email, password) => {
    const data = await apiFetch('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('adminToken', data.token);
    setIsAdmin(true);
    setPage('admin');
    toast({ title: `¡Bienvenido, ${data.name}!` });
  }, [toast]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken');
    setIsAdmin(false);
    setPage('home');
    setAdminPage('dashboard');
    toast({ title: 'Sesión cerrada' });
  }, [toast]);

  if (!config) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Scissors size={40} color="var(--gold)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: 'var(--gray-light)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>
      <Toaster />
      <a href={`https://wa.me/${config.whatsapp?.replace('+','')}`} className="float-wa" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
        <Phone size={22} />
      </a>

      {isAdmin ? (
        <AdminPanel page={adminPage} setPage={setAdminPage} onLogout={handleLogout} config={config} setConfig={setConfig} toast={toast} />
      ) : (
        <>
          <PublicNav page={page} setPage={setPage} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} config={config} />
          <AnimatePresence mode="wait">
            {page === 'home'    && <HomePage    key="home"    setPage={setPage} config={config} />}
            {page === 'booking' && <BookingPage key="booking" config={config} toast={toast} />}
            {page === 'contact' && <ContactPage key="contact" config={config} />}
            {page === 'login'   && <LoginPage   key="login"   onLogin={handleLogin} toast={toast} />}
          </AnimatePresence>
          <PublicFooter config={config} setPage={setPage} />
        </>
      )}
    </div>
  );
}

/* ─── PublicNav ───────────────────────────────────────────────────────────── */
function PublicNav({ page, setPage, mobileMenu, setMobileMenu, config }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const nav = [{ id: 'home', label: 'Inicio' }, { id: 'booking', label: 'Reservar' }, { id: 'contact', label: 'Contacto' }];

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: scrolled ? 'rgba(10,10,10,0.97)' : 'transparent', borderBottom: scrolled ? '1px solid rgba(201,168,76,0.1)' : '1px solid transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none', transition: 'all 0.3s' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: 68 }}>
        <button onClick={() => setPage('home')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <Scissors size={22} color="var(--gold)" />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.05em' }}>{config.businessName}</span>
        </button>

        <nav style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }} className="pub-nav">
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 8, color: page === n.id ? 'var(--gold)' : 'var(--gray-light)', fontWeight: 500, fontSize: 14, transition: 'color 0.2s' }}>{n.label}</button>
          ))}
          <button onClick={() => setPage('login')} style={{ marginLeft: 8, background: 'none', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '7px 16px', color: 'var(--gray-light)', fontSize: 13, cursor: 'pointer' }}>Admin</button>
          <button onClick={() => setPage('booking')} className="btn-gold" style={{ marginLeft: 12, padding: '10px 20px', fontSize: 13 }}>
            <Calendar size={14} /> Reservar
          </button>
        </nav>

        <button onClick={() => setMobileMenu(!mobileMenu)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cream)', display: 'none' }} className="ham-btn">
          {mobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenu && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: 'var(--dark)', borderTop: '1px solid rgba(201,168,76,0.1)', padding: '12px 24px 20px' }}>
            {[...nav, { id: 'login', label: 'Admin' }].map(n => (
              <button key={n.id} onClick={() => { setPage(n.id); setMobileMenu(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', color: page === n.id ? 'var(--gold)' : 'var(--cream)', fontSize: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {n.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@media(max-width:768px){.pub-nav{display:none!important;}.ham-btn{display:flex!important;}}`}</style>
    </header>
  );
}

/* ─── HomePage ────────────────────────────────────────────────────────────── */
function HomePage({ setPage, config }) {
  const services = [
    { icon: '✂️', name: 'Corte Clásico', desc: 'Tijera y máquina con técnica impecable', price: 'desde $3.500', duration: '30 min' },
    { icon: '🪒', name: 'Barba', desc: 'Navaja, perfilado y arreglo profesional', price: 'desde $2.500', duration: '30 min' },
    { icon: '✨', name: 'Corte + Barba', desc: 'El combo completo para lucir perfecto', price: 'desde $5.500', duration: '60 min' },
    { icon: '🎨', name: 'Degradé', desc: 'Fade bajo, medio o alto a tu gusto', price: 'desde $4.000', duration: '30 min' },
    { icon: '💈', name: 'Diseño', desc: 'Diseño de líneas y cejas personalizadas', price: 'desde $1.500', duration: '20 min' },
    { icon: '👑', name: 'Tratamiento', desc: 'Hidratación y cuidado capilar premium', price: 'desde $3.000', duration: '30 min' },
  ];
  const testimonials = [
    { name: 'Matías G.', text: 'El mejor corte que me hicieron. Santi es un crack, te escucha y te da justo lo que pedís.', stars: 5 },
    { name: 'Rodrigo P.', text: 'Excelente atención, puntualidad y un trabajo impresionante. 100% recomendado.', stars: 5 },
    { name: 'Lucas F.', text: 'Llevo dos años yendo y nunca me decepcionó. El sistema de turnos online es muy cómodo.', stars: 5 },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0A0A0A 0%, #111111 50%, #0A0A0A 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(45deg, var(--gold) 0, var(--gold) 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
        <div className="container" style={{ paddingTop: 100, paddingBottom: 60, position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 680 }}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: '6px 16px', marginBottom: 24 }}>
              <Scissors size={14} color="var(--gold)" />
              <span style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Barbería Premium · Buenos Aires</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ fontSize: 'clamp(42px, 7vw, 80px)', fontFamily: "'Playfair Display', serif", fontWeight: 900, lineHeight: 1.1, marginBottom: 24, color: 'var(--cream)' }}>
              El arte del<br /><span className="text-gradient-gold">corte perfecto</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              style={{ fontSize: 18, color: 'var(--gray-light)', lineHeight: 1.7, marginBottom: 40, maxWidth: 500 }}>
              Más de 10 años dando forma a estilos únicos. Cada corte es una obra de arte — reservá tu turno online en segundos.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setPage('booking')} className="btn-gold" style={{ fontSize: 16, padding: '16px 36px' }}>
                <Calendar size={18} /> Reservar turno
              </button>
              <a href={`https://wa.me/${config.whatsapp?.replace('+','')}`} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: 15, padding: '15px 28px' }}>
                <Phone size={16} /> WhatsApp
              </a>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              style={{ display: 'flex', gap: 40, marginTop: 56, flexWrap: 'wrap' }}>
              {[['10+', 'Años de experiencia'], ['500+', 'Clientes satisfechos'], ['100%', 'Atención personalizada']].map(([n, l]) => (
                <div key={l}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--gold)', fontFamily: "'Playfair Display', serif" }}>{n}</p>
                  <p style={{ fontSize: 13, color: 'var(--gray-light)', marginTop: 4 }}>{l}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: 'var(--gold)', opacity: 0.4 }}>
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* Servicios */}
      <section className="section" style={{ background: 'var(--dark)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Lo que ofrecemos</p>
            <h2 className="section-title" style={{ marginBottom: 16 }}>Nuestros servicios</h2>
            <div className="gold-divider" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {services.map((s, i) => (
              <motion.div key={s.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="card">
                <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>{s.name}</h3>
                <p style={{ color: 'var(--gray-light)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{s.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 15 }}>{s.price}</span>
                  <span style={{ color: 'var(--gray-mid)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {s.duration}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button onClick={() => setPage('booking')} className="btn-gold" style={{ fontSize: 15, padding: '14px 32px' }}>
              <Calendar size={16} /> Reservar mi turno
            </button>
          </div>
        </div>
      </section>

      {/* Por qué elegirnos */}
      <section className="section" style={{ background: 'var(--black)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="why-grid">
            <div>
              <p style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>¿Por qué elegirnos?</p>
              <h2 className="section-title" style={{ marginBottom: 16 }}>La experiencia que merecés</h2>
              <div className="gold-divider-left" />
              <p style={{ color: 'var(--gray-light)', marginTop: 20, marginBottom: 32, lineHeight: 1.8 }}>
                En Santi Rojas no hacemos cortes masivos. Cada cliente tiene su espacio, su tiempo y su resultado.
              </p>
              {['Turnos de 30 min — sin apuro ni solapamientos', 'Reserva online disponible las 24hs', 'Cancelación flexible hasta 1 hora antes', 'WhatsApp directo para consultas'].map(text => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="var(--gold)" />
                  </div>
                  <span style={{ color: 'var(--cream)', fontSize: 14 }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[['10+', 'Años de oficio'], ['500+', 'Clientes'], ['★ 5.0', 'Calificación'], ['0', 'Apuros']].map(([n, l]) => (
                <div key={l} className="card" style={{ textAlign: 'center', padding: 28 }}>
                  <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold)', fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>{n}</p>
                  <p style={{ color: 'var(--gray-light)', fontSize: 13 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`@media(max-width:768px){.why-grid{grid-template-columns:1fr!important;}}`}</style>
      </section>

      {/* Testimonios */}
      <section className="section" style={{ background: 'var(--dark)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Clientes</p>
            <h2 className="section-title" style={{ marginBottom: 8 }}>Lo que dicen de nosotros</h2>
            <div className="gold-divider" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="card">
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {Array.from({ length: t.stars }).map((_, j) => <Star key={j} size={14} fill="var(--gold)" color="var(--gold)" />)}
                </div>
                <p style={{ color: 'var(--gray-light)', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 16 }}>"{t.text}"</p>
                <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 14 }}>— {t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Galería */}
      <section className="section" style={{ background: 'var(--black)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Nuestro trabajo</p>
            <h2 className="section-title" style={{ marginBottom: 8 }}>Galería</h2>
            <div className="gold-divider" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="gallery-grid">
            {[
              { label: 'Fade bajo', emoji: '✂️', desc: 'Transición perfecta y natural' },
              { label: 'Corte clásico', emoji: '💈', desc: 'Tijera y peine con estilo' },
              { label: 'Degradé moderno', emoji: '🎨', desc: 'Precisión y detalle al máximo' },
              { label: 'Barba perfilada', emoji: '🪒', desc: 'Navaja recta sin errores' },
              { label: 'Fade alto', emoji: '⚡', desc: 'Look urbano y definido' },
              { label: 'Corte + Barba', emoji: '👑', desc: 'Combo completo premium' },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                style={{ aspectRatio: '1', background: `linear-gradient(135deg, var(--dark-2) 0%, var(--dark-3) 100%)`, border: '1px solid rgba(201,168,76,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'default', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(45deg, var(--gold) 0, var(--gold) 1px, transparent 0, transparent 10px)', backgroundSize: '10px 10px' }} />
                <span style={{ fontSize: 36 }}>{item.emoji}</span>
                <p style={{ color: 'var(--cream)', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>{item.label}</p>
                <p style={{ color: 'var(--gray-mid)', fontSize: 12, textAlign: 'center', padding: '0 12px' }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: 'var(--gray-mid)', fontSize: 13, marginTop: 24 }}>Seguinos en Instagram para ver los últimos trabajos</p>
        </div>
        <style>{`@media(max-width:600px){.gallery-grid{grid-template-columns:repeat(2,1fr)!important;}}`}</style>
      </section>

      {/* Sobre mí */}
      <section className="section" style={{ background: 'var(--dark)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }} className="about-grid">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 260, height: 260, borderRadius: '50%', background: 'linear-gradient(135deg, var(--dark-2), var(--dark-3))', border: '3px solid rgba(201,168,76,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 20, position: 'relative' }}>
                <Scissors size={64} color="var(--gold)" style={{ opacity: 0.7 }} />
                <p style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontWeight: 700, marginTop: 12, fontSize: 14 }}>Santi Rojas</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="var(--gold)" color="var(--gold)" />)}
              </div>
            </div>
            <div>
              <p style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Sobre mí</p>
              <h2 className="section-title" style={{ marginBottom: 16 }}>Más de 10 años<br />haciendo lo que amo</h2>
              <div className="gold-divider-left" />
              <p style={{ color: 'var(--gray-light)', marginTop: 20, marginBottom: 16, lineHeight: 1.8 }}>
                Empecé en el oficio con 18 años y nunca paré. Cada corte es una conversación, cada cliente tiene su historia. En Santi Rojas no sos un número — sos alguien que merece el mejor resultado.
              </p>
              <p style={{ color: 'var(--gray-light)', lineHeight: 1.8, marginBottom: 28 }}>
                Especializado en degradés, fades y técnicas de barbería clásica. Capacitación continua para siempre estar al día con las tendencias.
              </p>
              <button onClick={() => setPage('booking')} className="btn-gold">
                <Calendar size={15} /> Reservar con Santi
              </button>
            </div>
          </div>
        </div>
        <style>{`@media(max-width:768px){.about-grid{grid-template-columns:1fr!important;gap:40px!important;}}`}</style>
      </section>

      {/* Instagram placeholder */}
      <section className="section" style={{ background: 'var(--black)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Redes sociales</p>
            <h2 className="section-title" style={{ marginBottom: 8 }}>Seguinos en Instagram</h2>
            <div className="gold-divider" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }} className="insta-grid">
            {[1,2,3,4].map(i => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                style={{ aspectRatio: '1', background: 'linear-gradient(135deg, var(--dark-2), var(--dark-3))', border: '1px solid rgba(201,168,76,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Instagram size={28} color="var(--dark-5)" />
              </motion.div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <Instagram size={16} /> @santirojas.barber
            </a>
          </div>
        </div>
        <style>{`@media(max-width:600px){.insta-grid{grid-template-columns:repeat(2,1fr)!important;}}`}</style>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, var(--gold-dark) 0%, var(--gold) 50%, var(--gold-light) 100%)', padding: '72px 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <Scissors size={40} color="var(--black)" style={{ margin: '0 auto 20px', display: 'block' }} />
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontFamily: "'Playfair Display', serif", fontWeight: 900, color: 'var(--black)', marginBottom: 16 }}>¿Listo para el cambio?</h2>
          <p style={{ color: 'rgba(0,0,0,0.65)', fontSize: 16, marginBottom: 36, maxWidth: 440, margin: '0 auto 36px' }}>Reservá tu turno online ahora — tarda menos de 2 minutos.</p>
          <button onClick={() => setPage('booking')} style={{ background: 'var(--black)', color: 'var(--gold)', border: 'none', padding: '16px 40px', borderRadius: 10, fontSize: 15, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Reservar ahora
          </button>
        </div>
      </section>
    </motion.div>
  );
}

/* ─── BookingPage ─────────────────────────────────────────────────────────── */
function BookingPage({ config, toast }) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calOffset, setCalOffset] = useState(0);
  const [blockedDates, setBlockedDates] = useState([]);
  const [form, setForm] = useState({ clientName: '', clientPhone: '', clientEmail: '', service: SERVICES[0], notes: '', source: '' });
  const [booking, setBooking] = useState(null);

  const calBase = new Date();
  calBase.setDate(1);
  calBase.setMonth(calBase.getMonth() + calOffset);
  const calYear = calBase.getFullYear();
  const calMonth = calBase.getMonth();
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calStartDay = new Date(calYear, calMonth, 1).getDay();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + (config.maxDaysAhead || 30));
  const fmtDate = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  useEffect(() => {
    const from = fmtDate(calYear, calMonth, 1);
    const to = fmtDate(calYear, calMonth, calDaysInMonth);
    apiFetch(`/blocked-dates?from=${from}&to=${to}`).then(d => setBlockedDates((d.blockedDates||[]).map(b => b.date))).catch(() => {});
  }, [calYear, calMonth]);

  const handleDateSelect = async (dateStr) => {
    setSelectedDate(dateStr); setSelectedTime(''); setLoadingSlots(true);
    try { const data = await apiFetch(`/slots?date=${dateStr}`); setSlots(data.slots || []); setStep(2); }
    catch (e) { toast({ title: 'No se pudo cargar horarios', description: e.message, variant: 'destructive' }); }
    finally { setLoadingSlots(false); }
  };

  const handleSubmit = async () => {
    if (!form.clientName || !form.clientPhone) { toast({ title: 'Faltan campos', description: 'Nombre y WhatsApp son obligatorios.', variant: 'destructive' }); return; }
    try {
      const data = await apiFetch('/book', { method: 'POST', body: JSON.stringify({ date: selectedDate, time: selectedTime, ...form }) });
      setBooking(data.appointment);
      setStep(5);
    }
    catch (e) { toast({ title: 'No se pudo reservar', description: e.message, variant: 'destructive' }); }
  };

  const buildGCalLink = () => {
    const sm = config.slotMinutes || 30;
    const [h, m] = selectedTime.split(':').map(Number);
    const endMins = h * 60 + m + sm;
    const endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}${String(endMins % 60).padStart(2, '0')}`;
    const dateCompact = selectedDate.replace(/-/g, '');
    const startCompact = selectedTime.replace(':', '');
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', `Turno en ${config.businessName}`);
    url.searchParams.set('dates', `${dateCompact}T${startCompact}00/${dateCompact}T${endTime}00`);
    url.searchParams.set('details', `Servicio: ${form.service}\n${config.address}`);
    return url.toString();
  };

  const Steps = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, gap: 0 }}>
      {[1, 2, 3, 4, 5].map((n, i) => (
        <React.Fragment key={n}>
          <div style={{ textAlign: 'center' }}>
            <div className={`step-circle ${step > n ? 'done' : step === n ? 'active' : 'pending'}`}>
              {step > n ? <Check size={14} /> : n}
            </div>
            <p style={{ fontSize: 10, marginTop: 6, color: step >= n ? 'var(--gold)' : 'var(--gray-mid)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {['Fecha', 'Horario', 'Datos', 'Revisión', 'Listo'][i]}
            </p>
          </div>
          {n < 5 && <div className={`step-line ${step > n ? 'done' : 'pending'}`} style={{ width: 36 }} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ paddingTop: 100, paddingBottom: 60, minHeight: '100vh' }}>
      <div className="container-sm">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Reservar turno</p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontFamily: "'Playfair Display', serif", color: 'var(--cream)' }}>Elegí tu día y horario</h1>
        </div>
        <Steps />
        <div className="card-static" style={{ minHeight: 420 }}>
          <AnimatePresence mode="wait">
            {/* Paso 1 */}
            {step === 1 && (
              <motion.div key="s1" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <button onClick={() => calOffset > 0 && setCalOffset(o => o - 1)} className="btn-ghost" style={{ padding: '6px 10px' }} disabled={calOffset === 0}><ChevronLeft size={16} /></button>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', textTransform: 'capitalize' }}>
                    {calBase.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button onClick={() => setCalOffset(o => o + 1)} className="btn-ghost" style={{ padding: '6px 10px' }}><ChevronRight size={16} /></button>
                </div>
                <div className="calendar-grid">
                  {DAYS.map(d => <div key={d} className="calendar-header">{d}</div>)}
                  {Array.from({ length: calStartDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: calDaysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const dateStr = fmtDate(calYear, calMonth, d);
                    const dayObj = new Date(calYear, calMonth, d);
                    const isPast = dayObj < today;
                    const isFuture = dayObj > maxDate;
                    const isToday = dayObj.getTime() === today.getTime();
                    const isBlocked = blockedDates.includes(dateStr);
                    const disabled = isPast || isFuture || isBlocked;
                    return (
                      <button key={d} onClick={() => !disabled && handleDateSelect(dateStr)} disabled={disabled}
                        title={isBlocked ? 'Día no disponible' : undefined}
                        className={`calendar-day ${selectedDate === dateStr ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${isToday ? 'today' : ''} ${isBlocked ? 'blocked' : ''}`}
                        style={isBlocked ? { background: 'rgba(192,57,43,0.1)', color: 'var(--red-light)', border: '1px solid rgba(192,57,43,0.2)' } : {}}>
                        {d}
                        {isBlocked && <span style={{ display: 'block', fontSize: 7, lineHeight: 1 }}>✗</span>}
                      </button>
                    );
                  })}
                </div>
                <p style={{ textAlign: 'center', color: 'var(--gray-mid)', fontSize: 13, marginTop: 20 }}>Podés reservar hasta {config.maxDaysAhead} días por adelantado</p>
              </motion.div>
            )}

            {/* Paso 2 */}
            {step === 2 && (
              <motion.div key="s2" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <button onClick={() => setStep(1)} className="btn-ghost" style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}><ChevronLeft size={14} /> Volver</button>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', textTransform: 'capitalize' }}>
                    {new Date(selectedDate + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <div style={{ width: 80 }} />
                </div>
                {loadingSlots ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <RefreshCw size={24} color="var(--gold)" style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--gray-light)' }}>Cargando horarios...</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <p style={{ color: 'var(--gray-light)', fontSize: 16 }}>No hay horarios para esta fecha.</p>
                    <button onClick={() => setStep(1)} className="btn-outline" style={{ marginTop: 20, fontSize: 13 }}>Elegir otra fecha</button>
                  </div>
                ) : (
                  <>
                    <p style={{ color: 'var(--gray-light)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{slots.filter(s => s.available).length} horarios disponibles</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {slots.map(s => (
                        <button key={s.time} disabled={!s.available}
                          onClick={() => { setSelectedTime(s.time); setStep(3); }}
                          className={`time-slot ${selectedTime === s.time ? 'selected' : ''} ${!s.available ? (s.isBlocked ? 'blocked' : s.isOccupied ? 'occupied' : 'disabled') : ''}`}>
                          {s.time}
                          {s.isBlocked && <span style={{ display: 'block', fontSize: 9 }}>BLOQ.</span>}
                          {s.isOccupied && <span style={{ display: 'block', fontSize: 9 }}>OCUP.</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Paso 3 — Datos */}
            {step === 3 && (
              <motion.div key="s3" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <button onClick={() => setStep(2)} className="btn-ghost" style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}><ChevronLeft size={14} /> Volver</button>
                  <div style={{ padding: '8px 16px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8 }}>
                    <span style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 600 }}>
                      📅 {new Date(selectedDate + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} a las {selectedTime}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div><label className="field-label">Nombre y Apellido *</label><input className="input-dark" required placeholder="Tu nombre completo" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} /></div>
                  <div><label className="field-label">WhatsApp *</label><input className="input-dark" required placeholder="+54 9 11 1234-5678" type="tel" value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })} /></div>
                  <div><label className="field-label">Email (para recibir confirmación)</label><input className="input-dark" type="email" placeholder="tu@email.com" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} /></div>
                  <div><label className="field-label">Servicio</label>
                    <select className="input-dark" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="field-label">Comentarios (opcional)</label><textarea className="input-dark" rows={2} placeholder="Tipo de corte, preferencias..." style={{ resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                  <div><label className="field-label">¿Cómo nos conociste?</label>
                    <select className="input-dark" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                      <option value="">Prefiero no decir</option>
                      <option value="instagram">Instagram</option>
                      <option value="recomendacion">Recomendación</option>
                      <option value="google">Google</option>
                      <option value="pasando">Pasando por el lugar</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <button onClick={() => {
                    if (!form.clientName || !form.clientPhone) { toast({ title: 'Faltan campos', description: 'Nombre y WhatsApp son obligatorios.', variant: 'destructive' }); return; }
                    setStep(4);
                  }} className="btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: 15 }}>
                    <ChevronRight size={16} /> Revisar reserva
                  </button>
                </div>
              </motion.div>
            )}

            {/* Paso 4 — Revisión */}
            {step === 4 && (
              <motion.div key="s4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <button onClick={() => setStep(3)} className="btn-ghost" style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}><ChevronLeft size={14} /> Volver</button>
                  <p style={{ color: 'var(--gold)', fontSize: 14, fontWeight: 700 }}>Revisá tu reserva antes de confirmar</p>
                </div>
                <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
                  {[
                    ['📅 Fecha', new Date(selectedDate + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
                    ['🕐 Horario', `${selectedTime} hs`],
                    ['✂️ Servicio', form.service],
                    ['👤 Nombre', form.clientName],
                    ['📱 WhatsApp', form.clientPhone],
                    ...(form.clientEmail ? [['📧 Email', form.clientEmail]] : []),
                    ...(form.notes ? [['💬 Notas', form.notes]] : []),
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--gray-mid)', fontSize: 14, minWidth: 120 }}>{label}</span>
                      <span style={{ color: 'var(--cream)', fontSize: 14, fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
                {form.clientEmail && <p style={{ color: 'var(--gray-light)', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>📩 Recibirás un email de confirmación con link para cancelar si lo necesitás.</p>}
                <button onClick={handleSubmit} className="btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: 15 }}>
                  <CheckCircle size={16} /> Confirmar reserva
                </button>
              </motion.div>
            )}

            {/* Paso 5 — Confirmado */}
            {step === 5 && (
              <motion.div key="s5" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ textAlign: 'center', padding: '20px 0' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                  style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(39,174,96,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <CheckCircle size={36} color="var(--green-light)" />
                </motion.div>
                <h2 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 12 }}>¡Turno confirmado!</h2>
                <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: 20, margin: '20px auto', display: 'inline-block', textAlign: 'left' }}>
                  <p style={{ color: 'var(--gold)', marginBottom: 6 }}>📅 {new Date(selectedDate + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <p style={{ color: 'var(--cream)', marginBottom: 6 }}>🕐 {selectedTime} hs</p>
                  <p style={{ color: 'var(--cream)', marginBottom: 6 }}>✂️ {form.service}</p>
                  <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>Cliente: {form.clientName}</p>
                </div>
                {form.clientEmail && <p style={{ color: 'var(--gray-light)', marginBottom: 12, fontSize: 13 }}>📩 Te enviamos un email a {form.clientEmail} con los detalles y link para cancelar.</p>}
                <p style={{ color: 'var(--gray-light)', marginBottom: 28, fontSize: 14 }}>Para cancelar también podés avisar por WhatsApp con anticipación.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { setStep(1); setSelectedDate(''); setSelectedTime(''); setBooking(null); setForm({ clientName: '', clientPhone: '', clientEmail: '', service: SERVICES[0], notes: '', source: '' }); }} className="btn-outline" style={{ fontSize: 14 }}>Reservar otro turno</button>
                  <a href={buildGCalLink()} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', padding: '10px 18px' }}>
                    <ExternalLink size={14} /> Google Calendar
                  </a>
                  <a href={`https://wa.me/${config.whatsapp?.replace('+','')}`} target="_blank" rel="noopener noreferrer" className="btn-gold" style={{ fontSize: 14 }}><Phone size={14} /> WhatsApp</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
}

/* ─── ContactPage ─────────────────────────────────────────────────────────── */
function ContactPage({ config }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ paddingTop: 100, paddingBottom: 60, minHeight: '100vh' }}>
      <div className="container-sm">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 className="section-title" style={{ marginBottom: 8 }}>Contacto</h1>
          <div className="gold-divider" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="contact-grid">
          {[
            { icon: <MapPin size={20} color="var(--gold)" />, label: 'Dirección', value: config.address },
            { icon: <Phone size={20} color="var(--gold)" />, label: 'WhatsApp', value: config.whatsapp, href: `https://wa.me/${config.whatsapp?.replace('+','')}` },
            { icon: <Mail size={20} color="var(--gold)" />, label: 'Email', value: config.email, href: `mailto:${config.email}` },
            { icon: <Clock size={20} color="var(--gold)" />, label: 'Horarios', value: 'Lun–Vie 9–19 · Sáb 9–15' },
          ].map(({ icon, label, value, href }) => (
            <div key={label} className="card">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>{label}</p>
                  {href ? <a href={href} style={{ color: 'var(--cream)', fontSize: 15, textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">{value}</a> : <p style={{ color: 'var(--cream)', fontSize: 15 }}>{value}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media(max-width:600px){.contact-grid{grid-template-columns:1fr!important;}}`}</style>
    </motion.div>
  );
}

/* ─── LoginPage ───────────────────────────────────────────────────────────── */
function LoginPage({ onLogin, toast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await onLogin(email, password); }
    catch (err) { toast({ title: 'Error de acceso', description: err.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={24} color="var(--gold)" />
          </div>
          <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 8 }}>Acceso Admin</h1>
          <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>Panel de gestión de Santi Rojas</p>
        </div>
        <div className="card-static">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div><label className="field-label">Email</label><input className="input-dark" type="email" required placeholder="admin@santirojas.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div>
              <label className="field-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input className="input-dark" type={showPwd ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-light)' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 4 }} disabled={loading}>
              {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Shield size={15} /> Ingresar</>}
            </button>
          </form>
          <p style={{ textAlign: 'center', color: 'var(--gray-mid)', fontSize: 12, marginTop: 16 }}>Demo: admin@santirojas.com / admin123</p>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
}

/* ─── PublicFooter ────────────────────────────────────────────────────────── */
function PublicFooter({ config, setPage }) {
  return (
    <footer style={{ background: 'var(--dark)', borderTop: '1px solid rgba(201,168,76,0.1)', padding: '48px 0 32px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 40, marginBottom: 40 }} className="footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Scissors size={18} color="var(--gold)" />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{config.businessName}</span>
            </div>
            <p style={{ color: 'var(--gray-light)', fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>Barbería premium en Buenos Aires. El arte del corte perfecto, turno a turno.</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Navegación</p>
            {[['home', 'Inicio'], ['booking', 'Reservar'], ['contact', 'Contacto']].map(([p, l]) => (
              <button key={p} onClick={() => setPage(p)} style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-light)', fontSize: 14, padding: '4px 0' }}>{l}</button>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Contacto</p>
            <p style={{ color: 'var(--gray-light)', fontSize: 14, marginBottom: 8 }}>{config.whatsapp}</p>
            <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>{config.email}</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-mid)', fontSize: 13 }}>© {new Date().getFullYear()} {config.businessName} · Todos los derechos reservados</p>
        </div>
      </div>
      <style>{`@media(max-width:768px){.footer-grid{grid-template-columns:1fr!important;}}`}</style>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════════════════════════════════════ */
function AdminPanel({ page, setPage, onLogout, config, setConfig, toast }) {
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const navItems = [
    { id: 'dashboard',    label: 'Dashboard',        icon: <BarChart3 size={16} />,  section: 'Gestión' },
    { id: 'agenda',       label: 'Agenda del día',   icon: <Calendar size={16} />,   section: null },
    { id: 'appointments', label: 'Todos los turnos', icon: <Clock size={16} />,      section: null },
    { id: 'clients',      label: 'Clientes (CRM)',   icon: <Users size={16} />,      section: 'CRM' },
    { id: 'analytics',    label: 'Analytics',        icon: <TrendingUp size={16} />, section: null },
    { id: 'blocks',       label: 'Bloqueos de slots',icon: <Ban size={16} />,        section: 'Configuración' },
    { id: 'blocked-dates',label: 'Días bloqueados',  icon: <Lock size={16} />,       section: null },
    { id: 'schedule',     label: 'Horario semanal',  icon: <Settings size={16} />,   section: null },
    { id: 'settings',     label: 'Configuración',    icon: <Settings size={16} />,   section: null },
  ];

  return (
    <div className="admin-layout">
      {mobileSidebar && <div onClick={() => setMobileSidebar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 39 }} />}
      <aside className={`admin-sidebar ${mobileSidebar ? 'mobile-open' : ''}`}>
        <div className="admin-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Scissors size={18} color="var(--gold)" />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>{config.businessName}</span>
          </div>
          <p style={{ color: 'var(--gray-mid)', fontSize: 11 }}>Panel de Administración</p>
        </div>
        <div className="admin-nav">
          {navItems.map((n, i) => (
            <React.Fragment key={n.id}>
              {n.section && <div className="admin-nav-section">{n.section}</div>}
              <button onClick={() => { setPage(n.id); setMobileSidebar(false); }} className={`admin-nav-item ${page === n.id ? 'active' : ''}`}>
                {n.icon} {n.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
          <button onClick={onLogout} className="admin-nav-item" style={{ color: 'var(--red-light)' }}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <div style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }} className="mobile-admin-hdr">
          <button onClick={() => setMobileSidebar(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cream)' }}><Menu size={22} /></button>
          <span style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontWeight: 700 }}>{config.businessName}</span>
          <div />
        </div>
        <AnimatePresence mode="wait">
          {page === 'dashboard'     && <AdminDashboard    key="d"  toast={toast} config={config} />}
          {page === 'agenda'        && <AdminAgenda       key="a"  toast={toast} />}
          {page === 'appointments'  && <AdminAppointments key="ap" toast={toast} />}
          {page === 'clients'       && <AdminCRM          key="cr" toast={toast} />}
          {page === 'analytics'     && <AdminAnalytics    key="an" toast={toast} />}
          {page === 'blocks'        && <AdminBlocks       key="bl" toast={toast} />}
          {page === 'blocked-dates' && <AdminBlockedDates key="bd" toast={toast} />}
          {page === 'schedule'      && <AdminSchedule     key="sc" toast={toast} />}
          {page === 'settings'      && <AdminSettings     key="st" toast={toast} config={config} setConfig={setConfig} />}
        </AnimatePresence>
      </main>
      <style>{`@media(max-width:768px){.mobile-admin-hdr{display:flex!important;}}`}</style>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--gold)' }}>
      <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── AdminDashboard ──────────────────────────────────────────────────────── */
function AdminDashboard({ toast, config }) {
  const [stats, setStats] = useState(null);
  const load = useCallback(async () => {
    try { const d = await apiFetch('/admin/stats'); setStats(d); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (!stats) return <LoadingSpinner />;
  const statusLabel = { confirmed: 'Confirmado', cancelled: 'Cancelado', attended: 'Atendido', 'no-show': 'No vino' };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--gray-light)', fontSize: 14, textTransform: 'capitalize' }}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={load} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><RefreshCw size={14} /> Actualizar</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }} className="stats-grid">
        {[
          { label: 'Turnos hoy', value: stats.stats.todayTotal, color: 'var(--gold)', icon: <Calendar size={20} /> },
          { label: 'Esta semana', value: stats.stats.weekTotal, color: 'var(--green-light)', icon: <CheckCircle size={20} /> },
          { label: 'Este mes', value: stats.stats.monthTotal, color: '#74B9FF', icon: <BarChart3 size={20} /> },
          { label: 'Cancelados', value: stats.stats.cancelled, color: 'var(--red-light)', icon: <Ban size={20} /> },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-light)' }}>{s.label}</p>
              <div style={{ color: s.color, opacity: 0.7 }}>{s.icon}</div>
            </div>
            <p style={{ fontSize: 38, fontWeight: 800, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="card-static">
        <h2 style={{ fontSize: 20, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 20 }}>Turnos de hoy</h2>
        {stats.todayApts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-mid)' }}>
            <Calendar size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p>No hay turnos para hoy</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.todayApts.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--dark-3)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: 14 }}>{a.start_time}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--cream)', marginBottom: 2 }}>{a.client_name}</p>
                    <p style={{ fontSize: 13, color: 'var(--gray-light)' }}>{a.service} · {a.client_phone}</p>
                  </div>
                </div>
                <span className={`badge badge-${a.status}`}>{statusLabel[a.status] || a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@media(max-width:900px){.stats-grid{grid-template-columns:1fr 1fr!important;}}@media(max-width:480px){.stats-grid{grid-template-columns:1fr!important;}}`}</style>
    </motion.div>
  );
}

/* ─── AdminAgenda ─────────────────────────────────────────────────────────── */
function AdminAgenda({ toast }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [agenda, setAgenda] = useState(null);
  const [loading, setLoading] = useState(false);
  const [blockModal, setBlockModal] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' });
  const [rescheduling, setRescheduling] = useState(false);

  const load = useCallback(async (d) => {
    setLoading(true);
    try { const data = await apiFetch(`/admin/agenda?date=${d}`); setAgenda(data); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(date); }, [date, load]);

  const changeDate = (delta) => { const d = new Date(date + 'T12:00'); d.setDate(d.getDate() + delta); setDate(d.toISOString().split('T')[0]); };

  const cancelAppointment = async (id) => {
    if (!confirm('¿Cancelar este turno?')) return;
    try { await apiFetch(`/admin/appointments/${id}/cancel`, { method: 'POST' }); toast({ title: 'Turno cancelado' }); load(date); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const markStatus = async (id, status) => {
    try { await apiFetch(`/admin/appointments/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); toast({ title: 'Estado actualizado' }); load(date); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const blockSlot = async () => {
    if (!blockModal) return;
    const [h, m] = blockModal.time.split(':').map(Number);
    const endMins = h * 60 + m + 30;
    const endTime = `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`;
    try {
      await apiFetch('/admin/blocks', { method: 'POST', body: JSON.stringify({ date, startTime: blockModal.time, endTime, reason: blockReason }) });
      toast({ title: 'Slot bloqueado' }); setBlockModal(null); setBlockReason(''); load(date);
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const unblockSlot = async (blockId) => {
    try { await apiFetch(`/admin/blocks/${blockId}`, { method: 'DELETE' }); toast({ title: 'Bloqueo eliminado' }); load(date); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const getSlotData = (time) => {
    if (!agenda) return {};
    const apt = agenda.appointments?.find(a => a.start_time === time && a.status !== 'cancelled');
    const block = agenda.blocks?.find(b => time >= b.start_time && time < b.end_time);
    return { apt, block };
  };

  const statusLabel = { confirmed: 'Confirmado', attended: 'Atendido', cancelled: 'Cancelado', 'no-show': 'No vino' };
  const statusColors = {
    confirmed: { bg: 'rgba(201,168,76,0.06)', border: 'rgba(201,168,76,0.25)', dot: 'var(--gold)' },
    attended:  { bg: 'rgba(39,174,96,0.06)',  border: 'rgba(39,174,96,0.25)',  dot: 'var(--green-light)' },
    cancelled: { bg: 'rgba(192,57,43,0.06)',  border: 'rgba(192,57,43,0.25)', dot: 'var(--red-light)' },
    'no-show': { bg: 'rgba(102,102,102,0.06)',border: 'rgba(102,102,102,0.2)',dot: 'var(--gray-mid)' },
  };
  const initials = (name) => name ? name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() : '?';

  const reschedule = async (e) => {
    e.preventDefault(); setRescheduling(true);
    try {
      await apiFetch(`/admin/appointments/${rescheduleModal.id}/reschedule`, { method: 'PUT', body: JSON.stringify({ date: rescheduleForm.date, time: rescheduleForm.time }) });
      toast({ title: 'Turno reprogramado' }); setRescheduleModal(null); load(date);
    } catch (err) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setRescheduling(false); }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)' }}>Agenda del día</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowCreate(true)} className="btn-gold" style={{ fontSize: 13 }}><Plus size={14} /> Crear turno</button>
          <button onClick={() => load(date)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><RefreshCw size={14} /> Actualizar</button>
        </div>
      </div>
      <div className="card-static" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '14px 18px', flexWrap: 'wrap' }}>
        <button onClick={() => changeDate(-1)} className="btn-ghost" style={{ padding: '7px 11px' }}><ChevronLeft size={16} /></button>
        <input type="date" className="input-dark" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', flex: 1, maxWidth: 180 }} />
        <button onClick={() => changeDate(1)} className="btn-ghost" style={{ padding: '7px 11px' }}><ChevronRight size={16} /></button>
        <span style={{ color: 'var(--gray-light)', fontSize: 14, textTransform: 'capitalize' }}>
          {new Date(date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <button onClick={() => setDate(new Date().toISOString().split('T')[0])} className="btn-ghost" style={{ fontSize: 13 }}>Hoy</button>
      </div>

      {loading ? <LoadingSpinner /> : !agenda?.slots?.length ? (
        <div className="card-static" style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-light)' }}>
          <Ban size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p>No hay horarios para este día</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agenda.slots.map(slot => {
            const { apt, block } = getSlotData(slot.time);
            return (
              <div key={slot.time} style={{
                display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 16, alignItems: 'center',
                padding: '14px 18px',
                background: apt ? (statusColors[apt.status]?.bg || 'var(--dark-2)') : 'var(--dark-2)',
                border: `1px solid ${apt ? (statusColors[apt.status]?.border || 'rgba(201,168,76,0.2)') : block ? 'rgba(192,57,43,0.2)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: 12
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: apt ? (statusColors[apt.status]?.dot || 'var(--gold)') : block ? 'var(--red-light)' : 'var(--gray-mid)' }}>{slot.time}</span>
                <div>
                  {apt ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: statusColors[apt.status]?.dot ? `color-mix(in srgb, ${statusColors[apt.status].dot} 20%, var(--dark-3))` : 'var(--dark-3)', border: `2px solid ${statusColors[apt.status]?.border || 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, color: statusColors[apt.status]?.dot || 'var(--gold)', fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>
                        {initials(apt.client_name)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--cream)', marginBottom: 2 }}>{apt.client_name}</p>
                        <p style={{ fontSize: 13, color: 'var(--gray-light)' }}>{apt.service} · {apt.client_phone}</p>
                        {apt.notes && <p style={{ fontSize: 12, color: 'var(--gray-mid)', fontStyle: 'italic', marginTop: 2 }}>{apt.notes}</p>}
                      </div>
                    </div>
                  ) : block ? (
                    <p style={{ color: 'var(--red-light)', fontSize: 14 }}>🚫 Bloqueado {block.reason ? `— ${block.reason}` : ''}</p>
                  ) : (
                    <p style={{ color: 'var(--dark-5)', fontSize: 14 }}>Disponible</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {apt && apt.status === 'confirmed' && (
                    <>
                      <button onClick={() => markStatus(apt.id, 'attended')} style={{ background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--green-light)', fontSize: 12, fontWeight: 600 }}>✓ Atendido</button>
                      <button onClick={() => markStatus(apt.id, 'no-show')} style={{ background: 'rgba(102,102,102,0.15)', border: '1px solid rgba(102,102,102,0.2)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--gray-light)', fontSize: 12 }}>Ausente</button>
                      <button onClick={() => { setRescheduleModal(apt); setRescheduleForm({ date: apt.date, time: apt.start_time }); }} className="btn-ghost" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={11} /> Mover</button>
                      <button onClick={() => cancelAppointment(apt.id)} className="btn-danger">Cancelar</button>
                    </>
                  )}
                  {apt && apt.status !== 'confirmed' && <span className={`badge badge-${apt.status}`}>{statusLabel[apt.status]}</span>}
                  {block && <button onClick={() => unblockSlot(block.id)} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Unlock size={12} /> Desbloquear</button>}
                  {!apt && !block && (
                    <button onClick={() => { setBlockModal({ time: slot.time }); setBlockReason(''); }}
                      style={{ background: 'transparent', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: 'var(--red-light)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Lock size={12} /> Bloquear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {blockModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button onClick={() => setBlockModal(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--dark-4)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-light)' }}><X size={14} /></button>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--cream)', marginBottom: 8 }}>Bloquear {blockModal.time}</h3>
            <p style={{ color: 'var(--gray-light)', fontSize: 14, marginBottom: 20 }}>Este horario quedará bloqueado para reservas.</p>
            <div style={{ marginBottom: 20 }}>
              <label className="field-label">Motivo (opcional)</label>
              <input className="input-dark" placeholder="Ej: Almuerzo, descanso..." value={blockReason} onChange={e => setBlockReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={blockSlot} className="btn-danger" style={{ flex: 1, padding: '12px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><Lock size={14} /> Bloquear</button>
              <button onClick={() => setBlockModal(null)} className="btn-ghost" style={{ flex: 1, padding: '12px', justifyContent: 'center', display: 'flex' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {rescheduleModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button onClick={() => setRescheduleModal(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--dark-4)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-light)' }}><X size={14} /></button>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--cream)', marginBottom: 4 }}>Mover turno</h3>
            <p style={{ color: 'var(--gray-light)', fontSize: 14, marginBottom: 20 }}>{rescheduleModal.client_name} · {rescheduleModal.service}</p>
            <form onSubmit={reschedule} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="field-label">Nueva fecha</label><input type="date" required className="input-dark" value={rescheduleForm.date} onChange={e => setRescheduleForm({ ...rescheduleForm, date: e.target.value })} /></div>
              <div><label className="field-label">Nuevo horario</label><input type="time" required className="input-dark" value={rescheduleForm.time} onChange={e => setRescheduleForm({ ...rescheduleForm, time: e.target.value })} /></div>
              {rescheduleModal.client_email && <p style={{ color: 'var(--gray-mid)', fontSize: 12 }}>📩 Se enviará email a {rescheduleModal.client_email}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={rescheduling} className="btn-gold" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
                  {rescheduling ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={13} /> Confirmar</>}
                </button>
                <button type="button" onClick={() => setRescheduleModal(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', display: 'flex', padding: '12px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && <AdminCreateAppointment defaultDate={date} toast={toast} onClose={() => setShowCreate(false)} onSuccess={() => load(date)} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
}

/* ─── AdminAppointments ───────────────────────────────────────────────────── */
function AdminAppointments({ toast }) {
  const [appointments, setAppointments] = useState([]);
  const [filters, setFilters] = useState({ status: '', date: '', search: '' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.date) params.set('date', filters.date);
      const data = await apiFetch(`/admin/appointments?${params}`);
      setAppointments(data.appointments || []);
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [filters.status, filters.date, toast]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    if (!confirm('¿Cancelar?')) return;
    try { await apiFetch(`/admin/appointments/${id}/cancel`, { method: 'POST' }); toast({ title: 'Cancelado' }); load(); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const filtered = appointments.filter(a => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return a.client_name.toLowerCase().includes(q) || a.client_phone.includes(q);
  });

  const statusLabel = { confirmed: 'Confirmado', cancelled: 'Cancelado', attended: 'Atendido', 'no-show': 'No vino' };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 32 }}>Todos los turnos</h1>
      <div className="card-static" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label className="field-label">Buscar</label>
          <input className="input-dark" placeholder="Nombre o teléfono..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <div><label className="field-label">Estado</label>
          <select className="input-dark" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={{ width: 'auto' }}>
            <option value="">Todos</option><option value="confirmed">Confirmados</option><option value="cancelled">Cancelados</option><option value="attended">Atendidos</option><option value="no-show">No vino</option>
          </select>
        </div>
        <div><label className="field-label">Fecha</label><input type="date" className="input-dark" value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })} style={{ width: 'auto' }} /></div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}><button onClick={() => setFilters({ status: '', date: '', search: '' })} className="btn-ghost" style={{ fontSize: 13 }}>Limpiar</button></div>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="card-static" style={{ overflowX: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-mid)' }}>
              <Clock size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p>No hay turnos con esos filtros</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.date + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{a.start_time}</td>
                    <td><p style={{ fontWeight: 600 }}>{a.client_name}</p>{a.client_email && <p style={{ fontSize: 12, color: 'var(--gray-light)' }}>{a.client_email}</p>}</td>
                    <td style={{ color: 'var(--gray-light)', fontSize: 13 }}>{a.service}</td>
                    <td style={{ color: 'var(--gray-light)', fontSize: 13 }}>{a.client_phone}</td>
                    <td><span className={`badge badge-${a.status}`}>{statusLabel[a.status] || a.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {a.status === 'confirmed' && <button onClick={() => cancel(a.id)} className="btn-danger">Cancelar</button>}
                        {a.client_phone && <a href={`https://wa.me/${a.client_phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 6, padding: '5px 10px', color: '#25D366', fontSize: 12, textDecoration: 'none' }}>WA</a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── AdminBlocks ─────────────────────────────────────────────────────────── */
function AdminBlocks({ toast }) {
  const [blocks, setBlocks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { const d = await apiFetch('/admin/blocks'); setBlocks(d.blocks || []); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await apiFetch('/admin/blocks', { method: 'POST', body: JSON.stringify({ date: form.date, startTime: form.startTime, endTime: form.endTime, reason: form.reason }) });
      toast({ title: 'Bloqueo creado' }); setShowModal(false); setForm({ date: '', startTime: '', endTime: '', reason: '' }); load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar?')) return;
    try { await apiFetch(`/admin/blocks/${id}`, { method: 'DELETE' }); toast({ title: 'Eliminado' }); load(); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = blocks.filter(b => b.date >= today);
  const past = blocks.filter(b => b.date < today);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 4 }}>Bloqueos</h1>
          <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>Bloqueá rangos de horario para días específicos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-gold"><Lock size={14} /> Nuevo bloqueo</button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="card-static" style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-mid)' }}>
          <Unlock size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} />
          <p>No hay bloqueos configurados</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Próximos bloqueos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <Lock size={16} color="var(--red-light)" />
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--cream)', textTransform: 'capitalize' }}>{new Date(b.date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p style={{ color: 'var(--red-light)', fontSize: 14 }}>{b.start_time} — {b.end_time}</p>
                        {b.reason && <p style={{ color: 'var(--gray-light)', fontSize: 12, marginTop: 2 }}>{b.reason}</p>}
                      </div>
                    </div>
                    <button onClick={() => remove(b.id)} className="btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={13} /> Eliminar</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-mid)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Pasados</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {past.slice(-8).reverse().map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'var(--dark-2)', borderRadius: 10, opacity: 0.5 }}>
                    <p style={{ color: 'var(--gray-light)', fontSize: 13 }}>{new Date(b.date + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} · {b.start_time}–{b.end_time}{b.reason ? ` — ${b.reason}` : ''}</p>
                    <button onClick={() => remove(b.id)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--dark-4)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-light)' }}><X size={14} /></button>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--cream)', marginBottom: 6 }}>Nuevo bloqueo</h3>
            <p style={{ color: 'var(--gray-light)', fontSize: 14, marginBottom: 24 }}>Bloqueá un rango de horario para una fecha.</p>
            <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="field-label">Fecha *</label><input type="date" required className="input-dark" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="field-label">Desde *</label><input type="time" required className="input-dark" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></div>
                <div><label className="field-label">Hasta *</label><input type="time" required className="input-dark" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>
              </div>
              <div><label className="field-label">Motivo (opcional)</label><input className="input-dark" placeholder="Almuerzo, feriado..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={loading} className="btn-gold" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
                  {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Lock size={14} /> Crear</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', display: 'flex', padding: '13px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
}

/* ─── AdminSchedule ───────────────────────────────────────────────────────── */
function AdminSchedule({ toast }) {
  const [schedule, setSchedule] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/admin/schedule').then(d => setSchedule(d.schedule || [])).catch(e => toast({ title: 'Error', description: e.message, variant: 'destructive' }));
  }, [toast]);

  const updateDay = (weekday, field, value) => setSchedule(prev => prev.map(d => d.weekday === weekday ? { ...d, [field]: value } : d));

  const save = async () => {
    setSaving(true);
    try { await apiFetch('/admin/schedule', { method: 'PUT', body: JSON.stringify({ schedule }) }); toast({ title: 'Horario guardado' }); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)' }}>Horarios semanales</h1>
        <button onClick={save} disabled={saving} className="btn-gold">
          {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={14} /> Guardar</>}
        </button>
      </div>
      <p style={{ color: 'var(--gray-light)', fontSize: 14, marginBottom: 28 }}>Configurá la apertura y cierre de cada día de la semana.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {schedule.map(day => (
          <div key={day.weekday} className="card-static" style={{ display: 'grid', gridTemplateColumns: '130px 80px 1fr 1fr', gap: 20, alignItems: 'center', opacity: day.active ? 1 : 0.55 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => updateDay(day.weekday, 'active', !day.active)} style={{ width: 40, height: 24, borderRadius: 12, background: day.active ? 'var(--gold)' : 'var(--dark-5)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: day.active ? 18 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.3s' }} />
              </button>
              <span style={{ fontWeight: 600, color: day.active ? 'var(--cream)' : 'var(--gray-mid)', fontSize: 14 }}>{DAYS_FULL[day.weekday]}</span>
            </div>
            <div style={{ color: day.active ? 'var(--gold)' : 'var(--gray-mid)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>{day.active ? 'ABIERTO' : 'CERRADO'}</div>
            <div><label className="field-label">Apertura</label><input type="time" className="input-dark" value={day.start_time || ''} disabled={!day.active} onChange={e => updateDay(day.weekday, 'start_time', e.target.value)} /></div>
            <div><label className="field-label">Cierre</label><input type="time" className="input-dark" value={day.end_time || ''} disabled={!day.active} onChange={e => updateDay(day.weekday, 'end_time', e.target.value)} /></div>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:600px){.sched-row{grid-template-columns:1fr!important;}}`}</style>
    </motion.div>
  );
}

/* ─── AdminSettings ───────────────────────────────────────────────────────── */
function AdminSettings({ toast, config, setConfig }) {
  const [form, setForm] = useState({ ...config });
  const [saving, setSaving] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  const saveConfig = async (e) => {
    e.preventDefault(); setSaving(true);
    try { const data = await apiFetch('/admin/config', { method: 'PUT', body: JSON.stringify(form) }); setConfig(data.config); toast({ title: 'Guardado' }); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const changePwd = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirm) { toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' }); return; }
    setSavingPwd(true);
    try { await apiFetch('/admin/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }) }); toast({ title: 'Contraseña cambiada' }); setPwdForm({ currentPassword: '', newPassword: '', confirm: '' }); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSavingPwd(false); }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 32 }}>Configuración</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }} className="settings-grid">
        <div className="card-static">
          <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 20 }}>Datos del negocio</h2>
          <form onSubmit={saveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[['businessName', 'Nombre del negocio'], ['address', 'Dirección'], ['whatsapp', 'WhatsApp (+54...)'], ['email', 'Email de contacto']].map(([key, label]) => (
              <div key={key}><label className="field-label">{label}</label><input className="input-dark" value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} /></div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label className="field-label">Slot (min)</label>
                <select className="input-dark" value={form.slotMinutes} onChange={e => setForm({ ...form, slotMinutes: e.target.value })}>
                  <option value="15">15</option><option value="30">30</option><option value="45">45</option><option value="60">60</option>
                </select>
              </div>
              <div><label className="field-label">Ant. mín. (min)</label><input type="number" className="input-dark" value={form.minNoticeMinutes} min={0} onChange={e => setForm({ ...form, minNoticeMinutes: e.target.value })} /></div>
              <div><label className="field-label">Días máx.</label><input type="number" className="input-dark" value={form.maxDaysAhead} min={1} max={90} onChange={e => setForm({ ...form, maxDaysAhead: e.target.value })} /></div>
            </div>
            <button type="submit" disabled={saving} className="btn-gold" style={{ justifyContent: 'center', padding: '13px', marginTop: 4 }}>
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={14} /> Guardar</>}
            </button>
          </form>
        </div>
        <div className="card-static">
          <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 20 }}>Cambiar contraseña</h2>
          <form onSubmit={changePwd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label className="field-label">Contraseña actual</label><input type="password" className="input-dark" value={pwdForm.currentPassword} onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} /></div>
            <div><label className="field-label">Nueva contraseña</label><input type="password" className="input-dark" value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} /></div>
            <div><label className="field-label">Confirmar nueva</label><input type="password" className="input-dark" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} /></div>
            <button type="submit" disabled={savingPwd} className="btn-outline" style={{ justifyContent: 'center', padding: '13px', marginTop: 4 }}>
              {savingPwd ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Shield size={14} /> Cambiar contraseña</>}
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.settings-grid{grid-template-columns:1fr!important;}}`}</style>
    </motion.div>
  );
}

/* ─── AdminBlockedDates ───────────────────────────────────────────────────── */
function AdminBlockedDates({ toast }) {
  const [blockedDates, setBlockedDates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { const d = await apiFetch('/admin/blocked-dates'); setBlockedDates(d.blockedDates || []); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await apiFetch('/admin/blocked-dates', { method: 'POST', body: JSON.stringify({ date: form.date, reason: form.reason }) });
      toast({ title: 'Día bloqueado' }); setShowModal(false); setForm({ date: '', reason: '' }); load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm('¿Desbloquear este día?')) return;
    try { await apiFetch(`/admin/blocked-dates/${id}`, { method: 'DELETE' }); toast({ title: 'Día desbloqueado' }); load(); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = blockedDates.filter(b => b.date >= today);
  const past = blockedDates.filter(b => b.date < today);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 4 }}>Días bloqueados</h1>
          <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>Días completos sin atención (feriados, vacaciones, etc.)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-gold"><Lock size={14} /> Bloquear día</button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="card-static" style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-mid)' }}>
          <Calendar size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} />
          <p>No hay días bloqueados</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Próximos días bloqueados</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(192,57,43,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={16} color="var(--red-light)" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--cream)', textTransform: 'capitalize', marginBottom: 2 }}>
                          {new Date(b.date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--red-light)' }}>🚫 Día completo bloqueado {b.reason ? `— ${b.reason}` : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => remove(b.id)} className="btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Unlock size={13} /> Desbloquear</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-mid)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Historial</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {past.slice(-6).reverse().map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'var(--dark-2)', borderRadius: 10, opacity: 0.5 }}>
                    <p style={{ color: 'var(--gray-light)', fontSize: 13 }}>{new Date(b.date + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })}{b.reason ? ` — ${b.reason}` : ''}</p>
                    <button onClick={() => remove(b.id)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--dark-4)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-light)' }}><X size={14} /></button>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--cream)', marginBottom: 6 }}>Bloquear día completo</h3>
            <p style={{ color: 'var(--gray-light)', fontSize: 14, marginBottom: 24 }}>Los clientes no podrán reservar en este día. Este día aparecerá en rojo en el calendario.</p>
            <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="field-label">Fecha *</label><input type="date" required className="input-dark" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><label className="field-label">Motivo (opcional)</label><input className="input-dark" placeholder="Feriado, vacaciones, evento..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={loading} className="btn-danger" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '13px' }}>
                  {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Lock size={14} /> Bloquear día</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', display: 'flex', padding: '13px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
}
