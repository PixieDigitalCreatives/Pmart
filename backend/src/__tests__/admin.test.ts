jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
}));
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { User, UserRole } from '../modules/auth/auth.model';
import request from 'supertest';
import app from '../app';
import jwt from 'jsonwebtoken';

const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
};

describe('Admin API - Employee Management', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;
  let adminId: string;
  let employeeId: string;
  let employeeToken: string;
  
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Create an Admin user
    const admin = await User.create({
      name: 'Super Admin',
      phone: '+919999999999',
      role: UserRole.ADMIN,
      authProvider: 'PHONE',
      isActive: true,
      profileComplete: true,
      passwordHash: 'dummy',
    });
    adminId = admin._id as string;
    adminToken = generateToken(adminId);

    // Create an Employee without 'employees.manage' permission
    const emp = await User.create({
      name: 'Regular Employee',
      phone: '+918888888888',
      role: UserRole.EMPLOYEE,
      authProvider: 'PHONE',
      isActive: true,
      profileComplete: true,
      passwordHash: 'dummy',
      permissions: ['orders.read']
    });
    employeeId = emp._id as string;
    employeeToken = generateToken(employeeId);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  it('should allow ADMIN to create an employee', async () => {
    const res = await request(app)
      .post('/api/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Employee',
        phone: '+917777777777',
        email: 'new@pmart.com',
        permissions: ['catalog.manage']
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Employee created successfully');
    expect(res.body.setupToken).toBeDefined();

    const newEmp = await User.findById(res.body.employeeId);
    expect(newEmp).toBeDefined();
    expect(newEmp?.role).toBe(UserRole.EMPLOYEE);
    expect(newEmp?.permissions).toContain('catalog.manage');
  });

  it('should deny EMPLOYEE without permission from fetching employees', async () => {
    const res = await request(app)
      .get('/api/admin/employees')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/does not have permission: employees.manage/);
  });

  it('should allow EMPLOYEE with permission to fetch employees', async () => {
    const empWithPerm = await User.create({
      name: 'HR Employee',
      phone: '+916666666666',
      role: UserRole.EMPLOYEE,
      authProvider: 'PHONE',
      isActive: true,
      profileComplete: true,
      passwordHash: 'dummy',
      permissions: ['employees.manage']
    });
    const token = generateToken(empWithPerm._id as string);

    const res = await request(app)
      .get('/api/admin/employees')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
