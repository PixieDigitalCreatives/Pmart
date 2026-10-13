'use strict';

const path = require('path');
const { z } = require('zod');
const dotenv = require('dotenv');
const { logger } = require('../utils/logger');

// Always read backend/.env regardless of the working directory; real environment variables take precedence.
// PMART_SKIP_DOTENV=1 disables the file entirely (used by tests that validate missing variables).
if (process.env.PMART_SKIP_DOTENV !== '1') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
}

const WEAK_SECRETS = ['secret', 'test', 'fallback_secret', '123456', 'change_me'];

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().default('pmart'),
  JWT_SECRET: z.string().min(1).superRefine((val, ctx) => {
    if (process.env.NODE_ENV === 'production') {
      if (val.length < 32) {
        ctx.addIssue({ code: 'custom', message: 'JWT_SECRET must be at least 32 characters in production' });
      }
      if (WEAK_SECRETS.some((w) => val.toLowerCase().includes(w))) {
        ctx.addIssue({ code: 'custom', message: 'JWT_SECRET cannot contain a known weak value in production' });
      }
    }
  }),
  JWT_EXPIRES_IN: z.string().default('1h'),
  REFRESH_TOKEN_TTL_DAYS: z.string().default('7').transform(Number),
  OTP_LENGTH: z.string().default('4').transform(Number).refine((n) => n === 4 || n === 6, 'OTP_LENGTH must be 4 or 6'),
  OTP_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'Must be a 64 character hex string (32 bytes)'),
  ALLOWED_ORIGINS: z.string().optional(),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  MAPTILER_API_KEY: z.string().optional(),
  MARG_INTEGRATION_ENABLED: z.string().default('false').transform((v) => v === 'true'),
  OSRM_CACHE_TTL: z.string().default('3600').transform(Number)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(`Invalid environment variables: ${JSON.stringify(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))}`);
  process.exit(1);
}

const env = parsed.data;

env.allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

// localhost or any 127.x.x.x loopback address (separate loopback hosts give separate browser sessions in testing).
const LOCAL_DEV_ORIGIN = /^http:\/\/(localhost|127(\.\d{1,3}){3})(:\d+)?$/;

/**
 * Whether a browser Origin may call the API. Outside production any localhost port is accepted
 * so the Vite dev server and previews work without listing every port in ALLOWED_ORIGINS.
 */
env.isAllowedOrigin = (origin) =>
  env.allowedOrigins.includes(origin) || (env.NODE_ENV !== 'production' && LOCAL_DEV_ORIGIN.test(origin));

module.exports = { env };
