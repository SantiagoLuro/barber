import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { RefreshCw, TrendingUp, TrendingDown, Users, DollarSign, Calendar, Scissors } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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

const GOLD = '#C9A84C';
const CHART_COLORS = ['#C9A84C', '#74B9FF', '#55efc4', '#a29bfe', '#fd79a8', '#fdcb6e', '#e17055', '#00cec9'];

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#aaa', font: { size: 12 } } },
    tooltip: { backgroundColor: '#1a1a1a', borderColor: '#333', borderWidth: 1, titleColor: '#F5F0E8', bodyColor: '#aaa' }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888' } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888' } }
  }
};

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function AdminAnalytics({ toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch('/admin/analytics'); setData(d); }
    catch (e) { toast({ title: 'Error al cargar analytics', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: 'var(--gold)' }}>
      <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Build chart datasets
  const dowFull = [0,1,2,3,4,5,6].map(i => {
    const found = data.byDayOfWeek.find(d => d.dow === i);
    return found ? found.count : 0;
  });

  const barDow = {
    labels: DAYS_ES,
    datasets: [{ label: 'Turnos', data: dowFull, backgroundColor: CHART_COLORS.map(c => `${c}99`), borderColor: CHART_COLORS, borderWidth: 1, borderRadius: 6 }]
  };

  const pieServices = {
    labels: data.byService.map(s => s.service),
    datasets: [{ data: data.byService.map(s => s.count), backgroundColor: CHART_COLORS.map(c => `${c}cc`), borderColor: CHART_COLORS, borderWidth: 2 }]
  };

  const monthLabels = data.monthlyStats.map(m => {
    const [year, month] = m.month.split('-');
    return new Date(year, month - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
  });
  const lineMonthly = {
    labels: monthLabels,
    datasets: [
      { label: 'Total turnos', data: data.monthlyStats.map(m => m.total), borderColor: GOLD, backgroundColor: `${GOLD}22`, tension: 0.4, fill: true, pointBackgroundColor: GOLD },
      { label: 'Clientes nuevos', data: data.monthlyStats.map(m => m.new_clients), borderColor: '#55efc4', backgroundColor: '#55efc422', tension: 0.4, fill: false, pointBackgroundColor: '#55efc4' },
    ]
  };

  // Heatmap by hour (simple bar)
  const barHours = {
    labels: data.byHour.map(h => h.start_time),
    datasets: [{ label: 'Turnos', data: data.byHour.map(h => h.count), backgroundColor: data.byHour.map(h => {
      const max = Math.max(...data.byHour.map(x => x.count), 1);
      const intensity = h.count / max;
      return `rgba(201,168,76,${0.2 + intensity * 0.8})`;
    }), borderRadius: 4 }]
  };

  const revDiff = data.revenue.current - data.revenue.last;
  const revPct = data.revenue.last > 0 ? Math.round((revDiff / data.revenue.last) * 100) : 0;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: 'var(--cream)', marginBottom: 4 }}>Analytics</h1>
          <p style={{ color: 'var(--gray-light)', fontSize: 14 }}>Estadísticas del negocio</p>
        </div>
        <button onClick={load} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><RefreshCw size={14} /> Actualizar</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }} className="stats-grid">
        {[
          { label: 'Clientes totales', value: data.clients.total, icon: <Users size={18} />, color: '#74B9FF' },
          { label: 'Clientes VIP', value: data.clients.vip, icon: <Scissors size={18} />, color: GOLD },
          { label: 'Ingresos este mes', value: `$${(data.revenue.current||0).toLocaleString('es-AR')}`, icon: <DollarSign size={18} />, color: '#55efc4' },
          { label: 'vs mes anterior', value: `${revPct >= 0 ? '+' : ''}${revPct}%`, icon: revDiff >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />, color: revDiff >= 0 ? '#55efc4' : '#e74c3c' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-light)' }}>{s.label}</p>
              <div style={{ color: s.color, opacity: 0.7 }}>{s.icon}</div>
            </div>
            <p style={{ fontSize: 30, fontWeight: 800, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Turnos por día + Servicios */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }} className="analytics-row">
        <div className="card-static">
          <h3 style={{ color: 'var(--cream)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Turnos por día de la semana</h3>
          <div style={{ height: 240 }}>
            <Bar data={barDow} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: false } } }} />
          </div>
        </div>
        <div className="card-static">
          <h3 style={{ color: 'var(--cream)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Servicios más pedidos</h3>
          {data.byService.length === 0 ? (
            <p style={{ color: 'var(--gray-mid)', textAlign: 'center', padding: '60px 0' }}>Sin datos</p>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center' }}>
              <Pie data={pieServices} options={{ ...chartDefaults, scales: undefined }} />
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Evolución mensual */}
      <div className="card-static" style={{ marginBottom: 20 }}>
        <h3 style={{ color: 'var(--cream)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Evolución mensual de turnos</h3>
        {data.monthlyStats.length === 0 ? (
          <p style={{ color: 'var(--gray-mid)', textAlign: 'center', padding: '40px 0' }}>Sin datos suficientes</p>
        ) : (
          <div style={{ height: 240 }}>
            <Line data={lineMonthly} options={chartDefaults} />
          </div>
        )}
      </div>

      {/* Row 3: Heatmap horarios */}
      <div className="card-static">
        <h3 style={{ color: 'var(--cream)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Horarios más ocupados</h3>
        <p style={{ color: 'var(--gray-mid)', fontSize: 13, marginBottom: 20 }}>Intensidad de reservas por franja horaria</p>
        {data.byHour.length === 0 ? (
          <p style={{ color: 'var(--gray-mid)', textAlign: 'center', padding: '40px 0' }}>Sin datos</p>
        ) : (
          <div style={{ height: 200 }}>
            <Bar data={barHours} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: false } } }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:900px){.stats-grid{grid-template-columns:1fr 1fr!important;}}
        @media(max-width:600px){.stats-grid{grid-template-columns:1fr!important;}.analytics-row{grid-template-columns:1fr!important;}}
      `}</style>
    </motion.div>
  );
}
