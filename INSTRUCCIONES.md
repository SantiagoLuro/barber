# Santi Rojas — Barbería Web App

## Cómo correr el proyecto

### 1. Backend (Node.js)

```bash
cd server
npm install
node index.js
```

El servidor corre en `http://localhost:3001`

**Credenciales admin por defecto:**
- Email: `admin@santirojas.com`
- Contraseña: `admin123`

> ⚠️ Cambiá la contraseña desde el panel de administración después del primer login.

---

### 2. Frontend (React + Vite)

```bash
# En la carpeta raíz del proyecto
npm install
npm run dev
```

El frontend corre en `http://localhost:5173`

---

## Estructura del proyecto

```
PELUQUERIA/
├── server/
│   ├── index.js        ← API REST (Express + SQLite)
│   ├── package.json
│   └── peluqueria.db   ← Base de datos (se crea sola)
├── src/
│   ├── App.jsx         ← Toda la app frontend
│   └── index.css       ← Estilos barbería negro/dorado
└── ...
```

## Panel de Administración

Ingresá desde `/login` con las credenciales admin. El panel tiene:

- **Dashboard** — Estadísticas de turnos de hoy, semana y mes
- **Agenda del día** — Vista completa de todos los slots del día. Podés:
  - ✅ Marcar un turno como atendido
  - 👻 Marcar como "no vino"
  - ❌ Cancelar un turno
  - 🔒 Bloquear un slot individual
  - 🔓 Desbloquear un slot bloqueado
- **Todos los turnos** — Historial con filtros por fecha, estado y búsqueda
- **Bloqueos** — Crear y eliminar bloqueos de rangos de horario por fecha
- **Horarios semanales** — Configurar apertura/cierre de cada día de la semana
- **Configuración** — Cambiar nombre, dirección, WhatsApp, duración de slots, etc.
