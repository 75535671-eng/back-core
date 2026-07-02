/**
 * Seed M11 — Supervisión (ubicaciones, productividad, cobertura cartera)
 * Ejecutar desde la raíz del proyecto:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="scripts\.secrets\serviceAccountKey.json"
 *   node functions/seed_m11.js
 */

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const admin = require('firebase-admin');

const PROJECT_ID = 'caja-cusco-ventas';
const root = join(__dirname, '..');
const seed = JSON.parse(
  readFileSync(join(root, 'scripts', 'data', 'm11_seed.json'), 'utf8'),
);

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Define GOOGLE_APPLICATION_CREDENTIALS');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

function hoyIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function upsertCollection(collection, items, transform) {
  const batch = db.batch();
  for (const item of items) {
    const { id, nota, ...fields } = item;
    const payload = transform ? transform(fields) : fields;
    batch.set(db.collection(collection).doc(id), payload, { merge: true });
    console.log(`  + ${collection}/${id}${nota ? ` (${nota})` : ''}`);
  }
  await batch.commit();
}

async function main() {
  const fechaHoy = hoyIso();
  console.log(`\nSembrando Firestore M11 — ${PROJECT_ID}`);
  console.log(`fechaAsignacion cartera_diaria: ${fechaHoy}\n`);

  console.log('ubicaciones_asesores:');
  await upsertCollection('ubicaciones_asesores', seed.ubicaciones_asesores, (fields) => ({
    ...fields,
    ultimaActualizacion: now,
  }));

  console.log('\nproductividad_mensual:');
  await upsertCollection('productividad_mensual', seed.productividad_mensual);

  console.log('\ncartera_diaria (resumen cobertura):');
  await upsertCollection(
    'cartera_diaria',
    seed.cartera_diaria_resumen,
    (fields) => ({
      ...fields,
      fechaAsignacion: fechaHoy,
      origen: 'seed_m11',
    }),
  );

  console.log('\nListo.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
