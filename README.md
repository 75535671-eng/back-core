# Back Core — Caja Cusco

Backend del ecosistema móvil Caja Cusco sobre **Firebase** (proyecto **`caja-cusco-ventas`**).

Incluye reglas de seguridad, Cloud Functions y scripts operativos que alimentan **Fuerza de Ventas**, **Portal Cliente** y el panel **Front Core**.

## Estructura

```
back-core/
├── package.json             # API HTTP para Koyeb (npm start)
├── api/                     # Servidor Express
│   └── server.js
├── firestore.rules          # Reglas de acceso (RLS equivalente)
├── firebase.json            # Deploy de rules + functions
├── functions/               # Cloud Functions (Node 20)
│   ├── index.js             # preEvaluarProspecto, desactivarCampanasVencidas
│   └── sync_clientes_portal.js
└── scripts/                 # Seeds y utilidades con firebase-admin
    ├── seed_casos_30.mjs
    ├── seed_auth.mjs
    ├── seed_m7.mjs
    └── sync_a_portal_clientes.js
```

## Requisitos

- Node.js 20+
- [Firebase CLI](https://firebase.google.com/docs/cli)
- Cuenta con acceso al proyecto `caja-cusco-ventas`
- Service account key (local, **no commitear**):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="ruta\serviceAccountKey.json"
```

Guárdala en `scripts/.secrets/` (carpeta ignorada por Git).

## Instalar dependencias

```powershell
cd functions
npm install

cd ..\scripts
npm install
```

## Desplegar reglas y functions

Desde la raíz de este repo:

```powershell
firebase deploy --only firestore:rules --project caja-cusco-ventas
firebase deploy --only functions --project caja-cusco-ventas
```

## Seeds de datos de prueba

```powershell
cd scripts
$env:ASESOR_ID="uid-del-asesor-en-firebase-auth"
node seed_casos_30.mjs --portal-auth
```

Ver `docs/CASOS_30_FIRESTORE.md` para detalle de los 30 casos académicos.

## Cloud Functions expuestas

| Función | Tipo | Descripción |
|---------|------|-------------|
| `preEvaluarProspecto` | Callable | Pre-evaluación crediticia (RF-38) |
| `desactivarCampanasVencidas` | Cron | Desactiva campañas vencidas (RF-42) |
| `syncClientePortal` | Trigger Firestore | Sync clientes (legacy multi-proyecto) |
| `syncCreditoPortal` | Trigger Firestore | Sync créditos |
| `syncSolicitudPortal` | Trigger Firestore | Sync solicitudes |

> Las apps móvil y el front core leen Firestore directamente. Este repo es la capa de **reglas + lógica serverless + operaciones batch**.

## API HTTP en Koyeb (gratis)

Además de Firebase, puedes publicar la API REST en **Koyeb** (plan free):

Ver guía completa: [`docs/KOYEB.md`](docs/KOYEB.md)

```powershell
npm install
npm start
# Local: http://localhost:8080/health
```

## Repos relacionados

| Repo | Contenido |
|------|-----------|
| [cajacusco-fuerza-de-venta](https://github.com/75535671-eng/cajacusco-fuerza-de-venta) | App Flutter ventas |
| [cajacusco-cliente](https://github.com/75535671-eng/cajacusco-cliente) | App Flutter clientes |
| [front-core](https://github.com/75535671-eng/front-core) | Panel web administrador |

## Copia embebida

También existe copia sincronizada en `CAJACUSCO-VENTAS/` del monorepo local (mismo código fuente).
