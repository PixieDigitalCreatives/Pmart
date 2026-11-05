'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser } = require('./helpers');
const { User } = require('../src/modules/auth/auth.model');
const { AuthService } = require('../src/modules/auth/auth.service');
const jwt = require('jsonwebtoken');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const refreshCookie = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken='));

describe('cross-origin requests', () => {
  it('accepts a local dev origin on any port and rejects others with 403 (not 500)', async () => {
    const ok = await api().post('/api/auth/login').set('Origin', 'http://localhost:5180').send({ phone: '9876543210', password: 'nope-nope' });
    expect(ok.status).toBe(401);
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5180');

    const blocked = await api().post('/api/auth/login').set('Origin', 'https://evil.example').send({ phone: '9876543210', password: 'nope-nope' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('CORS_FORBIDDEN');
    expect(blocked.headers['x-request-id']).toBeTruthy();
  });
});

describe('registration and login', () => {
  it('registers a customer with a normalized phone and returns a session', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Asha', phone: '98765 43210', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Asha', phone: '+919876543210', role: 'CUSTOMER', profileComplete: true });
    expect(res.body.accessToken).toBeTruthy();
    expect(refreshCookie(res)).toMatch(/HttpOnly/);
    // First-party cookie by default (COOKIE_SAME_SITE unset).
    expect(refreshCookie(res)).toMatch(/SameSite=Strict/);

    const stored = await User.findOne({ phone: '+919876543210' }).select('+passwordHash +refreshTokenHash');
    expect(stored.passwordHash).not.toBe('secret123');
    expect(stored.refreshTokenHash).toHaveLength(64);
  });

  it('rejects a duplicate phone in any format', async () => {
    await api().post('/api/auth/register').send({ name: 'A', phone: '+919876543210', password: 'secret123' });
    const res = await api().post('/api/auth/register').send({ name: 'B', phone: '9876543210', password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PHONE_TAKEN');
  });

  it('rejects invalid phones and short passwords', async () => {
    expect((await api().post('/api/auth/register').send({ name: 'A', phone: '12', password: 'secret123' })).status).toBe(400);
    expect((await api().post('/api/auth/register').send({ name: 'A', phone: '9876543210', password: 'short' })).status).toBe(400);
  });

  it('logs in with the same number written differently and rejects a wrong password', async () => {
    await api().post('/api/auth/register').send({ name: 'A', phone: '9876543210', password: 'secret123' });
    expect((await api().post('/api/auth/login').send({ phone: '+91 98765-43210', password: 'secret123' })).status).toBe(200);
    const bad = await api().post('/api/auth/login').send({ phone: '9876543210', password: 'wrongpass' });
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('blocks deactivated accounts at login and on every request', async () => {
    const user = await createUser('CUSTOMER', { isActive: false });
    expect((await api().post('/api/auth/login').send({ phone: user.phone, password: 'Passw0rd!' })).status).toBe(401);
    expect((await api().get('/api/auth/me').set(auth(user))).status).toBe(401);
  });

  it('reports Google sign-in as unavailable when Firebase is not configured (no mock fallback)', async () => {
    const res = await api().post('/api/auth/google').send({ idToken: 'anything' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('GOOGLE_NOT_CONFIGURED');
  });
});

describe('sessions', () => {
  it('rotates the refresh token and rejects the old one', async () => {
    const reg = await api().post('/api/auth/register').send({ name: 'A', phone: '9876543210', password: 'secret123' });
    const first = refreshCookie(reg).split(';')[0];

    const refreshed = await api().post('/api/auth/refresh').set('Cookie', first);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();

    expect((await api().post('/api/auth/refresh').set('Cookie', first)).status).toBe(401);
  });

  it('logout invalidates the refresh token', async () => {
    const reg = await api().post('/api/auth/register').send({ name: 'A', phone: '9876543210', password: 'secret123' });
    const cookie = refreshCookie(reg).split(';')[0];
    await api().post('/api/auth/logout').set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect((await api().post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });

  it('rejects tampered or missing tokens', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi')).status).toBe(401);
  });

  it('accepts only HS256 access tokens issued by the API for the app', async () => {
    const user = await createUser('CUSTOMER');
    const secret = process.env.JWT_SECRET;
    const me = (token) => api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect((await me(AuthService.signAccessToken(user._id))).status).toBe(200);
    // Same secret and user, but missing issuer/audience, another audience, or another HMAC algorithm.
    expect((await me(jwt.sign({ id: String(user._id) }, secret, { expiresIn: '1h' }))).status).toBe(401);
    expect((await me(jwt.sign({ id: String(user._id) }, secret, { expiresIn: '1h', issuer: 'pmart-api', audience: 'other-app' }))).status).toBe(401);
    expect((await me(jwt.sign({ id: String(user._id) }, secret, { expiresIn: '1h', issuer: 'pmart-api', audience: 'pmart-app', algorithm: 'HS512' }))).status).toBe(401);
    // Unsigned token.
    const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: String(user._id), iss: 'pmart-api', aud: 'pmart-app' })).toString('base64url')}.`;
    expect((await me(unsigned)).status).toBe(401);
  });
});

describe('forced password change', () => {
  it('blocks every route except password change until the initial password is replaced', async () => {
    const rider = await createUser('RIDER', { mustChangePassword: true });
    const blocked = await api().get('/api/orders').set(auth(rider));
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('MUST_CHANGE_PASSWORD');
    expect((await api().get('/api/auth/me').set(auth(rider))).status).toBe(200);

    const same = await api().put('/api/auth/password').set(auth(rider)).send({ currentPassword: 'Passw0rd!', newPassword: 'Passw0rd!', confirmPassword: 'Passw0rd!' });
    expect(same.status).toBe(400);

    const changed = await api().put('/api/auth/password').set(auth(rider)).send({ currentPassword: 'Passw0rd!', newPassword: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' });
    expect(changed.status).toBe(200);
    expect(changed.body.user.mustChangePassword).toBe(false);
    expect((await api().get('/api/orders').set(auth(rider))).status).toBe(200);
  });

  it('rejects a wrong current password', async () => {
    const user = await createUser('CUSTOMER');
    const res = await api().put('/api/auth/password').set(auth(user)).send({ currentPassword: 'nope', newPassword: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WRONG_PASSWORD');
  });
});

describe('account activation links', () => {
  it('activates once with a valid token and stores only the token hash', async () => {
    const employee = await createUser('EMPLOYEE', { passwordHash: undefined });
    const token = await AuthService.createSetupToken(employee._id);
    const stored = await User.findById(employee._id).select('+setupTokenHash');
    expect(stored.setupTokenHash).not.toBe(token);

    expect((await api().post('/api/auth/activate').send({ token, password: 'Welcome123', confirmPassword: 'Welcome123' })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ phone: employee.phone, password: 'Welcome123' })).status).toBe(200);
    expect((await api().post('/api/auth/activate').send({ token, password: 'Another123' })).status).toBe(400);
  });

  it('rejects an expired token', async () => {
    const employee = await createUser('EMPLOYEE', { passwordHash: undefined });
    const token = await AuthService.createSetupToken(employee._id, -1);
    expect((await api().post('/api/auth/activate').send({ token, password: 'Welcome123' })).status).toBe(400);
  });
});

describe('profile', () => {
  it('updates name and email, rejecting an email used by someone else', async () => {
    const other = await createUser('CUSTOMER', { email: 'taken@example.com' });
    const user = await createUser('CUSTOMER');
    const ok = await api().put('/api/users/profile').set(auth(user)).send({ name: 'New Name', email: 'Me@Example.com' });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ name: 'New Name', email: 'me@example.com' });

    const dup = await api().put('/api/users/profile').set(auth(user)).send({ email: other.email });
    expect(dup.status).toBe(409);
  });

  it('ignores attempts to change role through the profile', async () => {
    const user = await createUser('CUSTOMER');
    await api().put('/api/users/profile').set(auth(user)).send({ name: 'X', role: 'ADMIN' });
    expect((await User.findById(user._id)).role).toBe('CUSTOMER');
  });
});

describe('sign-in throttling (rate limits on, as in production)', () => {
  const previous = process.env.RATE_LIMIT_IN_DEV;
  beforeEach(() => {
    process.env.RATE_LIMIT_IN_DEV = 'true';
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.RATE_LIMIT_IN_DEV;
    else process.env.RATE_LIMIT_IN_DEV = previous;
  });

  it('blocks a mobile number after 8 failed attempts even when the client IP keeps changing', async () => {
    const user = await createUser('CUSTOMER', { password: 'Correct-pass-1' });
    for (let i = 0; i < 8; i += 1) {
      // A forged X-Forwarded-For gives every attempt a new IP, so only the per-number limit can stop it.
      const res = await api().post('/api/auth/login').set('X-Forwarded-For', `203.0.113.${i + 1}`).send({ phone: user.phone, password: `wrong-${i}` });
      expect(res.status).toBe(401);
    }
    const blocked = await api().post('/api/auth/login').set('X-Forwarded-For', '198.51.100.7').send({ phone: user.phone, password: 'Correct-pass-1' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');

    const other = await createUser('CUSTOMER', { password: 'Other-pass-1' });
    const ok = await api().post('/api/auth/login').set('X-Forwarded-For', '198.51.100.8').send({ phone: other.phone, password: 'Other-pass-1' });
    expect(ok.status).toBe(200);
  });

  it('does not count successful sign-ins towards the per-number limit', async () => {
    const user = await createUser('CUSTOMER', { password: 'Correct-pass-1' });
    for (let i = 0; i < 9; i += 1) {
      const res = await api().post('/api/auth/login').set('X-Forwarded-For', `192.0.2.${i + 1}`).send({ phone: user.phone, password: 'Correct-pass-1' });
      expect(res.status).toBe(200);
    }
  });
});

describe('M2 security hardening', () => {
  it('enforces password policy: rejects common passwords and passwords containing phone number', async () => {
    const res1 = await api().post('/api/auth/register').send({ name: 'A', phone: '9876543210', password: 'password123' });
    expect(res1.status).toBe(400);

    const res2 = await api().post('/api/auth/register').send({ name: 'B', phone: '9876543210', password: 'pass-9876543210' });
    expect(res2.status).toBe(400);
  });

  it('locks account after 5 consecutive failed login attempts', async () => {
    const user = await createUser('CUSTOMER', { password: 'SecurePassword1!' });
    for (let i = 0; i < 4; i++) {
      const res = await api().post('/api/auth/login').send({ phone: user.phone, password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    }

    // 5th failed attempt locks the account
    const fifth = await api().post('/api/auth/login').send({ phone: user.phone, password: 'wrongpassword' });
    expect(fifth.status).toBe(401);
    expect(fifth.body.code).toBe('ACCOUNT_LOCKED');

    // Subsequent attempt even with correct password is rejected while locked
    const locked = await api().post('/api/auth/login').send({ phone: user.phone, password: 'SecurePassword1!' });
    expect(locked.status).toBe(401);
    expect(locked.body.code).toBe('ACCOUNT_LOCKED');

    // Admin unlock allows login again
    const admin = await createUser('ADMIN');
    const unlockRes = await api().post(`/api/admin/users/${user._id}/unlock`).set(auth(admin));
    expect(unlockRes.status).toBe(200);

    const success = await api().post('/api/auth/login').send({ phone: user.phone, password: 'SecurePassword1!' });
    expect(success.status).toBe(200);
  });

  it('revokes access token when password is changed (tokenVersion check)', async () => {
    const user = await createUser('CUSTOMER', { password: 'OriginalPassword1!' });
    const loginRes = await api().post('/api/auth/login').send({ phone: user.phone, password: 'OriginalPassword1!' });
    const tokenBefore = loginRes.body.accessToken;

    // Verify token works
    expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${tokenBefore}`)).status).toBe(200);

    // Change password
    const changeRes = await api()
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${tokenBefore}`)
      .send({ currentPassword: 'OriginalPassword1!', newPassword: 'UpdatedPassword1!', confirmPassword: 'UpdatedPassword1!' });
    expect(changeRes.status).toBe(200);

    // The old token is immediately rejected with TOKEN_REVOKED
    const rejected = await api().get('/api/auth/me').set('Authorization', `Bearer ${tokenBefore}`);
    expect(rejected.status).toBe(401);
    expect(rejected.body.code).toBe('TOKEN_REVOKED');

    // The new token works
    const tokenAfter = changeRes.body.accessToken;
    expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${tokenAfter}`)).status).toBe(200);
  });

  it('detects refresh token reuse and revokes the session family', async () => {
    const reg = await api().post('/api/auth/register').send({ name: 'Bob', phone: '9123456789', password: 'BobPassword123!' });
    const firstCookie = refreshCookie(reg).split(';')[0];

    // Legitimate refresh rotates to second token
    const firstRefresh = await api().post('/api/auth/refresh').set('Cookie', firstCookie);
    expect(firstRefresh.status).toBe(200);
    const secondCookie = refreshCookie(firstRefresh).split(';')[0];

    // Replay of the first (already rotated) token triggers theft detection
    const replayed = await api().post('/api/auth/refresh').set('Cookie', firstCookie);
    expect(replayed.status).toBe(401);
    expect(replayed.body.code).toBe('REFRESH_REVOKED');

    // The entire session family is now revoked, so secondCookie is also rejected
    const blocked = await api().post('/api/auth/refresh').set('Cookie', secondCookie);
    expect(blocked.status).toBe(401);
  });

  it('supports admin-issued password reset links and single-use password reset', async () => {
    const admin = await createUser('ADMIN');
    const customer = await createUser('CUSTOMER', { password: 'OldPassword1!' });

    const linkRes = await api().post(`/api/admin/users/${customer._id}/reset-link`).set(auth(admin));
    expect(linkRes.status).toBe(200);
    const { resetToken } = linkRes.body.data;
    expect(resetToken).toBeTruthy();

    // Reset password with token
    const resetRes = await api().post('/api/auth/reset-password').send({ token: resetToken, password: 'BrandNewPassword1!' });
    expect(resetRes.status).toBe(200);

    // Can log in with new password
    expect((await api().post('/api/auth/login').send({ phone: customer.phone, password: 'BrandNewPassword1!' })).status).toBe(200);

    // Token cannot be reused
    const reuse = await api().post('/api/auth/reset-password').send({ token: resetToken, password: 'AnotherPassword1!' });
    expect(reuse.status).toBe(400);
  });

  it('manages sessions and allows revoking other sessions', async () => {
    const customer = await createUser('CUSTOMER', { password: 'PasswordForSessions1!' });
    const session1 = await api().post('/api/auth/login').send({ phone: customer.phone, password: 'PasswordForSessions1!' });
    const cookie1 = refreshCookie(session1).split(';')[0];

    const session2 = await api().post('/api/auth/login').send({ phone: customer.phone, password: 'PasswordForSessions1!' });
    const cookie2 = refreshCookie(session2).split(';')[0];

    // Both sessions can refresh
    expect((await api().post('/api/auth/refresh').set('Cookie', cookie1)).status).toBe(200);
    expect((await api().post('/api/auth/refresh').set('Cookie', cookie2)).status).toBe(200);

    // List sessions
    const listRes = await api().get('/api/auth/sessions').set('Authorization', `Bearer ${session2.body.accessToken}`).set('Cookie', cookie2);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);

    // Revoke other sessions from session 2
    const revokeRes = await api().post('/api/auth/sessions/revoke-others').set('Authorization', `Bearer ${session2.body.accessToken}`).set('Cookie', cookie2);
    expect(revokeRes.status).toBe(200);

    // Session 1 is now revoked
    expect((await api().post('/api/auth/refresh').set('Cookie', cookie1)).status).toBe(401);
  });
});
