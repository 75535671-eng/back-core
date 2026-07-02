const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'caja-cusco-ventas';

function initFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const serviceAccount = JSON.parse(raw);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || PROJECT_ID,
    });
    return getFirestore();
  }

  initializeApp({ projectId: PROJECT_ID });
  return getFirestore();
}

module.exports = { initFirebase, PROJECT_ID };
