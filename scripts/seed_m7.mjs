/**
 * Carga datos de prueba M7 (buro_crediticio + listas_restriccion) en Firestore.
 *
 * Requisitos:
 *   1. Node.js 18+
 *   2. Variable GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de cuenta de servicio
 *      (Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar clave)
 *
 * Uso:
 *   cd scripts
 *   npm install
 *   set GOOGLE_APPLICATION_CREDENTIALS=ruta\a\serviceAccountKey.json   (Windows CMD)
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="ruta\serviceAccountKey.json"  (PowerShell)
 *   node seed_m7.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'caja-cusco-ventas';

const seed = JSON.parse(
  readFileSync(join(__dirname, 'data', 'm7_seed.json'), 'utf8'),
);

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'ERROR: Define GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de cuenta de servicio.',
  );
  console.error('Alternativa: carga los datos manualmente con docs/DATOS_PRUEBA_M7.md');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

async function upsertCollection(collection, items) {
  const batch = db.batch();
  for (const item of items) {
    const { id, nota, ...fields } = item;
    const ref = db.collection(collection).doc(id);
    batch.set(ref, {
      ...fields,
      ...(collection === 'listas_restriccion'
          ? { fechaRegistro: now, fechaActualizacion: now }
          : {}),
    }, { merge: true });
    console.log(`  + ${collection}/${id}${nota ? ` (${nota})` : ''}`);
  }
  await batch.commit();
}

async function main() {
  console.log(`\nSembrando Firestore — proyecto: ${PROJECT_ID}\n`);

  console.log('Colección buro_crediticio:');
  await upsertCollection('buro_crediticio', seed.buro_crediticio);

  console.log('\nColección listas_restriccion:');
  await upsertCollection('listas_restriccion', seed.listas_restriccion);

  console.log('\nListo. Verifica en Firebase Console → Firestore.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
