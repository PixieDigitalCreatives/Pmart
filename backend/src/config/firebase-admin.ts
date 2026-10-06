import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './env';
import { logger } from '../utils/logger';

let auth;
if (!getApps().length) {
  let privateKey = env.FIREBASE_PRIVATE_KEY || '';
  if (privateKey && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!privateKey || privateKey === 'mockkey' || privateKey.includes('mockkey')) {
    logger.error('CRITICAL: Missing or invalid FIREBASE_PRIVATE_KEY in backend environment.');
    if (env.NODE_ENV !== 'test') {
      throw new Error('Firebase Admin initialization failed: A valid FIREBASE_PRIVATE_KEY is required in production.');
    } else {
      logger.warn('Test environment detected. Mocking Firebase Auth.');
      auth = {
        verifyIdToken: async () => ({ uid: 'test-user-id', email: 'test@example.com', name: 'Test User', email_verified: true }) as any,
        getUser: async () => ({ uid: 'test-user-id', email: 'test@example.com', displayName: 'Test User', emailVerified: true }) as any,
        deleteUser: async () => {}
      };
    }
  } else {
    try {
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      logger.info('Firebase Admin initialized successfully with credentials');
      auth = getAuth();
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin with credentials:', (error as Error).message);
      throw error;
    }
  }
} else {
  auth = getAuth();
}

export const firebaseAuth = auth;
