/**
 * Sincroniza datos de ventas → portal clientes (BD separada).
 *
 * Uso:
 *   node sync_a_portal_clientes.js --clienteId DOC_ID_EN_VENTAS
 *
 * Variables de entorno:
 *   VENTAS_PROJECT_ID=caja-cusco-ventas (default)
 *   CLIENTES_PROJECT_ID=caja-cusco-clientes (default)
 *
 * Requiere credenciales con acceso a ambos proyectos (gcloud auth application-default login).
 */
const admin = require('firebase-admin');

const VENTAS_PROJECT = process.env.VENTAS_PROJECT_ID || 'caja-cusco-ventas';
const CLIENTES_PROJECT = process.env.CLIENTES_PROJECT_ID || 'caja-cusco-clientes';

const CLIENTE_FIELDS = [
  'numeroDocumento', 'tipoDocumento', 'nombres', 'apellidos',
  'telefono', 'email', 'direccion', 'tipoNegocio', 'nombreNegocio',
  'calificacionSbs', 'updatedAt',
];

const CREDITO_FIELDS = [
  'clienteId', 'producto', 'montoDesembolsado', 'plazoMeses', 'tea',
  'estado', 'fechaDesembolso', 'saldoActual', 'cuotasTotal',
  'cuotasPagadas', 'diasMora', 'updatedAt',
];

const SOLICITUD_FIELDS = [
  'clienteId', 'numeroExpediente', 'montoSolicitado', 'plazoMeses',
  'estado', 'montoAprobado', 'motivoRechazo', 'createdAt', 'updatedAt',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    result[args[i]?.replace(/^--/, '')] = args[i + 1];
  }
  return result;
}

function pickFields(data, fields) {
  const out = { syncedFromVentas: true, syncedAt: admin.firestore.FieldValue.serverTimestamp() };
  for (const key of fields) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

function getVentasDb() {
  const app = admin.apps.find((a) => a.name === 'ventas')
    || admin.initializeApp({ projectId: VENTAS_PROJECT }, 'ventas');
  return admin.firestore(app);
}

function getClientesDb() {
  const app = admin.apps.find((a) => a.name === 'clientes')
    || admin.initializeApp({ projectId: CLIENTES_PROJECT }, 'clientes');
  return admin.firestore(app);
}

async function syncCliente(clienteId) {
  const ventasDb = getVentasDb();
  const clientesDb = getClientesDb();

  const clienteDoc = await ventasDb.collection('clientes').doc(clienteId).get();
  if (!clienteDoc.exists) {
    throw new Error(`Cliente ${clienteId} no existe en ${VENTAS_PROJECT}`);
  }

  await clientesDb.collection('clientes').doc(clienteId).set(
    pickFields(clienteDoc.data(), CLIENTE_FIELDS),
    { merge: true },
  );

  const numeroDocumento =
    clienteDoc.data().numeroDocumento ||
    clienteDoc.data().documento ||
    '';
  if (numeroDocumento) {
    const dni = String(numeroDocumento).replace(/\D/g, '');
    await clientesDb.collection('clientes_por_dni').doc(dni).set({
      clienteId,
      numeroDocumento: dni,
      origen: 'sync_ventas',
    }, { merge: true });
  }

  const creditos = await ventasDb.collection('creditos')
    .where('clienteId', '==', clienteId).get();

  for (const doc of creditos.docs) {
    await clientesDb.collection('creditos').doc(doc.id).set(
      pickFields(doc.data(), CREDITO_FIELDS),
      { merge: true },
    );
  }

  const solicitudes = await ventasDb.collection('solicitudes_credito')
    .where('clienteId', '==', clienteId).get();

  for (const doc of solicitudes.docs) {
    await clientesDb.collection('solicitudes_credito').doc(doc.id).set(
      pickFields(doc.data(), SOLICITUD_FIELDS),
      { merge: true },
    );
  }

  return {
    clienteId,
    creditos: creditos.size,
    solicitudes: solicitudes.size,
  };
}

async function main() {
  const { clienteId } = parseArgs();
  if (!clienteId) {
    console.error('Uso: node sync_a_portal_clientes.js --clienteId DOC_ID');
    process.exit(1);
  }

  const result = await syncCliente(clienteId);
  console.log(`Sincronizado a ${CLIENTES_PROJECT}:`);
  console.log(`  Cliente:     ${result.clienteId}`);
  console.log(`  Créditos:    ${result.creditos}`);
  console.log(`  Solicitudes: ${result.solicitudes}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = { syncCliente, pickFields, CLIENTE_FIELDS, CREDITO_FIELDS, SOLICITUD_FIELDS };
