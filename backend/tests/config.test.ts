import { z } from 'zod';

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
});

describe('Environment Configuration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should fail if MONGODB_URI is missing', () => {
    delete process.env.MONGODB_URI;
    process.env.JWT_SECRET = 'somesupersecretthatislongenoughtopass';
    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('MONGODB_URI'))).toBe(true);
    }
  });

  it('should fail if JWT_SECRET is missing', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    delete process.env.JWT_SECRET;
    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('JWT_SECRET'))).toBe(true);
    }
  });

  it('should fail if JWT_SECRET is weak in production', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secret_that_is_32_characters_long_but_has_secret_in_it';
    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('JWT_SECRET') && i.message.includes('weak'))).toBe(true);
    }
  });

  it('should fail if JWT_SECRET is short in production', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('JWT_SECRET') && i.message.includes('32 characters'))).toBe(true);
    }
  });

  it('should pass if JWT_SECRET is strong and valid in production', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a_very_strong_and_long_jwt_signature_key_that_is_secure';
    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(true);
  });
});
