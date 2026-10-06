import { z } from 'zod';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string(),
  JWT_SECRET: z.string().min(1).superRefine((val, ctx) => {
    if (process.env.NODE_ENV === 'production') {
      if (val.length < 32) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT_SECRET must be at least 32 characters in production' });
      }
      const weakSecrets = ['secret', 'test', 'fallback_secret', '123456', 'production_secret_key_change_me_in_real_prod'];
      if (weakSecrets.some(w => val.includes(w))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT_SECRET cannot be a known weak/fallback string in production' });
      }
    }
  }),
  JWT_EXPIRES_IN: z.string().default('1h'),
  OTP_LENGTH: z.string().default('4').transform(Number),
  OTP_ENCRYPTION_KEY: z.string().length(64, 'Must be a 64 character hex string (32 bytes)'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  PAYMENT_COD_ENABLED: z.string().default('true').transform(v => v === 'true'),
  PAYMENT_ONLINE_ENABLED: z.string().default('false').transform(v => v === 'true'),
  MARG_INTEGRATION_ENABLED: z.string().default('false').transform(v => v === 'true'),
  RIDER_PICKUP_DELAY_MS: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  RIDER_OUT_FOR_DELIVERY_DELAY_MS: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  OSRM_CACHE_TTL: z.string().default('3600').transform(Number),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  logger.error('Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
