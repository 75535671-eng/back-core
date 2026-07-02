# Conexión Firestore — CAJACUSCO-VENTAS

La app ya está vinculada al proyecto **`caja-cusco-ventas`** (el de tu captura de Firebase Console).

## Configuración actual

| Parámetro | Valor |
|-----------|-------|
| Proyecto Firebase | `caja-cusco-ventas` |
| App Android | `com.cajacusco.portalcredito` |
| App ID | `1:596443042434:android:f2024145921601905f9a9b` |
| Archivo Android | `android/app/google-services.json` |
| Opciones Flutter | `lib/firebase_options.dart` |
| Reglas Firestore | `firestore.rules` (desplegadas) |

## Colecciones que usa la app

Las que ya tienes en Firestore:

- `buro_crediticio` ✓
- `cartera_diaria` ✓
- `listas_restriccion` ✓
- `productividad_mensual` ✓
- `ubicaciones_asesores` ✓
- `usuarios` ✓

Otras que la app puede usar según el módulo:

- `clientes`, `creditos`, `solicitudes_credito`, `consultas_buro`, `prospectos`, etc.

## Modo producción (sin datos demo)

En `lib/core/constants/app_constants.dart`:

```dart
static const bool useDemoFallback = false;
```

Con esto la app **solo muestra datos reales** de Firestore. Si una colección está vacía, verás pantallas vacías (no datos ficticios).

## Para que el login funcione

1. **Firebase Authentication** → crear usuario con email institucional:
   - Ejemplo: `0101-1@cajacusco.com` (código + `@cajacusco.com`)

2. **Firestore** → colección `usuarios`, documento con ID = **UID de Auth**:

```json
{
  "codigoEmpleado": "0101-1",
  "nombre": "Nombre Asesor",
  "email": "0101-1@cajacusco.com",
  "rol": "operador",
  "estado": "activo",
  "agenciaId": "AG001"
}
```

3. El `asesorId` en `cartera_diaria` debe coincidir con el **UID** del usuario autenticado.

## Cartera del día

La app consulta:

```
cartera_diaria
  .where('asesorId', ==, UID_DEL_ASESOR)
  .where('fechaAsignacion', ==, '2026-06-19')  // fecha de hoy yyyy-MM-dd
```

Si no hay documentos para hoy, la cartera aparecerá vacía (comportamiento correcto en producción).

## Publicar reglas Firestore

```powershell
cd "d:\APLICATIVOS MOVILES\CAJACUSCO-VENTAS"
firebase deploy --only firestore:rules --project caja-cusco-ventas
```

## Ejecutar la app

```powershell
cd "d:\APLICATIVOS MOVILES\CAJACUSCO-VENTAS"
flutter run
```

## Verificar conexión

1. Inicia sesión con un usuario creado en Auth + `usuarios`.
2. Abre **Cartera** — debe cargar desde `cartera_diaria`.
3. Consulta **Buró** con DNI `12345678` — debe leer de `buro_crediticio` (documento `buro_12345678`).
