/**
 * Cloud Functions — Caja Cusco Fuerza de Ventas
 *
 * preEvaluarProspecto (RF-38) — Callable desde la app Flutter
 * desactivarCampanasVencidas (RF-42 opcional) — Cron diario
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

initializeApp();
const db = getFirestore();

// Sincronización ventas → BD portal clientes (proyecto separado)
Object.assign(exports, require("./sync_clientes_portal"));

const REGION = "us-central1";

/**
 * RF-38 — Pre-evaluación crediticia de prospecto.
 *
 * Entrada (request.data):
 *   - documento: string (8 dígitos)
 *   - ingresosMensuales: number
 *   - montoSolicitado: number
 *   - tipoNegocio: string
 *
 * Respuesta:
 *   - calificacion: "APTO" | "REVISAR" | "NO PROCEDE"
 *   - motivo: string
 *   - puntajeInterno: number
 */
exports.preEvaluarProspecto = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debe iniciar sesión para pre-evaluar.",
    );
  }

  const data = request.data || {};
  const documento = String(data.documento || "").trim();
  const ingresosMensuales = Number(data.ingresosMensuales);
  const montoSolicitado = Number(data.montoSolicitado);
  const tipoNegocio = String(data.tipoNegocio || "");

  if (!/^\d{8}$/.test(documento)) {
    throw new HttpsError(
      "invalid-argument",
      "El documento debe tener 8 dígitos.",
    );
  }

  if (!Number.isFinite(ingresosMensuales) || ingresosMensuales <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "Ingresos mensuales inválidos.",
    );
  }

  if (!Number.isFinite(montoSolicitado) || montoSolicitado < 500 || montoSolicitado > 50000) {
    throw new HttpsError(
      "invalid-argument",
      "Monto solicitado fuera de rango (S/500 - S/50,000).",
    );
  }

  const resultado = evaluarProspecto({
    ingresosMensuales,
    montoSolicitado,
    tipoNegocio,
  });

  logger.info("preEvaluarProspecto", {
    uid: request.auth.uid,
    documento,
    calificacion: resultado.calificacion,
    puntajeInterno: resultado.puntajeInterno,
  });

  return resultado;
});

/**
 * RF-42 (opcional) — Marca campañas vencidas como inactivas.
 * Se ejecuta todos los días a la 1:00 AM (hora Perú ≈ UTC-5, ajustar si necesitas).
 */
exports.desactivarCampanasVencidas = onSchedule(
  {
    region: REGION,
    schedule: "0 6 * * *",
    timeZone: "America/Lima",
  },
  async () => {
    const hoy = new Date().toISOString().slice(0, 10);

    const snap = await db
      .collection("campanas_activas")
      .where("activa", "==", true)
      .where("fechaVencimiento", "<", hoy)
      .get();

    if (snap.empty) {
      logger.info("desactivarCampanasVencidas: sin campañas vencidas");
      return;
    }

    const batch = db.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        activa: false,
        desactivadaEn: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    logger.info(`desactivarCampanasVencidas: ${snap.size} campaña(s) desactivada(s)`);
  },
);

/**
 * Lógica de scoring (alineada con fallback local de la app Flutter).
 */
function evaluarProspecto({ ingresosMensuales, montoSolicitado, tipoNegocio }) {
  const ratio = montoSolicitado / Math.max(ingresosMensuales, 1);
  let puntaje = 100;

  if (ratio > 8) {
    puntaje -= 50;
  } else if (ratio > 5) {
    puntaje -= 30;
  } else if (ratio > 3) {
    puntaje -= 15;
  }

  if (tipoNegocio.toLowerCase().includes("otro")) {
    puntaje -= 10;
  }

  let calificacion;
  let motivo;

  if (puntaje >= 70) {
    calificacion = "APTO";
    motivo = "Perfil compatible con productos vigentes";
  } else if (puntaje >= 45) {
    calificacion = "REVISAR";
    motivo = "Relación monto/ingreso requiere análisis adicional";
  } else {
    calificacion = "NO PROCEDE";
    motivo = "Monto solicitado supera capacidad estimada";
  }

  return {
    calificacion,
    motivo,
    puntajeInterno: puntaje,
  };
}
