/**
 * Seed M7 — usa firebase-admin de functions/node_modules
 * Ejecutar desde la raíz del proyecto:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="scripts\.secrets\serviceAccountKey.json"
 *   node functions/seed_m7.js
 */

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const admin = require('firebase-admin');

const PROJECT_ID = 'caja-cusco-ventas';
const root = join(__dirname, '..');
const seed = JSON.parse(
  readFileSync(join(root, 'scripts', 'data', 'm7_seed.json'), 'utf8'),
);

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Define GOOGLE_APPLICATION_CREDENTIALS');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

async function upsertCollection(collection, items) {
  const batch = db.batch();
  for (const item of items) {
    const { id, nota, ...fields } = item;
    batch.set(
      db.collection(collection).doc(id),
      {
        ...fields,
        ...(collection === 'listas_restriccion'
          ? { fechaRegistro: now, fechaActualizacion: now }
          : {}),
      },
      { merge: true },
    );
    console.log(`  + ${collection}/${id}${nota ? ` (${nota})` : ''}`);
  }
  await batch.commit();
}

async function main() {
  console.log(`\nSembrando Firestore — ${PROJECT_ID}\n`);
  console.log('buro_crediticio:');
  await upsertCollection('buro_crediticio', seed.buro_crediticio);
  console.log('\nlistas_restriccion:');
  await upsertCollection('listas_restriccion', seed.listas_restriccion);
  console.log('\nListo.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
