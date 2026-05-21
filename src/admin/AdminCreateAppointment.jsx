import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, RefreshCw, Calendar, Clock } from 'lucide-react';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('adminToken');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error de servidor');
  return data;
}

const SERVICES = ['Corte clásico', 'Corte moderno', 'Barba', 'Corte + Barba', 'Degradé', 'Diseño de cejas', 'Tratamiento'];

export default function AdminCreateAppointment({ onClose, onSuccess, toast, defaultDate }) {
  const [form, setForm] = useState({
    date: defaultDate || new Date().toISOString().split('T')[0],
    time: '09:00',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    service: SERVICES[0],
    notes: '',
    internalNotes: '',
    price: '',
    force: false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/admin/appointments', { method: 'POST', body: JSON.stringify({ ...form, price: parseInt(form.price) || 0 }) });
      toast({ title: 'Turno creado' });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{ background: 'var(--dark)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', padding: '24px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--dark-4)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-light)' }}><X size={14} /></button>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--cream)', marginBottom: 6 }}>Crear turno</h3>
        <p style={{ color: 'var(--gray-light)', fontSize: 14, marginBottom: 24 }}>El admin puede crear turnos ignorando disponibilidad si es necesario.</p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label"><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />Fecha *</label>
              <input type="date" className="input-dark" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="field-label"><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Hora *</label>
              <input type="time" className="input-dark" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>

          <div><label className="field-label">Nombre del cliente *</label><input className="input-dark" required placeholder="Nombre completo" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} /></div>
          <div><label className="field-label">Teléfono *</label><input className="input-dark" required placeholder="+54 9 11..." value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })} /></div>
          <div><label className="field-label">Email (para enviar confirmación)</label><input className="input-dark" type="email" placeholder="tu@email.com" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Servicio</label>
              <select className="input-dark" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Precio ($)</label>
              <input type="number" className="input-dark" placeholder="0" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>

          <div><label className="field-label">Notas del cliente</label><textarea className="input-dark" rows={2} placeholder="Preferencias, tipo de corte..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div><label className="field-label">Notas internas (solo admin)</label><textarea className="input-dark" rows={2} placeholder="Notas privadas..." value={form.internalNotes} onChange={e => setForm({ ...form, internalNotes: e.target.value })} /></div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.force} onChange={e => setForm({ ...form, force: e.target.checked })} style={{ accentColor: 'var(--gold)' }} />
            <span style={{ color: 'var(--gray-light)', fontSize: 13 }}>Forzar creación (ignorar disponibilidad y días bloqueados)</span>
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="submit" disabled={saving} className="btn-gold" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={14} /> Crear turno</>}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', display: 'flex', padding: '13px' }}>Cancelar</button>
          </div>
        </form>
      </motion.div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
