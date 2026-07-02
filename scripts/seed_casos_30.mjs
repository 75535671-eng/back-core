/**
 * Carga los 30 casos académicos de crédito empresarial en Firestore (caja-cusco-ventas).
 *
 * Adaptación: el documento original usa PostgreSQL + API REST; aquí todo va a Firestore.
 *
 * Uso:
 *   cd scripts
 *   npm install
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="ruta\serviceAccountKey.json"
 *   $env:ASESOR_ID="<UID Firebase Auth del asesor operador>"
 *   node seed_casos_30.mjs
 *
 * Opcional portal (crea Auth + cuentas_clientes para casos 1-5):
 *   node seed_casos_30.mjs --portal-auth
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'caja-cusco-ventas';
const PORTAL_PASSWORD = process.env.PORTAL_DEMO_PASSWORD || 'Cliente123';
const withPortalAuth = process.argv.includes('--portal-auth');

const seed = JSON.parse(
  readFileSync(join(__dirname, 'data', 'casos_30_credito.json'), 'utf8'),
);

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('ERROR: Define GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();
const now = admin.firestore.FieldValue.serverTimestamp();
const asesorId = process.env.ASESOR_ID || 'demo-casos-asesor';
const agenciaId = seed.meta.agenciaId || 'AG001';
const producto = seed.meta.producto;

function temFromTea(teaPct) {
  const tea = teaPct / 100;
  return (1 + tea) ** (1 / 12) - 1;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatIso(date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function setDayOfMonth(date, day) {
  const d = new Date(date);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

/** Cronograma francés (cuotas fijas). */
function generarCronograma(monto, plazo, teaPct, diaPago, fechaDesembolsoIso) {
  const r = temFromTea(teaPct);
  const cuota =
    r === 0
      ? monto / plazo
      : (monto * r * (1 + r) ** plazo) / ((1 + r) ** plazo - 1);
  const cuotaRedondeada = round2(cuota);
  let saldo = monto;
  const inicio = parseDate(fechaDesembolsoIso);
  const filas = [];

  for (let i = 1; i <= plazo; i += 1) {
    const interes = round2(saldo * r);
    let capital = round2(cuotaRedondeada - interes);
    if (i === plazo) {
      capital = round2(saldo);
    }
    saldo = round2(saldo - capital);
    if (saldo < 0) saldo = 0;

    const fecha = setDayOfMonth(addMonths(inicio, i), diaPago);
    filas.push({
      numero: i,
      fechaPago: formatIso(fecha),
      cuota: i === plazo ? round2(capital + interes) : cuotaRedondeada,
      capital,
      interes,
      saldo,
    });
  }
  return filas;
}

function expediente(n, dni) {
  return `EXP-CASO-${String(n).padStart(2, '0')}-${dni}`;
}

function mapEstadoSolicitud(caso) {
  if (caso.decision === 'rechazado') return 'rechazado';
  if (caso.decision === 'condicionado') return 'condicionado';
  return 'desembolsado';
}

function semaforoFromCal(cal) {
  const map = {
    NORMAL: 'VERDE',
    CPP: 'AMARILLO',
    DEFICIENTE: 'ROJO',
    DUDOSO: 'ROJO',
    PERDIDA: 'ROJO',
  };
  return map[cal] || 'AMARILLO';
}

async function upsertPortalAuth(caso, clienteId) {
  const email = `${caso.dni}@cliente.cajacusco.pe`;
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password: PORTAL_PASSWORD });
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      user = await auth.createUser({
        email,
        password: PORTAL_PASSWORD,
        emailVerified: true,
        displayName: `${caso.nombre} ${caso.apellidos}`,
      });
    } else {
      throw e;
    }
  }

  await db.collection('cuentas_clientes').doc(user.uid).set(
    {
      authUid: user.uid,
      clienteId,
      numeroDocumento: caso.dni,
      activo: true,
      createdAt: now,
    },
    { merge: true },
  );
}

async function seedCaso(caso) {
  const clienteId = `cliente_caso_${String(caso.n).padStart(2, '0')}_${caso.dni}`;
  const solicitudId = `solicitud_caso_${String(caso.n).padStart(2, '0')}`;
  const creditoId = `credito_caso_${String(caso.n).padStart(2, '0')}`;
  const carteraId = `cartera_caso_${String(caso.n).padStart(2, '0')}`;
  const buroId = `buro_${caso.dni}`;
  const fechaAsignacion = caso.desembolso || '2026-06-01';

  const cliente = {
    numeroDocumento: caso.dni,
    documento: caso.dni,
    tipoDocumento: 'DNI',
    nombres: caso.nombre,
    apellidos: caso.apellidos,
    telefono: caso.tel,
    direccion: caso.distrito,
    tipoNegocio: 'Microempresa',
    nombreNegocio: caso.negocio,
    antiguedadNegocioMeses: caso.antMeses,
    ingresosEstimados: caso.ingreso,
    gastosMensuales: caso.gasto,
    lat: caso.lat,
    lng: caso.lng,
    latitud: caso.lat,
    longitud: caso.lng,
    calificacionSbs: caso.buro.cal,
    asesorId,
    agenciaId,
    origen: 'seed_casos_30',
    casoAcademico: caso.n,
    createdAt: now,
    updatedAt: now,
  };

  const estadoSol = mapEstadoSolicitud(caso);
  const montoAprobado =
    caso.decision === 'rechazado'
      ? null
      : caso.montoApr ?? caso.monto;

  const solicitud = {
    numeroExpediente: expediente(caso.n, caso.dni),
    expediente: expediente(caso.n, caso.dni),
    clienteId,
    asesorId,
    agenciaId,
    canalOrigen: 'cliente',
    producto,
    montoSolicitado: caso.monto,
    plazoMeses: caso.plazo,
    moneda: 'PEN',
    tipoCuota: 'fija',
    teaReferencial: caso.tea,
    conSeguroDesgravamen: caso.seguro,
    garantia: caso.garantia,
    destinoCredito: caso.destino,
    cuotaEstimada: caso.cuota,
    ingresosEstimados: caso.ingreso,
    gastosMensuales: caso.gasto,
    antiguedadNegocioMeses: caso.antMeses,
    nombreNegocio: caso.negocio,
    documento: caso.dni,
    nombres: caso.nombre,
    apellidos: caso.apellidos,
    estado: estadoSol,
    montoAprobado,
    motivoRechazo: caso.motivoRechazo || null,
    condicionAdicional: caso.condicion || null,
    preEvaluacion: caso.preEval || 'APTO',
    scorePreEvaluacion: caso.scorePre || 85,
    casoAcademico: caso.n,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();

  batch.set(db.collection('clientes').doc(clienteId), cliente, { merge: true });
  batch.set(
    db.collection('clientes_por_dni').doc(caso.dni),
    {
      clienteId,
      numeroDocumento: caso.dni,
      origen: 'seed_casos_30',
    },
    { merge: true },
  );

  batch.set(db.collection('buro_crediticio').doc(buroId), {
    documento: caso.dni,
    calificacionSbs: caso.buro.cal,
    entidadesConDeuda: caso.buro.ent,
    deudaTotal: caso.buro.deuda,
    deudaTotalPen: caso.buro.deuda,
    mayorDeudaIndividual: caso.buro.deuda > 0 ? round2(caso.buro.deuda / Math.max(caso.buro.ent, 1)) : 0,
    diasMayorMora: caso.buro.mora,
    origen: 'seed_casos_30',
    casoAcademico: caso.n,
  }, { merge: true });

  if (caso.listaNegra) {
    batch.set(db.collection('listas_restriccion').doc(`restriccion_${caso.dni}`), {
      documento: caso.dni,
      tipoRestriccion: 'LISTA_NEGRA_INTERNA',
      motivo: caso.motivoRechazo,
      activa: true,
      origen: 'seed_casos_30',
      fechaRegistro: now,
    }, { merge: true });
  }

  batch.set(db.collection('solicitudes_credito').doc(solicitudId), solicitud, { merge: true });

  batch.set(db.collection('cartera_diaria').doc(carteraId), {
    asesorId,
    agenciaId,
    clienteId,
    fechaAsignacion,
    tipoGestion: 'NUEVA_SOLICITUD',
    prioridad: caso.prioridad,
    nombreCliente: `${caso.nombre} ${caso.apellidos}`,
    documento: caso.dni,
    montoCredito: caso.monto,
    visitado: true,
    estadoVisita: 'completada',
    resultadoVisita: 'visitado',
    lat: caso.lat,
    lng: caso.lng,
    latitud: caso.lat,
    longitud: caso.lng,
    solicitudId,
    origen: 'seed_casos_30',
    casoAcademico: caso.n,
  }, { merge: true });

  batch.set(db.collection('consultas_buro').doc(`consulta_caso_${caso.n}`), {
    asesorId,
    clienteId,
    dniConsultado: caso.dni,
    documento: caso.dni,
    calificacionSbs: caso.buro.cal,
    entidadesConDeuda: caso.buro.ent,
    deudaTotalPen: caso.buro.deuda,
    diasMayorMora: caso.buro.mora,
    semaforoResultado: semaforoFromCal(caso.buro.cal),
    solicitudId,
    consentimientoAceptado: true,
    reutilizada: false,
    createdAt: now,
    fechaConsulta: now,
  }, { merge: true });

  if (caso.decision !== 'rechazado' && montoAprobado) {
    const tea = caso.tea;
    const cuotaMensual = caso.cuotaApr ?? caso.cuota;
    const cronograma = generarCronograma(
      montoAprobado,
      caso.plazo,
      tea,
      caso.diaPago,
      caso.desembolso,
    );

    batch.set(db.collection('creditos').doc(creditoId), {
      clienteId,
      solicitudId,
      asesorId,
      agenciaId,
      producto,
      montoDesembolsado: montoAprobado,
      plazoMeses: caso.plazo,
      tea,
      estado: 'vigente',
      fechaDesembolso: caso.desembolso,
      saldoActual: cronograma[cronograma.length - 1]?.saldo ?? 0,
      cuotasTotal: caso.plazo,
      cuotasPagadas: 0,
      diasMora: 0,
      cuotaMensual: round2(cuotaMensual),
      diaPago: caso.diaPago,
      cronogramaCuotas: cronograma,
      origen: 'seed_casos_30',
      casoAcademico: caso.n,
      createdAt: now,
    }, { merge: true });
  }

  await batch.commit();

  if (withPortalAuth && caso.n <= 5) {
    await upsertPortalAuth(caso, clienteId);
  }

  console.log(
    `  ✓ Caso ${String(caso.n).padStart(2, '0')} — ${caso.nombre} ${caso.apellidos} (${caso.dni}) → ${estadoSol}`,
  );
}

async function main() {
  console.log(`\nSembrando ${seed.casos.length} casos — ${PROJECT_ID}`);
  console.log(`Asesor ID: ${asesorId}`);
  if (withPortalAuth) {
    console.log(`Portal auth: casos 1-5, clave ${PORTAL_PASSWORD}`);
  }
  console.log('');

  for (const caso of seed.casos) {
    await seedCaso(caso);
  }

  console.log('\nListo. Colecciones pobladas:');
  console.log('  clientes, clientes_por_dni, buro_crediticio, solicitudes_credito,');
  console.log('  cartera_diaria, consultas_buro, creditos (+ cronogramaCuotas)');
  if (withPortalAuth) {
    console.log('  cuentas_clientes + Firebase Auth (casos 1-5)');
  }
  console.log('\nIMPORTANTE: ASESOR_ID debe coincidir con el UID del asesor logueado en Ventas.');
  console.log('Portal demo: DNI del caso + clave Cliente123 (solo casos 1-5 si usó --portal-auth)\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
