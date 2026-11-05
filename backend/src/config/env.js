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
  // Number of reverse proxies in front of the API (Render = 1; Vercel rewrite → Render = 2). Used for client IPs/rate limits.
  TRUST_PROXY: z.string().default('1').transform(Number).refine((n) => Number.isInteger(n) && n >= 0 && n <= 5, 'TRUST_PROXY must be 0-5'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  MAPTILER_API_KEY: z.string().optional(),
  MARG_INTEGRATION_ENABLED: z.string().default('false').transform((v) => v === 'true'),
  OSRM_CACHE_TTL: z.string().default('3600').transform(Number),
  // Barcode lookups in Open Food/Beauty/Products Facts for product details and candidate photos.
  PRODUCT_LOOKUP_ENABLED: z.string().default('true').transform((v) => v !== 'false'),
  // Those services ask for an identifying User-Agent with a contact address.
  PRODUCT_LOOKUP_USER_AGENT: z.string().default('PMart-Inventory/1.0 (store inventory; contact: admin@pmart.local)')
});

const parsed = envSchema.safeParse(process.env);

function exitWithIssues(issues) {
  logger.error(`Invalid environment variables: ${JSON.stringify(issues)}`);
  process.exit(1);
}

if (!parsed.success) {
  exitWithIssues(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
}

const env = parsed.data;

env.allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

// Production accepts only exact origins. The API answers credentialed CORS requests, so a wildcard such as
// https://*.vercel.app would let any site on that shared host read responses for a signed-in user.
if (env.NODE_ENV === 'production') {
  const issues = [];
  if (!env.ALLOWED_ORIGINS) issues.push('ALLOWED_ORIGINS: required in production (the web app origin, e.g. https://pmart.example.com)');
  env.allowedOrigins
    .filter((o) => o.includes('*'))
    .forEach((o) => issues.push(`ALLOWED_ORIGINS: wildcard "${o}" is not allowed in production; list each origin exactly`));
  env.allowedOrigins
    .filter((o) => !o.includes('*') && !/^https:\/\/[^/\s]+$/i.test(o))
    .forEach((o) => issues.push(`ALLOWED_ORIGINS: "${o}" must be an https origin without a path`));
  if (issues.length) exitWithIssues(issues);
}

// Default to a first-party cookie: the web app reaches the API through a same-site proxy (Vercel rewrite).
env.cookieSameSite = env.COOKIE_SAME_SITE || 'strict';
if (env.NODE_ENV === 'production' && env.cookieSameSite === 'none') {
  logger.warn('COOKIE_SAME_SITE=none: the refresh cookie is sent on cross-site requests. Use strict with a same-site proxy unless the web app must call the API on another site.');
}

// localhost or any 127.x.x.x loopback address (separate loopback hosts give separate browser sessions in testing).
const LOCAL_DEV_ORIGIN = /^http:\/\/(localhost|127(\.\d{1,3}){3})(:\d+)?$/;

/**
 * Whether a browser Origin may call the API. Production: exact ALLOWED_ORIGINS only.
 * Outside production any localhost port is accepted, and ALLOWED_ORIGINS may use `*` patterns.
 */
env.isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (env.allowedOrigins.includes(origin)) return true;
  if (env.NODE_ENV === 'production') return false;
  if (env.allowedOrigins.includes('*') || LOCAL_DEV_ORIGIN.test(origin)) return true;

  for (const pattern of env.allowedOrigins) {
    if (pattern.includes('*')) {
      const escaped = pattern.replace(/[.+?^()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]*');
      if (new RegExp(`^${escaped}$`, 'i').test(origin)) return true;
    }
  }
  return false;
};

module.exports = { env };
