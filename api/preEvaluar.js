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

  if (String(tipoNegocio).toLowerCase().includes('otro')) {
    puntaje -= 10;
  }

  let calificacion;
  let motivo;

  if (puntaje >= 70) {
    calificacion = 'APTO';
    motivo = 'Perfil compatible con productos vigentes';
  } else if (puntaje >= 45) {
    calificacion = 'REVISAR';
    motivo = 'Relación monto/ingreso requiere análisis adicional';
  } else {
    calificacion = 'NO PROCEDE';
    motivo = 'Monto solicitado supera capacidad estimada';
  }

  return { calificacion, motivo, puntajeInterno: puntaje };
}

function validatePreEvaluarBody(body) {
  const documento = String(body.documento || '').trim();
  const ingresosMensuales = Number(body.ingresosMensuales);
  const montoSolicitado = Number(body.montoSolicitado);
  const tipoNegocio = String(body.tipoNegocio || '');

  if (!/^\d{8}$/.test(documento)) {
    return { error: 'El documento debe tener 8 dígitos.' };
  }
  if (!Number.isFinite(ingresosMensuales) || ingresosMensuales <= 0) {
    return { error: 'Ingresos mensuales inválidos.' };
  }
  if (!Number.isFinite(montoSolicitado) || montoSolicitado < 500 || montoSolicitado > 50000) {
    return { error: 'Monto solicitado fuera de rango (S/500 - S/50,000).' };
  }

  return {
    data: { documento, ingresosMensuales, montoSolicitado, tipoNegocio },
  };
}

module.exports = { evaluarProspecto, validatePreEvaluarBody };
