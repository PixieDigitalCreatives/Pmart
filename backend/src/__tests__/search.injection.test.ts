import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { User, UserRole } from '../modules/auth/auth.model';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let mongoServer: MongoMemoryReplSet;
let adminToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());

  const admin = await User.create({ name: 'Admin', phone: '+919999999999', role: UserRole.ADMIN, isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
  adminToken = jwt.sign({ id: admin._id, role: admin.role }, env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) { await mongoServer.stop(); }
});

describe('Search Injection Tests', () => {
  it('should not allow NoSQL injection arrays in admin users search', async () => {
    // We send an array for search to test type casting
    // Express query parser parses ?search[]=value as an array
    const res = await request(app)
      .get('/api/admin/users/search?search[]={"$ne": ""}')
      .set('Authorization', `Bearer ${adminToken}`);

    // Whether it succeeds by casting to string or returns a 400 doesn't matter, 
    // as long as it doesn't crash or blindly execute the $ne query.
    // If it is cast to String(), it will literally search for `[ '{"$ne": ""}' ]` instead of an object payload.
    expect(res.status).toBe(400); 
    // It should safely return 0 matches or just handle it cleanly without crashing
  });

  it('should not allow NoSQL injection objects in admin users search', async () => {
    // Sending ?search[$ne]= 
    const res = await request(app)
      .get('/api/admin/users/search?search[$ne]=foo')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});
