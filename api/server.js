const express = require('express');
const cors = require('cors');
const { getAuth } = require('firebase-admin/auth');
const { initFirebase, PROJECT_ID } = require('./firebase');
const { evaluarProspecto, validatePreEvaluarBody } = require('./preEvaluar');

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(cors());
app.use(express.json());

initFirebase();

app.get('/', (_req, res) => {
  res.json({
    service: 'Caja Cusco Back Core API',
    project: PROJECT_ID,
    status: 'ok',
    docs: '/health',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    project: PROJECT_ID,
    uptimeSec: Math.floor(process.uptime()),
  });
});

app.get('/api/v1/resumen', async (_req, res) => {
  try {
    const db = initFirebase();
    const [clientes, solicitudes, creditos, cuentas] = await Promise.all([
      db.collection('clientes').count().get(),
      db.collection('solicitudes_credito').count().get(),
      db.collection('creditos').count().get(),
      db.collection('cuentas_clientes').count().get(),
    ]);

    res.json({
      project: PROJECT_ID,
      totales: {
        clientes: clientes.data().count,
        solicitudes: solicitudes.data().count,
        creditos: creditos.data().count,
        cuentasPortal: cuentas.data().count,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error leyendo Firestore' });
  }
});

app.post('/api/v1/pre-evaluar-prospecto', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Debe enviar Authorization: Bearer <Firebase ID token>' });
  }

  try {
    await getAuth().verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  const validation = validatePreEvaluarBody(req.body || {});
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const resultado = evaluarProspecto(validation.data);
  return res.json(resultado);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Back Core API listening on port ${port}`);
});
