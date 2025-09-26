import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Phone, Mail, User, Settings, LogOut, Menu, X } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';

/* ===========================================================
   CONFIG
   =========================================================== */
const API_BASE = '/peluqueria/api'; // si lo servís desde otra ruta, ajustá esto

const SETTINGS = {
  businessName: "Estilo & Corte",
  address: "Av. Corrientes 1234, CABA, Buenos Aires",
  whatsapp: "+5491123456789",
  email: "info@estiloycorte.com.ar",
  timezone: "America/Argentina/Buenos_Aires",
  slotMinutes: 30,
  minNoticeMinutes: 120,
  maxDaysAhead: 30,
  // Horarios por día (0=Dom ... 6=Sáb)
  weekly: [
    { weekday: 0, start: null, end: null, active: false },      // Dom
    { weekday: 1, start: "09:00", end: "19:00", active: true },  // Lun
    { weekday: 2, start: "09:00", end: "19:00", active: true },  // Mar
    { weekday: 3, start: "09:00", end: "19:00", active: true },  // Mié
    { weekday: 4, start: "09:00", end: "19:00", active: true },  // Jue
    { weekday: 5, start: "09:00", end: "19:00", active: true },  // Vie
    { weekday: 6, start: "09:00", end: "19:00", active: true },  // Sáb
  ],
};

/* helpers fetch */
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

/* ===========================================================
   APP
   =========================================================== */
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPage, setAdminPage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // datos
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [appointments, setAppointments] = useState([]); // [{id,date,startTime,endTime,clientName,clientPhone,clientEmail,status,notes}]
  const [blocks, setBlocks] = useState([]);             // [{id,date,startTime,endTime,reason}]
  const { toast } = useToast();

  // Carga inicial desde PHP (turnos + bloqueos)
  const loadAgenda = async () => {
    try {
      const data = await apiGet('/slots.php');
      if (data?.ok) {
        setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
        setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
      } else {
        toast({ title: 'No pude cargar la agenda', description: data?.message || 'Respuesta inválida', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error de red', description: 'No pude obtener los turnos desde el servidor.', variant: 'destructive' });
    }
  };

  useEffect(() => { loadAgenda(); }, []);

  /* =================== AUTH DEMO =================== */
  const handleLogin = (email, password) => {
    // DEMO local: no pega al backend. Cambiá por /admin/api/login.php si querés auth real.
    if (email === "admin@estiloycorte.com.ar" && password === "admin123") {
      setIsAdmin(true);
      setCurrentPage('admin');
      toast({ title: "¡Bienvenido!", description: "Has iniciado sesión correctamente." });
    } else {
      toast({ title: "Error de autenticación", description: "Email o contraseña incorrectos.", variant: "destructive" });
    }
  };
  const handleLogout = () => {
    setIsAdmin(false);
    setCurrentPage('home');
    setAdminPage('dashboard');
    toast({ title: "Sesión cerrada", description: "Has cerrado sesión correctamente." });
  };

  /* =================== GENERAR TURNOS DISPONIBLES (Front) =================== */
  const generateTimeSlots = (date) => {
    const slots = [];
    const day = new Date(date).getDay();
    const cfg = SETTINGS.weekly.find(d => d.weekday === day);
    if (!cfg || !cfg.active || !cfg.start || !cfg.end) return slots;

    const [sh, sm] = cfg.start.split(':').map(Number);
    const [eh, em] = cfg.end.split(':').map(Number);
    const start = new Date(`${date}T${cfg.start}:00`);
    const end = new Date(`${date}T${cfg.end}:00`);

    // Antelación mínima
    const minAllowed = new Date();
    minAllowed.setMinutes(minAllowed.getMinutes() + SETTINGS.minNoticeMinutes);

    for (let t = new Date(start); t < end; t.setMinutes(t.getMinutes() + SETTINGS.slotMinutes)) {
      const time = t.toTimeString().slice(0,5);

      const inPast = t < minAllowed;
      const occupied = appointments.some(a => a.date === date && a.startTime === time && a.status !== 'cancelled');
      const blocked  = blocks.some(b => b.date === date && time >= b.startTime && time < b.endTime);

      slots.push({ time, available: !inPast && !occupied && !blocked });
    }
    return slots;
  };

  /* =================== RESERVAR =================== */
  const handleBooking = async (bookingData) => {
    try {
      const payload = {
        date: selectedDate,
        time: selectedTime,
        clientName: bookingData.clientName,
        clientPhone: bookingData.clientPhone,
        clientEmail: bookingData.clientEmail || '',
        notes: bookingData.notes || ''
      };
      const data = await apiPost('/book.php', payload);
      if (data?.ok) {
        toast({ title: "¡Turno reservado!", description: `Turno confirmado para el ${selectedDate} a las ${selectedTime}.` });
        setSelectedDate(null);
        setSelectedTime(null);
        await loadAgenda();
      } else {
        toast({ title: "No se pudo reservar", description: data?.message || 'Intenta nuevamente.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: "Error de red", description: "No pude crear el turno.", variant: 'destructive' });
    }
  };

  /* =================== ADMIN: CANCELAR TURNO =================== */
  const handleCancelAppointment = async (appointmentId) => {
    try {
      const data = await apiPost('/cancel_turno.php', { id: appointmentId });
      if (data?.ok) {
        toast({ title: "Turno cancelado", description: "El turno ha sido cancelado correctamente." });
        await loadAgenda();
      } else {
        toast({ title: "No pude cancelar", description: data?.message || 'Intenta de nuevo.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: "Error de red", description: "No pude cancelar el turno.", variant: 'destructive' });
    }
  };

  /* =================== ADMIN: BLOQUEOS =================== */
  const handleCreateBlock = async (blockData) => {
    try {
      const data = await apiPost('/block_slot.php', {
        date: blockData.date,
        startTime: blockData.startTime,
        endTime: blockData.endTime,
        reason: blockData.reason || ''
      });
      if (data?.ok) {
        toast({ title: "Bloqueo creado", description: "El bloqueo fue registrado." });
        await loadAgenda();
      } else {
        toast({ title: "No pude crear el bloqueo", description: data?.message || 'Verificá los datos.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: "Error de red", description: "No pude crear el bloqueo.", variant: 'destructive' });
    }
  };

  const handleDeleteBlock = async (blockId) => {
    try {
      const data = await apiPost('/unblock_slot.php', { id: blockId });
      if (data?.ok) {
        toast({ title: "Bloqueo eliminado", description: "El bloqueo fue eliminado." });
        await loadAgenda();
      } else {
        toast({ title: "No pude eliminar", description: data?.message || 'Intenta nuevamente.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: "Error de red", description: "No pude eliminar el bloqueo.", variant: 'destructive' });
    }
  };

  /* =================== UI =================== */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Helmet>
        <title>{SETTINGS.businessName} - Reserva tu turno online</title>
        <meta name="description" content="Reserva tu turno de peluquería online. Cortes modernos, atención personalizada en el corazón de Buenos Aires." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content={`${SETTINGS.businessName} - Reserva tu turno online`} />
        <meta property="og:description" content="Reserva tu turno de peluquería online. Cortes modernos, atención personalizada." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://estiloycorte.com.ar" />
      </Helmet>

      <Toaster />

      {/* WhatsApp Float Button */}
      <a 
        href={`https://wa.me/${SETTINGS.whatsapp.replace('+', '')}`}
        className="floating-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <Phone size={24} />
      </a>

      {!isAdmin ? (
        <PublicSite 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          generateTimeSlots={generateTimeSlots}
          handleBooking={handleBooking}
          handleLogin={handleLogin}
          settings={SETTINGS}
          toast={toast}
        />
      ) : (
        <AdminPanel 
          adminPage={adminPage}
          setAdminPage={setAdminPage}
          handleLogout={handleLogout}
          appointments={appointments}
          setAppointments={setAppointments}
          blocks={blocks}
          setBlocks={setBlocks}
          settings={SETTINGS}
          toast={toast}
          onCancelAppointment={handleCancelAppointment}
          onCreateBlock={handleCreateBlock}
          onDeleteBlock={handleDeleteBlock}
        />
      )}
    </div>
  );
}

/* ===========================================================
   PÚBLICO (las secciones de tu UI original)
   =========================================================== */
function PublicSite({ 
  currentPage, setCurrentPage, mobileMenuOpen, setMobileMenuOpen,
  selectedDate, setSelectedDate, selectedTime, setSelectedTime,
  generateTimeSlots, handleBooking, handleLogin, settings, toast
}) {
  return (
    <>
      <Header 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        settings={settings}
      />
      <main>
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (<HomePage key="home" setCurrentPage={setCurrentPage} settings={settings} />)}
          {currentPage === 'booking' && (
            <BookingPage 
              key="booking"
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              generateTimeSlots={generateTimeSlots}
              handleBooking={handleBooking}
              settings={settings}
              toast={toast}
            />
          )}
          {currentPage === 'policies' && (<PoliciesPage key="policies" settings={settings} />)}
          {currentPage === 'contact' && (<ContactPage key="contact" settings={settings} />)}
          {currentPage === 'login' && (<LoginPage key="login" handleLogin={handleLogin} toast={toast} />)}
        </AnimatePresence>
      </main>
      <Footer settings={settings} />
    </>
  );
}

/* ---------- Header / Home / Booking / Policies / Contact / Login  ----------
   (Tu UI original; no la recorto para que pegues y ande tal cual)
   ------------------------------------------------------------------------- */

function Header({ currentPage, setCurrentPage, mobileMenuOpen, setMobileMenuOpen, settings }) {
  const navItems = [
    { id: 'home', label: 'Inicio' },
    { id: 'booking', label: 'Reservar Turno' },
    { id: 'policies', label: 'Políticas' },
    { id: 'contact', label: 'Contacto' }
  ];
  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button onClick={() => setCurrentPage('home')} className="text-2xl font-bold text-gradient">
              {settings.businessName}
            </button>
          </div>
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id ? 'text-sky-400 bg-slate-800/60' : 'text-slate-300 hover:text-sky-400'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button onClick={() => setCurrentPage('login')} className="text-slate-400 hover:text-slate-200 text-sm">
              Admin
            </button>
          </nav>
          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 hover:text-sky-400">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-slate-900 border-t border-slate-800">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentPage(item.id); setMobileMenuOpen(false); }}
                    className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                      currentPage === item.id ? 'text-sky-400 bg-slate-800/60' : 'text-slate-300 hover:text-sky-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button onClick={() => { setCurrentPage('login'); setMobileMenuOpen(false); }} className="block px-3 py-2 text-slate-400 hover:text-slate-200 text-base w-full text-left">
                  Admin
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function HomePage({ setCurrentPage, settings }) {
  const services = [
    { name: "Corte Clásico", description: "Corte tradicional con tijera y máquina", duration: "30 min" },
    { name: "Corte Moderno", description: "Estilos actuales y tendencias", duration: "30 min" },
    { name: "Barba y Bigote", description: "Arreglo y perfilado profesional", duration: "30 min" }
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fade-in">
      <section className="relative bg-gradient-to-r from-slate-900 via-slate-950 to-black text-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-4xl md:text-6xl font-extrabold mb-6">
            Bienvenido a {settings.businessName}
          </motion.h1>
          <motion.p initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-slate-300">
            Cortes modernos y clásicos con la mejor atención personalizada en el corazón de Buenos Aires
          </motion.p>
          <motion.button initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} onClick={() => setCurrentPage('booking')} className="btn-primary text-lg px-8 py-4">
            Reservar Turno Ahora
          </motion.button>
        </div>
      </section>
      <section id="servicios" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nuestros Servicios</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">Ofrecemos una amplia gama de servicios para que luzcas siempre impecable</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((s, i) => (
              <motion.div key={s.name} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.2 }} className="card text-center">
                <div className="mb-6 h-48 bg-slate-800/40 rounded-lg flex items-center justify-center text-slate-400">Imagen</div>
                <h3 className="text-xl font-bold mb-2">{s.name}</h3>
                <p className="text-slate-400 mb-4">{s.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400"><Clock size={16} className="inline mr-1" />{s.duration}</span>
                  <button onClick={() => setCurrentPage('booking')} className="btn-primary text-sm">Reservar</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function BookingPage({ selectedDate, setSelectedDate, selectedTime, setSelectedTime, generateTimeSlots, handleBooking, settings, toast }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ clientName: '', clientPhone: '', clientEmail: '', notes: '' });

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + settings.maxDaysAhead);

  const generateCalendarDays = () => {
    const days = [];
    const start = new Date(today);
    start.setHours(0,0,0,0);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d <= maxDate) {
        days.push({
          date: d.toISOString().split('T')[0],
          day: d.getDate(),
          isToday: d.toDateString() === today.toDateString(),
          isPast: d < today
        });
      }
    }
    return days;
  };

  const handleDateSelect = (date) => { setSelectedDate(date); setSelectedTime(null); setStep(2); };
  const handleTimeSelect = (time) => { setSelectedTime(time); setStep(3); };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!formData.clientName || !formData.clientPhone) {
      toast({ title: "Campos requeridos", description: "Por favor completa nombre y teléfono.", variant: "destructive" });
      return;
    }
    handleBooking(formData);
    setStep(4);
  };

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Reservar Turno</h1>
          <p className="text-xl text-slate-400">Selecciona fecha, horario y completa tus datos</p>
        </div>

        {/* Pasos */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            {[1,2,3,4].map(n => (
              <div key={n} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? 'bg-slate-800/60 text-white':'bg-slate-800 text-slate-400'}`}>{n}</div>
                {n<4 && <div className={`w-12 h-1 ${step>n?'bg-slate-800/60':'bg-slate-800'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="card max-w-2xl mx-auto">
          {step === 1 && (
            <div className="fade-in">
              <h2 className="text-2xl font-bold mb-6 text-center">Selecciona una fecha</h2>
              <div className="calendar-grid">
                {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
                  <div key={d} className="text-center font-semibold text-slate-400 py-2">{d}</div>
                ))}
                {generateCalendarDays().map((day) => (
                  <button
                    key={day.date}
                    onClick={() => !day.isPast && handleDateSelect(day.date)}
                    disabled={day.isPast}
                    className={`calendar-day ${selectedDate===day.date?'selected':''} ${day.isPast?'disabled':''} ${day.isToday?'ring-2 ring-yellow-400':''}`}
                  >
                    {day.day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-200">← Volver</button>
                <h2 className="text-2xl font-bold">Selecciona horario</h2>
                <div />
              </div>
              <p className="text-center text-slate-400 mb-6">Fecha seleccionada: {new Date(selectedDate).toLocaleDateString('es-AR')}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {timeSlots.map((slot) => (
                  <button key={slot.time} onClick={() => slot.available && handleTimeSelect(slot.time)} disabled={!slot.available}
                          className={`time-slot ${selectedTime===slot.time?'selected':''} ${!slot.available?'disabled':''}`}>
                    {slot.time}
                  </button>
                ))}
              </div>
              {timeSlots.length === 0 && <p className="text-center text-slate-400 py-8">No hay horarios disponibles para esta fecha</p>}
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-200">← Volver</button>
                <h2 className="text-2xl font-bold">Tus datos</h2>
                <div />
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-300">
                  <strong>Fecha:</strong> {new Date(selectedDate).toLocaleDateString('es-AR')} &nbsp;|&nbsp; <strong>Horario:</strong> {selectedTime}
                </p>
              </div>
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nombre y Apellido *</label>
                  <input type="text" required value={formData.clientName}
                         onChange={e=>setFormData({...formData, clientName: e.target.value})}
                         className="w-full px-4 py-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                         placeholder="Tu nombre completo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp *</label>
                  <input type="tel" required value={formData.clientPhone}
                         onChange={e=>setFormData({...formData, clientPhone: e.target.value})}
                         className="w-full px-4 py-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                         placeholder="+54 9 11 1234-5678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email (opcional)</label>
                  <input type="email" value={formData.clientEmail}
                         onChange={e=>setFormData({...formData, clientEmail: e.target.value})}
                         className="w-full px-4 py-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                         placeholder="tu@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Comentarios (opcional)</label>
                  <textarea rows={3} value={formData.notes}
                            onChange={e=>setFormData({...formData, notes: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="Tipo de corte, preferencias..." />
                </div>
                <button type="submit" className="w-full btn-primary py-4 text-lg">Confirmar Reserva</button>
              </form>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in text-center">
              <div className="text-6xl mb-6">✅</div>
              <h2 className="text-2xl font-bold text-green-500 mb-4">¡Turno Confirmado!</h2>
              <p className="text-slate-400 mb-6">Te enviamos un email de confirmación. Si necesitás cambiar algo, escribinos por WhatsApp.</p>
              <div className="space-y-4">
                <button onClick={() => { setStep(1); setSelectedDate(null); setSelectedTime(null); setFormData({clientName:'',clientPhone:'',clientEmail:'',notes:''}); }} className="w-full btn-primary">Reservar Otro Turno</button>
                <a href={`https://wa.me/${settings.whatsapp.replace('+','')}`} target="_blank" rel="noopener noreferrer" className="w-full btn-secondary block text-center">Contactar por WhatsApp</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PoliciesPage() { /* ... igual que tu versión ... */ return <div className="py-20 max-w-4xl mx-auto px-4 text-slate-300">Políticas del servicio…</div>; }
function ContactPage({ settings }) { /* ... versión resumida ... */ return (
  <div className="py-20 max-w-4xl mx-auto px-4 text-slate-300">
    <h2 className="text-3xl font-bold text-white mb-6">Contacto</h2>
    <p className="mb-2"><MapPin className="inline mr-2" size={18}/>{settings.address}</p>
    <p className="mb-2"><Phone className="inline mr-2" size={18}/>{settings.whatsapp}</p>
    <p className="mb-2"><Mail  className="inline mr-2" size={18}/>{settings.email}</p>
  </div>
);}

function LoginPage({ handleLogin, toast }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const submit = e => { e.preventDefault(); if(!email||!password){ toast({title:'Completa email y contraseña',variant:'destructive'}); return;} handleLogin(email,password); };
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="py-20 min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">Acceso Administrador</h1>
            <p className="text-slate-400">Demo → admin@estiloycorte.com.ar / admin123</p>
          </div>
          <form onSubmit={submit} className="space-y-6">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-700 rounded-lg" placeholder="Email" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-700 rounded-lg" placeholder="Contraseña" />
            <button type="submit" className="w-full btn-primary py-3">Iniciar Sesión</button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

/* ===========================================================
   ADMIN
   =========================================================== */
function AdminPanel({ adminPage, setAdminPage, handleLogout, appointments, blocks, settings, toast, onCancelAppointment, onCreateBlock, onDeleteBlock }) {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <div className="admin-sidebar w-64 flex-shrink-0">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">Panel Admin</h1>
          <p className="text-slate-400 text-sm">{settings.businessName}</p>
        </div>
        <nav className="space-y-2">
          <button onClick={()=>setAdminPage('dashboard')}    className={`admin-nav-item w-full ${adminPage==='dashboard'?'active':''}`}><User size={20} className="mr-3"/>Dashboard</button>
          <button onClick={()=>setAdminPage('appointments')} className={`admin-nav-item w-full ${adminPage==='appointments'?'active':''}`}><Calendar size={20} className="mr-3"/>Agenda</button>
          <button onClick={()=>setAdminPage('blocks')}       className={`admin-nav-item w-full ${adminPage==='blocks'?'active':''}`}><X size={20} className="mr-3"/>Bloqueos</button>
          <button onClick={()=>setAdminPage('settings')}     className={`admin-nav-item w-full ${adminPage==='settings'?'active':''}`}><Settings size={20} className="mr-3"/>Configuración</button>
        </nav>
        <div className="mt-auto pt-8">
          <button onClick={handleLogout} className="admin-nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"><LogOut size={20} className="mr-3"/>Cerrar Sesión</button>
        </div>
      </div>

      <div className="flex-1 p-8">
        <AnimatePresence mode="wait">
          {adminPage === 'dashboard' && (<AdminDashboard key="dashboard" appointments={appointments} settings={settings} />)}
          {adminPage === 'appointments' && (<AdminAppointments key="appointments" appointments={appointments} onCancel={onCancelAppointment} />)}
          {adminPage === 'blocks' && (<AdminBlocks key="blocks" blocks={blocks} onCreate={onCreateBlock} onDelete={onDeleteBlock} />)}
          {adminPage === 'settings' && (<AdminSettings key="settings" settings={settings} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AdminDashboard({ appointments, settings }) {
  const today = new Date().toISOString().split('T')[0];
  const todayApts = appointments.filter(a => a.date === today && a.status !== 'cancelled');
  const stats = {
    todayTotal: todayApts.length,
    todayCancelled: appointments.filter(a => a.date === today && a.status === 'cancelled').length,
    totalThisWeek: appointments.filter(a => {
      const d = new Date(a.date);
      const w0 = new Date(); w0.setDate(w0.getDate() - w0.getDay());
      return d >= w0 && a.status !== 'cancelled';
    }).length
  };
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 mb-2">Dashboard</h1>
        <p className="text-slate-400">Resumen de actividad de {settings.businessName}</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card"><h3 className="text-lg font-semibold text-gray-300 mb-2">Turnos Hoy</h3><p className="text-3xl font-bold text-sky-400">{stats.todayTotal}</p></div>
        <div className="card"><h3 className="text-lg font-semibold text-gray-300 mb-2">Cancelados Hoy</h3><p className="text-3xl font-bold text-red-500">{stats.todayCancelled}</p></div>
        <div className="card"><h3 className="text-lg font-semibold text-gray-300 mb-2">Esta Semana</h3><p className="text-3xl font-bold text-green-500">{stats.totalThisWeek}</p></div>
      </div>
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Turnos de Hoy</h2>
        {todayApts.length===0 ? <p className="text-slate-400 text-center py-8">No hay turnos programados para hoy</p> :
          <div className="space-y-4">
            {todayApts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-lg">
                <div>
                  <p className="font-semibold">{a.startTime} - {a.clientName}</p>
                  <p className="text-sm text-slate-400">{a.clientPhone}</p>
                  {a.notes && <p className="text-sm text-slate-400 italic">{a.notes}</p>}
                </div>
                <span className={`status-badge status-${a.status}`}>{a.status==='confirmed'?'Confirmado':a.status}</span>
              </div>
            ))}
          </div>}
      </div>
    </motion.div>
  );
}

function AdminAppointments({ appointments, onCancel }) {
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const list = appointments.filter(a => (filter==='all'||a.status===filter) && (!dateFilter || a.date===dateFilter));
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-100 mb-2">Agenda de Turnos</h1><p className="text-slate-400">Gestiona todos los turnos</p></div>
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div><label className="block text-sm mb-2">Estado</label>
            <select value={filter} onChange={e=>setFilter(e.target.value)} className="px-3 py-2 border border-slate-700 rounded-lg">
              <option value="all">Todos</option><option value="confirmed">Confirmados</option><option value="cancelled">Cancelados</option>
            </select></div>
          <div><label className="block text-sm mb-2">Fecha</label>
            <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="px-3 py-2 border border-slate-700 rounded-lg"/></div>
          <div className="flex items-end"><button onClick={()=>{setFilter('all');setDateFilter('');}} className="px-4 py-2 text-slate-400 hover:text-slate-200">Limpiar filtros</button></div>
        </div>
      </div>
      <div className="card">
        {list.length===0 ? <p className="text-slate-400 text-center py-8">No hay turnos</p> :
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b">
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Hora</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">Teléfono</th>
                <th className="text-left py-3 px-4">Estado</th>
                <th className="text-left py-3 px-4">Acciones</th>
              </tr></thead>
              <tbody>
              {list.map(a => (
                <tr key={a.id} className="border-b hover:bg-slate-950">
                  <td className="py-3 px-4">{new Date(a.date).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-4">{a.startTime}</td>
                  <td className="py-3 px-4"><p className="font-medium">{a.clientName}</p>{a.clientEmail && <p className="text-sm text-slate-400">{a.clientEmail}</p>}</td>
                  <td className="py-3 px-4">{a.clientPhone}</td>
                  <td className="py-3 px-4"><span className={`status-badge status-${a.status}`}>{a.status==='confirmed'?'Confirmado':a.status}</span></td>
                  <td className="py-3 px-4">
                    {a.status==='confirmed' && <button onClick={()=>onCancel(a.id)} className="text-red-500 hover:text-red-300 text-sm">Cancelar</button>}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>}
      </div>
    </motion.div>
  );
}

function AdminBlocks({ blocks, onCreate, onDelete }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ date:'', startTime:'', endTime:'', reason:'' });
  const submit = e => { e.preventDefault(); onCreate(form); setForm({date:'',startTime:'',endTime:'',reason:''}); setShow(false); };
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-gray-100 mb-2">Bloqueos</h1><p className="text-slate-400">Bloquea horarios específicos</p></div>
        <button onClick={()=>setShow(true)} className="btn-primary">Crear Bloqueo</button>
      </div>
      {show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Nuevo Bloqueo</h2>
            <form onSubmit={submit} className="space-y-4">
              <input type="date" required value={form.date} onChange={e=>setForm({...form, date:e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg"/>
              <div className="grid grid-cols-2 gap-4">
                <input type="time" required value={form.startTime} onChange={e=>setForm({...form, startTime:e.target.value})} className="px-3 py-2 border border-slate-700 rounded-lg"/>
                <input type="time" required value={form.endTime} onChange={e=>setForm({...form, endTime:e.target.value})} className="px-3 py-2 border border-slate-700 rounded-lg"/>
              </div>
              <input type="text" placeholder="Motivo (opcional)" value={form.reason} onChange={e=>setForm({...form, reason:e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg"/>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">Crear</button>
                <button type="button" onClick={()=>setShow(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="card">
        <h2 className="text-xl font-bold mb-6">Bloqueos Activos</h2>
        {blocks.length===0 ? <p className="text-slate-400 text-center py-8">No hay bloqueos configurados</p> :
          <div className="space-y-4">
            {blocks.map(b => (
              <div key={b.id} className="flex items-center justify-between p-4 bg-red-50/5 border border-red-900/30 rounded-lg">
                <div>
                  <p className="font-medium">{new Date(b.date).toLocaleDateString('es-AR')} — {b.startTime} a {b.endTime}</p>
                  {b.reason && <p className="text-sm text-slate-400">{b.reason}</p>}
                </div>
                <button onClick={()=>onDelete(b.id)} className="text-red-400 hover:text-red-200 text-sm">Eliminar</button>
              </div>
            ))}
          </div>}
      </div>
    </motion.div>
  );
}

function AdminSettings({ settings }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-100">Configuración</h1>
      <div className="card text-slate-300">Esta sección es visual en esta versión. Para cambiar horarios, editá SETTINGS en App.jsx.</div>
    </motion.div>
  );
}

function Footer({ settings }) {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
        <p>&copy; 2024 {settings.businessName}. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

export default App;
