jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
}));
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

import mongoose from 'mongoose';
import { User, UserRole } from '../modules/auth/auth.model';
import { RiderProfile } from '../modules/rider/rider.model';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../app';
import { hashPassword } from '../utils/auth';

let mongoServer: MongoMemoryReplSet;
let adminToken: string;
let riderId: string;
let riderToken: string;
let currentRiderPassword = 'InitialPassword123';

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());

  // Create admin for provisioning
  const admin: any = await User.create({
    name: 'Admin User',
    phone: '9999999999',
    role: UserRole.ADMIN,
    passwordHash: await hashPassword('AdminPassword'),
    profileComplete: true,
    isActive: true,
  });

  const { accessToken } = await (require('../modules/auth/auth.service').AuthService).generateTokens(admin._id.toString());
  adminToken = accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) { await mongoServer.stop(); }
});

beforeEach(async () => {
  jest.clearAllMocks();
});

describe('Rider Provisioning & Authentication Security', () => {
  it('should provision a new rider securely', async () => {
    const res = await request(app)
      .post('/api/admin/riders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Rider',
        phone: '1234567890',
        vehicleType: 'BIKE',
        vehicleNumber: 'KA01AA1234',
        password: currentRiderPassword
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Rider created successfully');
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.password).toBeUndefined();

    riderId = res.body.riderId;

    // Verify DB
    const user = await User.findById(riderId);
    expect(user?.role).toBe(UserRole.RIDER);
    expect(user?.profileComplete).toBe(true);

    const profile = await RiderProfile.findOne({ user: riderId });
    expect(profile).toBeTruthy();
  });

  it('should not leave orphaned records on creation failure', async () => {
    // Simulate failure by forcing a unique index error manually or passing invalid data
    // Let's pass a duplicate phone to test
    const res = await request(app)
      .post('/api/admin/riders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Rider',
        phone: '1234567890', // Duplicate
        vehicleType: 'BIKE',
        vehicleNumber: 'KA01AA9999',
        password: 'ValidPassword'
      });

    expect(res.status).toBe(409); // Handled conflict
    // Ensure no new profiles created for "Another Rider"
    const profile = await RiderProfile.findOne({ vehicleNumber: 'KA01AA9999' });
    expect(profile).toBeNull();
  });

  it('should allow the provisioned rider to login but block API access', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '1234567890',
        password: currentRiderPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.headers['set-cookie'][0]).toMatch(/refreshToken/);
    expect(res.body.user.mustChangePassword).toBe(true);

    riderToken = res.body.accessToken;

    // Direct API request should be blocked
    const protectedRes = await request(app)
      .get('/api/rider/profile') // Arbitrary protected route
      .set('Authorization', `Bearer ${riderToken}`);

    expect(protectedRes.status).toBe(403);
    expect(protectedRes.body.code).toBe('MUST_CHANGE_PASSWORD');
  });

  it('should block API access even with query strings or trailing slashes (bypass test)', async () => {
    const protectedRes1 = await request(app)
      .get('/api/rider/profile?foo=bar')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(protectedRes1.status).toBe(403);

    const protectedRes2 = await request(app)
      .get('/api/rider/profile/')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(protectedRes2.status).toBe(403);
    
    // Changing method doesn't bypass
    const protectedRes3 = await request(app)
      .post('/api/rider/profile')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(protectedRes3.status).toBe(403);

    // Order endpoints
    const orderRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(orderRes.status).toBe(403);

    const deliverRes = await request(app)
      .post('/api/orders/xyz123/deliver')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(deliverRes.status).toBe(403);

    const locationRes = await request(app)
      .post('/api/rider/location')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(locationRes.status).toBe(403);
  });

  it('should change password and reject old password', async () => {
    const newPassword = 'NewPassword123';
    
    // Change password
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        currentPassword: currentRiderPassword,
        newPassword: newPassword,
        confirmPassword: newPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    
    // Update local state
    currentRiderPassword = newPassword;

    // Try old password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '1234567890',
        password: 'InitialPassword123' // The old password
      });

    expect(loginRes.status).toBe(401);
  });

  it('should clear mustChangePassword flag on success', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '1234567890',
        password: currentRiderPassword
      });
    
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(false);

    // Verify Rider API calls work
    const protectedRes = await request(app)
      .get('/api/rider/profile')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);
    
    // Status might be 200 or 404 depending on if /api/rider/profile exists in test environment, but not 403 MUST_CHANGE_PASSWORD
    expect(protectedRes.status).not.toBe(403);
  });

  it('should prevent unauthorized password change attempts', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .send({
        currentPassword: currentRiderPassword,
        newPassword: 'HackPassword',
        confirmPassword: 'HackPassword'
      });

    expect(res.status).toBe(401);
  });

  it('should enforce password length policy', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        currentPassword: currentRiderPassword,
        newPassword: 'short',
        confirmPassword: 'short'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/);
  });
});
