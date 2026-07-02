# Desplegar Back Core API en Render (gratis)

Guía para publicar la API HTTP en [Render](https://render.com/) con el plan **Free** (sin tarjeta obligatoria para empezar).

## Qué va en Render y qué no

| Componente | Dónde |
|------------|--------|
| API HTTP (`api/server.js`) | **Render** |
| Reglas Firestore | Firebase CLI |
| Cloud Functions | Firebase CLI |
| Scripts seed | Tu PC (local) |

## URL final

Tras desplegar tendrás algo como:

**`https://cajacusco-back-core.onrender.com`**

Prueba: `https://TU-SERVICIO.onrender.com/health`

---

## Paso 1 — Repo en GitHub

Repo listo: https://github.com/75535671-eng/back-core

Debe tener en la raíz:
- `package.json` con `"start": "node api/server.js"`
- carpeta `api/`

---

## Paso 2 — Service account Firebase

1. [Firebase Console](https://console.firebase.google.com/) → proyecto **`caja-cusco-ventas`**
2. ⚙️ **Project settings** → **Service accounts**
3. **Generate new private key** → descarga el JSON
4. **No lo subas a GitHub**

---

## Paso 3 — Cuenta Render

1. Regístrate en https://dashboard.render.com/register
2. Conecta tu cuenta de **GitHub**

---

## Paso 4 — Crear Web Service

### Opción A — Desde el Dashboard (recomendada)

1. **New +** → **Web Service**
2. Conecta el repo **`75535671-eng/back-core`**
3. Configura:

| Campo | Valor |
|-------|--------|
| **Name** | `cajacusco-back-core` |
| **Region** | Oregon (u otra free) |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

4. **Advanced** → **Health Check Path**: `/health`

5. **Environment Variables**:

| Key | Value |
|-----|--------|
| `FIREBASE_PROJECT_ID` | `caja-cusco-ventas` |
| `NODE_ENV` | `production` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo de la service account (pegar como Secret) |

Para minificar el JSON en PowerShell:

```powershell
(Get-Content "ruta\serviceAccountKey.json" -Raw | ConvertFrom-Json | ConvertTo-Json -Compress)
```

6. **Create Web Service**

### Opción B — Blueprint (`render.yaml`)

En el Dashboard: **New +** → **Blueprint** → repo `back-core`.

Luego agrega manualmente `FIREBASE_SERVICE_ACCOUNT` en el servicio (no va en el YAML por seguridad).

---

## Paso 5 — Verificar

Espera 2–5 min al primer deploy. Luego:

```powershell
curl https://cajacusco-back-core.onrender.com/health
```

Respuesta esperada:

```json
{"status":"ok","project":"caja-cusco-ventas","uptimeSec":5}
```

Totales Firestore:

```powershell
curl https://cajacusco-back-core.onrender.com/api/v1/resumen
```

---

## Endpoints

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/health` | No |
| GET | `/api/v1/resumen` | No (usa service account del servidor) |
| POST | `/api/v1/pre-evaluar-prospecto` | Bearer Firebase ID token |

Ejemplo pre-evaluar:

```http
POST /api/v1/pre-evaluar-prospecto
Authorization: Bearer <ID_TOKEN>
Content-Type: application/json

{
  "documento": "12345678",
  "ingresosMensuales": 2500,
  "montoSolicitado": 5000,
  "tipoNegocio": "Comercio"
}
```

---

## Plan Free — limitaciones

- **Se apaga** tras **15 minutos** sin tráfico
- La **primera petición** tras dormir tarda ~30–60 s (cold start)
- 512 MB RAM — suficiente para esta API
- Ideal para **demo / académico**, no producción crítica

### Evitar cold start (opcional)

Puedes hacer ping a `/health` cada 10–14 min con un cron externo gratuito (p. ej. cron-job.org). No es obligatorio para pruebas.

---

## Actualizar el backend

```powershell
git add .
git commit -m "Cambio en API"
git push origin main
```

Render redeploy automático si **Auto-Deploy** está activo.

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| Build failed | Revisa logs en Render → Events |
| 500 en `/api/v1/resumen` | Verifica `FIREBASE_SERVICE_ACCOUNT` |
| Tarda mucho la primera vez | Cold start del plan free; espera ~1 min |
| 401 en pre-evaluar | Token Firebase expirado |

---

## Render vs Koyeb

| | Render Free | Koyeb Free |
|---|-------------|------------|
| Tarjeta | No obligatoria al inicio | A veces piden verificación |
| Sleep | 15 min sin tráfico | ~1 h |
| URL | `*.onrender.com` | `*.koyeb.app` |

Para este proyecto recomendamos **Render** por simplicidad y plan free estable.
