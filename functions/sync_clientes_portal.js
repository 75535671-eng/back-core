/**
 * Sincronización automática ventas → portal clientes (BD separada).
 * Requiere variable de entorno CLIENTES_PROJECT_ID=caja-cusco-clientes
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

const CLIENTES_PROJECT = process.env.CLIENTES_PROJECT_ID || "caja-cusco-clientes";

const CLIENTE_FIELDS = [
  "numeroDocumento", "tipoDocumento", "nombres", "apellidos",
  "telefono", "email", "direccion", "tipoNegocio", "nombreNegocio",
  "calificacionSbs", "updatedAt",
];

const CREDITO_FIELDS = [
  "clienteId", "producto", "montoDesembolsado", "plazoMeses", "tea",
  "estado", "fechaDesembolso", "saldoActual", "cuotasTotal",
  "cuotasPagadas", "diasMora", "updatedAt",
];

const SOLICITUD_FIELDS = [
  "clienteId", "numeroExpediente", "montoSolicitado", "plazoMeses",
  "estado", "montoAprobado", "motivoRechazo", "createdAt", "updatedAt",
];

function getClientesDb() {
  const existing = getApps().find((a) => a.name === "clientes-portal");
  const app = existing || initializeApp({ projectId: CLIENTES_PROJECT }, "clientes-portal");
  return getFirestore(app);
}

function pickFields(data, fields) {
  const out = {
    syncedFromVentas: true,
    syncedAt: FieldValue.serverTimestamp(),
  };
  for (const key of fields) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

async function syncToPortal(collection, docId, data, fields) {
  if (!data) {
    await getClientesDb().collection(collection).doc(docId).delete();
    return;
  }
  await getClientesDb().collection(collection).doc(docId).set(
    pickFields(data, fields),
    { merge: true },
  );
}

exports.syncClientePortal = onDocumentWritten("clientes/{clienteId}", async (event) => {
  const after = event.data?.after?.data();
  await syncToPortal("clientes", event.params.clienteId, after, CLIENTE_FIELDS);
  logger.info("syncClientePortal", { clienteId: event.params.clienteId });
});

exports.syncCreditoPortal = onDocumentWritten("creditos/{creditoId}", async (event) => {
  const after = event.data?.after?.data();
  await syncToPortal("creditos", event.params.creditoId, after, CREDITO_FIELDS);
  logger.info("syncCreditoPortal", { creditoId: event.params.creditoId });
});

exports.syncSolicitudPortal = onDocumentWritten(
  "solicitudes_credito/{solicitudId}",
  async (event) => {
    const after = event.data?.after?.data();
    await syncToPortal(
      "solicitudes_credito",
      event.params.solicitudId,
      after,
      SOLICITUD_FIELDS,
    );
    logger.info("syncSolicitudPortal", { solicitudId: event.params.solicitudId });
  },
);
