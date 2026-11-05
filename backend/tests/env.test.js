'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const backendDir = path.resolve(__dirname, '..');

function loadEnv(vars) {
  // PMART_SKIP_DOTENV keeps the developer's backend/.env from leaking into the test.
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, PMART_SKIP_DOTENV: '1', ...vars };
  return spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(backendDir, 'src/config/env'))})`], { env, cwd: path.parse(backendDir).root, encoding: 'utf8' });
}

function originCheck(vars, origins) {
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, PMART_SKIP_DOTENV: '1', ...vars };
  const script = `const { env } = require(${JSON.stringify(path.join(backendDir, 'src/config/env'))}); process.stdout.write(JSON.stringify(${JSON.stringify(origins)}.map(env.isAllowedOrigin)));`;
  const res = spawnSync(process.execPath, ['-e', script], { env, encoding: 'utf8' });
  return JSON.parse(res.stdout);
}

describe('environment validation', () => {
  const base = { MONGODB_URI: 'mongodb://localhost/x', JWT_SECRET: 'dev-secret', OTP_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' };

  it('accepts a valid development configuration', () => {
    expect(loadEnv(base).status).toBe(0);
  });

  it.each([
    ['MONGODB_URI is missing', { MONGODB_URI: undefined }],
    ['JWT_SECRET is missing', { JWT_SECRET: undefined }],
    ['OTP_ENCRYPTION_KEY is not 64 hex chars', { OTP_ENCRYPTION_KEY: 'abc' }],
    ['OTP_LENGTH is unsupported', { OTP_LENGTH: '5' }],
    ['TRUST_PROXY is not a small whole number', { TRUST_PROXY: 'yes' }],
    ['COOKIE_SAME_SITE is unknown', { COOKIE_SAME_SITE: 'loose' }],
    ['COOKIE_SAME_SITE is invalid', { COOKIE_SAME_SITE: 'invalid' }],
    ['JWT_SECRET is short in production', { NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://shop.example.com', JWT_SECRET: 'x'.repeat(10) }],
    ['JWT_SECRET is weak in production', { NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://shop.example.com', JWT_SECRET: `secret${'x'.repeat(40)}` }],
    ['ALLOWED_ORIGINS is missing in production', { NODE_ENV: 'production', JWT_SECRET: 'Z'.repeat(48) }],
    ['ALLOWED_ORIGINS has a shared-host wildcard in production', { NODE_ENV: 'production', JWT_SECRET: 'Z'.repeat(48), ALLOWED_ORIGINS: 'https://pmart.example.com,https://*.vercel.app' }],
    ['ALLOWED_ORIGINS is * in production', { NODE_ENV: 'production', JWT_SECRET: 'Z'.repeat(48), ALLOWED_ORIGINS: '*' }],
    ['ALLOWED_ORIGINS has an http origin in production', { NODE_ENV: 'production', JWT_SECRET: 'Z'.repeat(48), ALLOWED_ORIGINS: 'http://pmart.example.com' }]
  ])('exits when %s', (_label, overrides) => {
    const vars = { ...base, ...overrides };
    Object.keys(vars).forEach((k) => vars[k] === undefined && delete vars[k]);
    expect(loadEnv(vars).status).toBe(1);
  });

  it('accepts a strong production secret with exact origins', () => {
    expect(loadEnv({ ...base, NODE_ENV: 'production', JWT_SECRET: 'Z'.repeat(48), ALLOWED_ORIGINS: 'https://pmart.example.com, https://www.pmart.example.com/' }).status).toBe(0);
  });

  it.each(['strict', 'lax', 'none'])('accepts valid COOKIE_SAME_SITE=%s', (sameSite) => {
    expect(loadEnv({ ...base, COOKIE_SAME_SITE: sameSite }).status).toBe(0);
  });

  it('allows any localhost port outside production but never look-alike hosts', () => {
    const origins = ['http://localhost:5180', 'http://127.0.0.1:4000', 'http://127.0.0.2:5180', 'http://localhost.evil.com', 'https://evil.com', 'http://127.0.0.1.evil.com'];
    expect(originCheck(base, origins)).toEqual([true, true, true, false, false, false]);
  });

  it('only allows the exact ALLOWED_ORIGINS in production (no shared-host previews)', () => {
    const prod = { ...base, NODE_ENV: 'production', JWT_SECRET: 'Z'.repeat(48), ALLOWED_ORIGINS: 'https://shop.example.com' };
    expect(originCheck(prod, ['https://shop.example.com', 'http://localhost:5173', 'https://evil.vercel.app', 'https://pmart-evil.netlify.app', 'https://shop.example.com.evil.com'])).toEqual([true, false, false, false, false]);
  });

  it('lets development use one-label wildcards from ALLOWED_ORIGINS', () => {
    const dev = { ...base, ALLOWED_ORIGINS: 'https://pmart-*.example.com' };
    expect(originCheck(dev, ['https://pmart-git-main.example.com', 'https://pmart-x.evil.example.com', 'https://evil.com'])).toEqual([true, false, false]);
  });
});
