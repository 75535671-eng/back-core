# 30 casos académicos → Firestore (Caja Cusco)

Fuente: **ENUNCIADOS_30_CASOS_CREDITO_FLUJO_MOVIL.md** (Banco Andino / flujo móvil).

## Adaptaciones respecto al documento original

| Documento académico | Este proyecto (Firestore) |
|---------------------|---------------------------|
| PostgreSQL `bd_core_mobile` | Firestore `caja-cusco-ventas` |
| API REST FastAPI (puerto 8003) | Apps Flutter leen/escriben Firestore directo |
| `sync_outbox` hacia core financiero | No implementado (fuera de alcance móvil) |
| Cronograma en tablas SQL | Campo `cronogramaCuotas[]` en documento `creditos` |
| Login cliente por documento | Firebase Auth `{dni}@cliente.cajacusco.pe` |
| Asignación automática del core | Documentos `cartera_diaria` en seed (tipo `NUEVA_SOLICITUD`) |

## Colecciones pobladas por caso

| Colección | Contenido |
|-----------|-----------|
| `clientes` | Perfil del solicitante (caso 1–30) |
| `clientes_por_dni` | Índice DNI → clienteId (portal) |
| `buro_crediticio` | Buró simulado por DNI |
| `listas_restriccion` | Solo caso 28 (lista negra) |
| `solicitudes_credito` | Solicitud con estado final |
| `cartera_diaria` | Gestión `NUEVA_SOLICITUD` + visita |
| `consultas_buro` | Consulta registrada por el asesor |
| `creditos` | 27 casos con desembolso (+ cronograma) |

## Resumen de decisiones (30 casos)

- **24 desembolsados** → `estado: desembolsado` + documento en `creditos`
- **3 condicionados** (25, 26, 27) → `estado: condicionado`, `montoAprobado` menor al solicitado
- **3 rechazados** (28, 29, 30) → `estado: rechazado`, sin `creditos`

## Cargar datos en Firestore

```powershell
cd "D:\APLICATIVOS MOVILES\CAJACUSCO-VENTAS\scripts"
npm install
$env:GOOGLE_APPLICATION_CREDENTIALS="ruta\serviceAccountKey.json"
$env:ASESOR_ID="<UID del asesor en Firebase Auth>"
node seed_casos_30.mjs
```

Con cuentas portal para practicar login (casos 1–5):

```powershell
node seed_casos_30.mjs --portal-auth
```

Clave portal demo: `Cliente123`

## Credenciales portal (casos 1–5, con `--portal-auth`)

| Caso | DNI | Contraseña | Cliente |
|------|-----|------------|---------|
| 1 | `40118120` | `Cliente123` | Anaximandro Quispe |
| 2 | `41223341` | `Cliente123` | Eulalia Mamani |
| 3 | `42330336` | `Cliente123` | Teófilo Huamán |
| 4 | `43440349` | `Cliente123` | Casandra Flores |
| 5 | `40556071` | `Cliente123` | Demóstenes Rojas |

## App Fuerza de Ventas

1. El `ASESOR_ID` del seed **debe ser el UID** del usuario logueado (no el código de empleado).
2. En **Cartera**, filtra por `fechaAsignacion` = fecha de desembolso del caso (campo en seed).
3. Buró: consultar por DNI del caso; caso 28 debe bloquearse por lista negra.

## App Portal Cliente

Tras vincular cuenta (registro o `--portal-auth`), el cliente ve:

- **Solicitudes** → estados `desembolsado`, `condicionado`, `rechazado`
- **Créditos** → desembolsos con cronograma (primeras 6 cuotas en detalle)

## Archivos

- Datos: `scripts/data/casos_30_credito.json`
- Seed: `scripts/seed_casos_30.mjs`
- IDs de documento: prefijo `cliente_caso_XX`, `solicitud_caso_XX`, `credito_caso_XX`
