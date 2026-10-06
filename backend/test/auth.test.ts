import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { User, UserRole, AuthProvider } from '../src/modules/auth/auth.model';
import { hashPassword } from '../src/utils/auth';
import { AuthService } from '../src/modules/auth/auth.service';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Authentication & Authorization Tests', () => {
  describe('Legacy User Password Enrollment', () => {
    it('should require enrollment for a valid legacy session without a password', async () => {
      const user = await User.create({
        name: 'Legacy User',
        phone: '1234567890',
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.PHONE,
        isActive: true,
        // No passwordHash
      });
      const { accessToken } = AuthService.generateTokens((user as any)._id.toString());

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NEEDS_PASSWORD_ENROLLMENT');
    });

    it('should allow /api/auth/me without a password', async () => {
      const user = await User.create({
        name: 'Legacy User',
        phone: '1234567891',
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.PHONE,
        isActive: true,
      });
      const { accessToken } = AuthService.generateTokens((user as any)._id.toString());

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Legacy User');
    });

    it('should successfully enroll password for a valid legacy session', async () => {
      const user = await User.create({
        name: 'Legacy User',
        phone: '1234567892',
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.PHONE,
        isActive: true,
      });
      const { accessToken } = AuthService.generateTokens((user as any)._id.toString());

      const setupRes = await request(app)
        .post('/api/auth/setup-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'securepassword' });
      
      expect(setupRes.status).toBe(200);

      // Now cart access should work (or return 404/200 depending on cart state, not 403 password enrollment)
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(cartRes.status).not.toBe(403);
    });

    it('should reject enrollment if password already exists', async () => {
      const passwordHash = await hashPassword('existingpassword');
      const user = await User.create({
        name: 'Modern User',
        phone: '1234567893',
        passwordHash,
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.PHONE,
        isActive: true,
      });
      const { accessToken } = AuthService.generateTokens((user as any)._id.toString());

      const setupRes = await request(app)
        .post('/api/auth/setup-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'newpassword' });
      
      expect(setupRes.status).toBe(500); // Or 400 depending on error handler, but definitely not 200
      expect(setupRes.body.message).toMatch(/Password already set/);
    });

    it('should prevent concurrent enrollment requests from overwriting', async () => {
      const user = await User.create({
        name: 'Legacy User',
        phone: '1234567894',
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.PHONE,
        isActive: true,
      });
      const { accessToken } = AuthService.generateTokens((user as any)._id.toString());

      const req1 = request(app)
        .post('/api/auth/setup-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'password1' });

      const req2 = request(app)
        .post('/api/auth/setup-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'password1' });
        
      const results = await Promise.all([req1, req2]);
      
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBe(1);
    });
    
    it('should reject invalid or missing session for enrollment', async () => {
      const setupRes = await request(app)
        .post('/api/auth/setup-password')
        .send({ password: 'newpassword' });
      
      expect(setupRes.status).toBe(401);
    });
  });
});
