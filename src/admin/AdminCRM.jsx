import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Search, Star, Plus, X, RefreshCw, ChevronRight, Edit2, CheckCircle, Phone, Mail, Scissors, Crown, Sparkles } from 'lucide-react';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('adminToken');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error de servidor');
  return data;
}

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } }
};

const statusLabel = { confirmed: 'Confirmado', cancelled: 'Cancelado', attended: 'Atendido', 'no-show': 'No vino' };

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function ClientAvatar({ name, size = 44, isVip }) {
  const colors = ['#C9A84C', '#74B9FF', '#55efc4', '#a29bfe', '#fd79a8', '#fdcb6e'];
  const colorIndex = (name || '').charCodeAt(0) % colors.length;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: `rgba(${hexToRgb(colors[colorIndex])},0.15)`, border: `2px solid ${colors[colorIndex]}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: colors[colorIndex], fontWeight: 800, fontSize: size * 0.35 }}>{getInitials(name)}</span>
      </div>
      {isVip && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Crown size={9} color="#000" /></div>}
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function AdminCRM({ toast }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try { const d = await apiFetch(`/admin/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`); setClients(d.clients || []); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._crmSearchTimer);
    window._crmSearchTimer = setTimeout(() => load(e.target.value), 400);
  };

  const createClient = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      await apiFetch('/admin/clients', { method: 'POST', body: JSON.stringify(newForm) });
      toast({ title: 'Cliente creado' }); setShowNew(false); setNewForm({ name: '', phone: '', email: '', notes: '' }); load(search);
    } catch (err) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setCreating(false); }
  };

  const vipCount = clients.filter(c => c.total_visits >= 10).length;
  const newCount = clients.filter(c => {
    const d = new Date(c.created_at);
    return (Date.now() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 4 }}>Clientes</h1>
          <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>{clients.length} clientes · {vipCount} VIP · {newCount} nuevos este mes</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-gold"><Plus size={14} /> Nuevo cliente</button>
      </div>

      {/* Buscador */}
      <div className="card-static" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 20 }}>
        <Search size={16} color="var(--gray-mid)" />
        <input
          className="input-dark" placeholder="Buscar por nombre, teléfono o email..."
          value={search} onChange={handleSearch}
          style={{ border: 'none', background: 'transparent', flex: 1, padding: 0, outline: 'none', color: 'var(--cream)', fontSize: 14 }}
        />
        {search && <button onClick={() => { setSearch(''); load(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-mid)' }}><X size={14} /></button>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'var(--gold)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : clients.length === 0 ? (
        <div className="card-static" style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-mid)' }}>
          <User size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
          <p>No se encontraron clientes</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {clients.map((c, i) => {
            const isVip = c.total_visits >= 10;
            const isNew = (Date.now() - new Date(c.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(c.id)}
                style={{ padding: '16px 18px', background: 'var(--dark-2)', border: `1px solid ${isVip ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 12, cursor: 'pointer', transition: 'border-color 0.2s', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = isVip ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)'}
              >
                <ClientAvatar name={c.name} isVip={isVip} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, color: 'var(--cream)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    {isVip && <span style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.05em' }}>VIP</span>}
                    {isNew && <span style={{ fontSize: 10, fontWeight: 700, color: '#55efc4', background: 'rgba(85,239,196,0.1)', border: '1px solid rgba(85,239,196,0.3)', borderRadius: 4, padding: '1px 6px' }}>NUEVO</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--gray-light)', marginBottom: 2 }}>{c.phone}</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-mid)' }}>
                    {c.total_visits} visita{c.total_visits !== 1 ? 's' : ''} {c.last_visit ? `· Último: ${c.last_visit}` : ''}
                  </p>
                </div>
                <ChevronRight size={16} color="var(--gray-mid)" />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Panel detalle cliente */}
      <AnimatePresence>
        {selected && <ClientDetail id={selected} onClose={() => setSelected(null)} toast={toast} onRefresh={() => load(search)} />}
      </AnimatePresence>

      {/* Modal nuevo cliente */}
      {showNew && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button onClick={() => setShowNew(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--dark-4)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-light)' }}><X size={14} /></button>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--cream)', marginBottom: 6 }}>Nuevo cliente</h3>
            <p style={{ color: 'var(--gray-light)', fontSize: 14, marginBottom: 24 }}>Agregá un cliente manualmente al CRM.</p>
            <form onSubmit={createClient} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="field-label">Nombre *</label><input className="input-dark" required placeholder="Nombre completo" value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} /></div>
              <div><label className="field-label">Teléfono *</label><input className="input-dark" required placeholder="+54 9 11..." value={newForm.phone} onChange={e => setNewForm({ ...newForm, phone: e.target.value })} /></div>
              <div><label className="field-label">Email</label><input className="input-dark" type="email" placeholder="tu@email.com" value={newForm.email} onChange={e => setNewForm({ ...newForm, email: e.target.value })} /></div>
              <div><label className="field-label">Notas internas</label><textarea className="input-dark" rows={2} placeholder="Preferencias, notas..." value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={creating} className="btn-gold" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
                  {creating ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={14} /> Crear cliente</>}
                </button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', display: 'flex', padding: '13px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
}

function ClientDetail({ id, onClose, toast, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(`/admin/clients/${id}`)
      .then(d => { setData(d); setForm({ name: d.client.name, phone: d.client.phone, email: d.client.email||'', notes: d.client.notes||'', preferred_service: d.client.preferred_service||'' }); })
      .catch(e => toast({ title: 'Error', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiFetch(`/admin/clients/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      toast({ title: 'Cliente actualizado' }); setEditing(false); onRefresh();
      const d = await apiFetch(`/admin/clients/${id}`); setData(d);
    } catch (err) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const isVip = data?.client.total_visits >= 10;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        style={{ background: 'var(--dark)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
          {data && <ClientAvatar name={data.client.name} size={52} isVip={isVip} />}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 20, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', margin: 0 }}>{data?.client.name}</h2>
              {isVip && <span style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '2px 8px' }}>👑 VIP</span>}
            </div>
            <p style={{ color: 'var(--gray-light)', fontSize: 13, margin: '2px 0 0' }}>{data?.client.phone} {data?.client.email ? `· ${data.client.email}` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(!editing)} className="btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Edit2 size={13} /> Editar</button>
            <button onClick={onClose} style={{ background: 'var(--dark-4)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-light)' }}><X size={14} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gold)' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Visitas', value: data.client.total_visits, color: 'var(--gold)' },
                  { label: 'Último corte', value: data.client.last_visit || 'N/A', color: 'var(--cream)' },
                  { label: 'Servicio favorito', value: data.client.preferred_service || 'N/A', color: 'var(--gray-light)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--dark-2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Form edición */}
              <AnimatePresence>
                {editing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ background: 'var(--dark-2)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, overflow: 'hidden' }}>
                    <h4 style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Editar cliente</h4>
                    <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label className="field-label">Nombre</label><input className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                      <div><label className="field-label">Teléfono</label><input className="input-dark" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                      <div><label className="field-label">Email</label><input className="input-dark" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                      <div><label className="field-label">Servicio preferido</label><input className="input-dark" value={form.preferred_service} onChange={e => setForm({ ...form, preferred_service: e.target.value })} /></div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label className="field-label">Notas internas del peluquero</label>
                        <textarea className="input-dark" rows={3} placeholder='Ej: "Le gusta el fade bajo", "Prefiere sin máquina en los lados"...' value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                      </div>
                      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
                        <button type="submit" disabled={saving} className="btn-gold" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
                          {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={13} /> Guardar</>}
                        </button>
                        <button type="button" onClick={() => setEditing(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', display: 'flex', padding: '12px' }}>Cancelar</button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notas internas (read) */}
              {!editing && data.client.notes && (
                <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                  <p style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>📝 Notas del peluquero</p>
                  <p style={{ color: 'var(--cream)', fontSize: 14, lineHeight: 1.6 }}>{data.client.notes}</p>
                </div>
              )}

              {/* Historial */}
              <h4 style={{ color: 'var(--cream)', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                Historial de turnos ({data.history?.length || 0})
              </h4>
              {!data.history?.length ? (
                <p style={{ color: 'var(--gray-mid)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin turnos registrados</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.history.map(a => (
                    <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'var(--dark-2)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{a.start_time}</p>
                        <p style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{a.date}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: 'var(--cream)' }}>{a.service}</p>
                        {a.notes && <p style={{ fontSize: 12, color: 'var(--gray-light)', fontStyle: 'italic' }}>{a.notes}</p>}
                      </div>
                      <span className={`badge badge-${a.status}`}>{statusLabel[a.status] || a.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
