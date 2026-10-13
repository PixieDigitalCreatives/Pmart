'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser } = require('./helpers');
const { User } = require('../src/modules/auth/auth.model');
const { AuthService } = require('../src/modules/auth/auth.service');

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
