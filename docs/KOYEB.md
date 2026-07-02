# Desplegar Back Core API en Koyeb (gratis)

Esta guía publica la **API HTTP** del repo `back-core` en [Koyeb](https://www.koyeb.com/) usando el plan **Free Instance** (1 servicio web gratuito).

## Qué va en Koyeb y qué no

| Componente | Dónde se despliega |
|------------|-------------------|
| API HTTP (`api/server.js`) | **Koyeb** |
| Reglas Firestore | Firebase CLI (`firebase deploy --only firestore:rules`) |
| Cloud Functions (triggers/cron) | Firebase CLI (`firebase deploy --only functions`) |
| Scripts seed | Se ejecutan en tu PC con service account |

Koyeb **no** puede hospedar Firestore ni Cloud Functions; solo el servidor Node/Express.

## Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio |
| GET | `/api/v1/resumen` | Totales de colecciones (requiere credenciales Firebase) |
| POST | `/api/v1/pre-evaluar-prospecto` | RF-38 (requiere `Authorization: Bearer <token Firebase>`) |

Tras desplegar, tu URL será algo como:

`https://NOMBRE-APP-ORG.koyeb.app`

Prueba: `https://TU-URL.koyeb.app/health`

---

## Paso 1 — Subir cambios a GitHub

Asegúrate de que el repo tenga `package.json` en la raíz y la carpeta `api/`:

https://github.com/75535671-eng/back-core

---

## Paso 2 — Service account de Firebase

1. Firebase Console → **Project settings** → **Service accounts**
2. **Generate new private key** (proyecto `caja-cusco-ventas`)
3. Guarda el JSON **en tu PC** (no lo subas a GitHub)

En Koyeb pegarás el contenido completo del JSON como variable de entorno.

---

## Paso 3 — Crear cuenta en Koyeb

1. Entra a https://app.koyeb.com/auth/signup
2. Plan gratuito: **1 Free Instance** (512 MB RAM, escala a cero tras 1 h sin tráfico)

---

## Paso 4 — Crear Web Service desde GitHub

1. **Create Web Service** → **Web Service**
2. **GitHub** → autoriza Koyeb
3. Repositorio: `75535671-eng/back-core`
4. Rama: `main`
5. **Builder**: Buildpack (detección automática de Node.js)
6. **Instance**: **Free** / Nano
7. **Region**: Frankfurt o Washington D.C. (única opción en free)
8. **Run command** (por defecto): `npm start`

### Variables de entorno (Settings → Environment variables)

| Variable | Valor |
|----------|--------|
| `FIREBASE_PROJECT_ID` | `caja-cusco-ventas` |
| `FIREBASE_SERVICE_ACCOUNT` | Pega el JSON completo de la service account (una sola línea) |
| `NODE_ENV` | `production` |

> **Importante:** en Koyeb, al crear el secret de `FIREBASE_SERVICE_ACCOUNT`, pega el JSON entero. Si da error, minifica el JSON (sin saltos de línea) con una herramienta online o PowerShell:

```powershell
(Get-Content "ruta\serviceAccountKey.json" -Raw | ConvertFrom-Json | ConvertTo-Json -Compress)
```

9. Clic en **Deploy**

El build ejecutará `npm install` y luego `npm start`.

---

## Paso 5 — Verificar

```powershell
curl https://TU-APP.koyeb.app/health
```

Respuesta esperada:

```json
{"status":"ok","project":"caja-cusco-ventas","uptimeSec":12}
```

Resumen Firestore:

```powershell
curl https://TU-APP.koyeb.app/api/v1/resumen
```

---

## Paso 6 — Pre-evaluación (desde app o Postman)

```http
POST https://TU-APP.koyeb.app/api/v1/pre-evaluar-prospecto
Authorization: Bearer <ID_TOKEN_FIREBASE>
Content-Type: application/json

{
  "documento": "12345678",
  "ingresosMensuales": 2500,
  "montoSolicitado": 5000,
  "tipoNegocio": "Comercio"
}
```

---

## Limitaciones del plan gratis Koyeb

- **Cold start**: tras ~1 h sin visitas, la primera petición tarda unos segundos
- **1 servicio** free por organización
- **512 MB RAM** — suficiente para esta API ligera
- Reglas y Functions siguen en **Firebase** (no en Koyeb)

---

## Actualizar después de cambios

1. Editas código en `back-core`
2. `git push origin main`
3. Koyeb redeploy automático (si activaste auto-deploy en el servicio)

---

## Problemas frecuentes

| Error | Solución |
|-------|----------|
| Build falla | Verifica que exista `package.json` en la raíz con `"start": "node api/server.js"` |
| 500 en `/api/v1/resumen` | Revisa `FIREBASE_SERVICE_ACCOUNT` y permisos de la cuenta de servicio |
| 401 en pre-evaluar | Token Firebase expirado; renueva login en la app |
| App dormida | Abre `/health` y espera unos segundos (cold start) |
