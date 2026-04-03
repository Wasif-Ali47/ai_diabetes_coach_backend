import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let initialized = false;

/**
 * Single Firebase Admin init for FCM (broadcast, reminder pushes, etc.)
 */
export function ensureFirebaseAdmin() {
  if (initialized && admin.apps?.length) {
    return admin;
  }

  let serviceAccount = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn('[firebaseAdminInit] Invalid FIREBASE_SERVICE_ACCOUNT JSON');
    }
  }

  if (!serviceAccount) {
    try {
      const p = path.join(__dirname, '..', 'firebase-service-account.json');
      if (fs.existsSync(p)) {
        serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch (e) {
      console.warn('[firebaseAdminInit] Could not read firebase-service-account.json:', e.message);
    }
  }

  if (!serviceAccount) {
    return null;
  }

  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  initialized = true;
  return admin;
}

export function getMessaging() {
  const a = ensureFirebaseAdmin();
  return a ? a.messaging() : null;
}
