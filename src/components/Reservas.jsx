import { useEffect, useState } from "react";

export default function Reservas() {
  const [fecha, setFecha] = useState("");
  const [horas, setHoras] = useState([]);
  const [form, setForm] = useState({ nombre:"", telefono:"", servicio:"Corte de pelo", hora:"" });
  const [msg, setMsg] = useState("");

  useEffect(()=>{
    if(!fecha){ setHoras([]); return; }
    fetch(`/api/free_slots.php?date=${fecha}`)
      .then(r=>r.json()).then(j=>{
        if(j.ok) setHoras(j.free||[]);
        else setHoras([]);
      });
  },[fecha]);

  async function reservar(e){
    e.preventDefault();
    setMsg("");
    const fd = new FormData();
    fd.append("nombre", form.nombre);
    fd.append("telefono", form.telefono);
    fd.append("servicio", form.servicio);
    fd.append("fecha", fecha);
    fd.append("hora", form.hora);
    const r = await fetch("/api/create_turno.php",{ method:"POST", body: fd });
    const j = await r.json();
    if (j.ok){ setMsg("¡Turno solicitado! Te confirmaremos por WhatsApp."); setHoras(horas.filter(h=>h!==form.hora)); }
    else setMsg(j.error || "No se pudo reservar.");
  }

  return (
    <div style={{maxWidth:720, margin:"40px auto", padding:"0 16px"}}>
      <h2>Reservar turno</h2>
      <form onSubmit={reservar}>
        <label>Nombre</label>
        <input value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} required />

        <label>Teléfono (WhatsApp)</label>
        <input value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} required />

        <label>Servicio</label>
        <select value={form.servicio} onChange={e=>setForm({...form, servicio:e.target.value})}>
          <option>Corte de pelo</option>
          <option>Barba</option>
          <option>Corte + Barba</option>
          <option>Color</option>
        </select>

        <label>Fecha</label>
        <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} required />

        <label>Horario disponible</label>
        <select value={form.hora} onChange={e=>setForm({...form, hora:e.target.value})} required>
          <option value="">Elegí un horario</option>
          {horas.map(h=><option key={h} value={h}>{h}</option>)}
        </select>

        <button className="btn btn-primary" type="submit" style={{marginTop:12}}>Reservar</button>
      </form>
      {msg && <p style={{marginTop:12}}>{msg}</p>}

      <p style={{opacity:.6, marginTop:20}}><a href="/admin/login.php" rel="nofollow">Acceso admin</a></p>
    </div>
  );
}
