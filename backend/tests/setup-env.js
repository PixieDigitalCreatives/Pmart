// Runs before every test file (before any app module is required).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'jest-only-secret-not-used-anywhere-else';
process.env.OTP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:1/placeholder';
process.env.LOG_LEVEL = 'error';
delete process.env.FIREBASE_PRIVATE_KEY;
delete process.env.FIREBASE_PROJECT_ID;
delete process.env.FIREBASE_CLIENT_EMAIL;
delete process.env.MAPTILER_API_KEY;
