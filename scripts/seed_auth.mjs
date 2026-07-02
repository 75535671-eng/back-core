/**
 * Sincroniza perfiles en la colección `usuarios` (vinculada a Authentication por UID).
 * NO modifica Firebase Authentication ni contraseñas.
 *
 * Uso:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="scripts\.secrets\serviceAccountKey.json"
 *   node scripts/seed_auth.mjs
 */
import admin from 'firebase-admin';

const USERS = [
  { codigo: '0101-1', email: '0101-1@cajacusco.com', rol: 'operador', nombre: 'Juan Operador Demo' },
  { codigo: '0202-2', email: '0202-2@cajacusco.com', rol: 'superOperador', nombre: 'Rosa Super Operador Demo' },
  { codigo: '0303-3', email: '0303-3@cajacusco.com', rol: 'supervisor', nombre: 'Carlos Supervisor Demo' },
  { codigo: '0404-4', email: '0404-4@cajacusco.com', rol: 'administrador', nombre: 'Ana Administrador Demo' },
];

admin.initializeApp({ credential: admin.credential.applicationDefault() });

const auth = admin.auth();
const db = admin.firestore();

console.log('Sincronizando colección usuarios — caja-cusco-ventas');
console.log('(Authentication no se modifica)\n');

for (const user of USERS) {
  let authUser;
  try {
    authUser = await auth.getUserByEmail(user.email);
    console.log(`  ✓ Auth ${user.codigo} — existe`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log(`  ⚠ Auth ${user.codigo} — NO existe. Créelo en Authentication.`);
      continue;
    }
    throw e;
  }

  const uid = authUser.uid;
  await db.collection('usuarios').doc(uid).set(
    {
      codigo: user.codigo,
      codigoEmpleado: user.codigo,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      estado: 'activo',
    },
    { merge: true },
  );
  console.log(`  ✓ usuarios/${user.codigo} (uid …${uid.slice(-6)})`);
}

console.log('\nListo. Perfil en `usuarios` con ID = UID de Authentication.\n');
