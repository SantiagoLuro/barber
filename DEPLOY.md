# Deploy — Santi Rojas Barbería

## Arquitectura

```
Vercel (frontend React) → Railway (backend Node.js + SQLite)
```

---

## 1. Deploy del Backend en Railway

### Requisitos
- Cuenta en [railway.app](https://railway.app)
- El código subido a GitHub (solo la carpeta `/server`)

### Pasos

1. Ir a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Seleccionar el repositorio
3. En **Root Directory** poner: `server`
4. Railway detecta automáticamente que es Node.js con nixpacks

5. Ir a **Variables** y configurar:

   | Variable | Valor |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | (generá uno seguro, ej: `openssl rand -hex 32`) |
   | `FRONTEND_URL` | `https://tu-app.vercel.app` ← completar después del deploy de Vercel |

   Opcionales (para emails):
   | Variable | Valor |
   |----------|-------|
   | `MAIL_HOST` | `smtp.gmail.com` |
   | `MAIL_PORT` | `587` |
   | `MAIL_USER` | `tu@gmail.com` |
   | `MAIL_PASS` | `tu-app-password` (contraseña de aplicación de Google) |
   | `MAIL_FROM` | `Santi Rojas <tu@gmail.com>` |

6. Railway hace el deploy automáticamente. Te da una URL tipo:
   ```
   https://santi-rojas-backend.railway.app
   ```

7. Verificar que el backend funciona:
   ```
   https://santi-rojas-backend.railway.app/api/health
   ```
   Debe devolver: `{ "ok": true, "time": "..." }`

8. **Copiar la URL de Railway** — la necesitás en el siguiente paso.

---

## 2. Deploy del Frontend en Vercel

### Requisitos
- Cuenta en [vercel.com](https://vercel.com)
- El código subido a GitHub

### Pasos

1. Ir a [vercel.com](https://vercel.com) → **New Project** → importar el repositorio
2. Configuración:
   - **Root Directory**: dejar vacío (raíz del proyecto)
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. En **Environment Variables** agregar:

   | Variable | Valor |
   |----------|-------|
   | `VITE_API_URL` | `https://santi-rojas-backend.railway.app/api` ← URL de Railway |

4. Click en **Deploy**

5. Vercel te da una URL tipo:
   ```
   https://santi-rojas.vercel.app
   ```

6. Volver a Railway y actualizar `FRONTEND_URL` con la URL de Vercel.

---

## 3. Desarrollo local

```bash
# Terminal 1 — Backend
cd server
node index.js
# API disponible en http://localhost:3001

# Terminal 2 — Frontend
npm run dev
# App disponible en http://localhost:5173
# Las llamadas a /api son proxeadas automáticamente al backend local
```

No hace falta setear `VITE_API_URL` en local — el proxy de Vite lo maneja.

---

## Notas importantes

- **SQLite en Railway**: el filesystem es efímero. Los datos se pierden si el servicio se reinicia.
  Para persistencia real, migrar a PostgreSQL (Railway lo ofrece gratis) con la lib `better-sqlite3` → `pg`.
  Para una demo, SQLite en `/tmp` funciona perfectamente.

- **Credenciales admin por defecto**: `admin@santirojas.com` / `admin123`
  Cambiar la contraseña desde el panel admin después del primer login.

- **CORS**: el backend acepta cualquier origen (`origin: true`). Restringir a la URL de Vercel en producción real:
  ```js
  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
  ```
