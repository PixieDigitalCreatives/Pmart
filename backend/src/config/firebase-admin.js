'use strict';

const { env } = require('./env');
const { logger } = require('../utils/logger');

let firebaseAuth = null;

/**
 * Returns the Firebase Admin Auth instance, or null when Google sign-in is not configured.
 * There is deliberately no mock fallback: without real credentials, Google sign-in is disabled.
 * firebase-admin is required lazily so it is only loaded when credentials are present.
 */
function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;

  let privateKey = env.FIREBASE_PRIVATE_KEY || '';
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
  if (!privateKey || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL) return null;

  try {
    const { getApps, initializeApp, cert } = require('firebase-admin/app');
    const { getAuth } = require('firebase-admin/auth');
    if (!getApps().length) {
      initializeApp({ credential: cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey }) });
      logger.info('Firebase Admin initialized');
    }
    firebaseAuth = getAuth();
    return firebaseAuth;
  } catch (error) {
    logger.error(`Failed to initialize Firebase Admin: ${error.message}`);
    return null;
  }
}

/** Whether the server has the credentials needed to verify Google sign-in tokens. */
const isGoogleSignInEnabled = () => Boolean(env.FIREBASE_PRIVATE_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL);

module.exports = { getFirebaseAuth, isGoogleSignInEnabled };
