# Core Admin Web — Caja Cusco

Panel web unificado para **administrador / supervisor**. Visualiza en una URL los datos de:

- **Fuerza de Ventas** (clientes, solicitudes, créditos, cartera, usuarios)
- **Portal Cliente** (cuentas_clientes, accesos al portal)

Todo lee el mismo Firestore: **`caja-cusco-ventas`**.

## URL local (desarrollo)

```powershell
cd "D:\APLICATIVOS MOVILES\CAJACUSCO-VENTAS"
firebase deploy --only firestore:rules --project caja-cusco-ventas
firebase serve --only hosting
```

Abre: **http://localhost:5000**

## URL publicada (producción)

```powershell
firebase deploy --only hosting --project caja-cusco-ventas
```

Quedará en:

**https://caja-cusco-ventas.web.app**

(o el dominio personalizado que configures en Firebase Hosting)

## Login

Solo usuarios con rol **`administrador`** o **`supervisor`** en la colección `usuarios`.

| Rol | Email ejemplo |
|-----|----------------|
| Administrador | `0404-4@cajacusco.com` |
| Supervisor | `0303-3@cajacusco.com` |

La contraseña es la de **Firebase Authentication** (no está en el código).

## Qué NO es este core

| Documento académico | Este proyecto |
|---------------------|---------------|
| PostgreSQL `bd_core_mobile` | Firestore |
| FastAPI puerto 8003 | Panel web + Firestore directo |
| sync_outbox al core financiero | No implementado |

Si más adelante necesitas integrar el core financiero institucional, se agregaría una capa API aparte.

## Estructura

```
CAJACUSCO-VENTAS/core-admin/public/
  index.html      → UI
  app.js          → Firebase Auth + Firestore
  styles.css      → Estilos
  firebase-config.js
```

## Próximas mejoras (opcional)

- Edición de usuarios y reasignación de cartera desde el web
- Gráficos de pipeline de solicitudes
- Cloud Functions para operaciones sensibles + auditoría
