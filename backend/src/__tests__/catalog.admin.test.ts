import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User, UserRole } from '../modules/auth/auth.model';
import { Category, Product } from '../modules/catalog/catalog.model';
import { AuditLog, AuditAction } from '../modules/admin/audit.model';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

let mongoServer: MongoMemoryServer;
let adminToken: string;
let employeeWithPermToken: string;
let employeeNoPermToken: string;
let customerToken: string;
let categoryId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);

  // Seed Users
  const admin = await User.create({
    name: 'Admin User',
    phone: '+919999999991',
    role: UserRole.ADMIN,
    isActive: true,
    authProvider: 'PHONE',
    passwordHash: 'dummy'
  });
  adminToken = jwt.sign({ id: admin._id }, env.JWT_SECRET, { expiresIn: '1h' });

  const employeeWithPerm = await User.create({
    name: 'Employee Perm',
    phone: '+919999999992',
    role: UserRole.EMPLOYEE,
    permissions: ['catalog.manage'],
    isActive: true,
    authProvider: 'PHONE',
    passwordHash: 'dummy'
  });
  employeeWithPermToken = jwt.sign({ id: employeeWithPerm._id }, env.JWT_SECRET, { expiresIn: '1h' });

  const employeeNoPerm = await User.create({
    name: 'Employee No Perm',
    phone: '+919999999993',
    role: UserRole.EMPLOYEE,
    permissions: [],
    isActive: true,
    authProvider: 'PHONE',
    passwordHash: 'dummy'
  });
  employeeNoPermToken = jwt.sign({ id: employeeNoPerm._id }, env.JWT_SECRET, { expiresIn: '1h' });

  const customer = await User.create({
    name: 'Customer',
    phone: '+919999999994',
    role: UserRole.CUSTOMER,
    isActive: true,
    authProvider: 'PHONE',
    passwordHash: 'dummy'
  });
  customerToken = jwt.sign({ id: customer._id }, env.JWT_SECRET, { expiresIn: '1h' });

  const category = await Category.create({
    name: 'Vegetables',
    slug: 'vegetables',
    isActive: true
  });
  categoryId = (category._id as any).toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Catalog Governance API', () => {

  let createdProductId: string;

  describe('1. Product Creation', () => {
    it('should reject unauthenticated users', async () => {
      const res = await request(app).post('/api/products').send({ name: 'Test' });
      expect(res.status).toBe(401);
    });

    it('should reject customers', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Test' });
      expect(res.status).toBe(403);
    });

    it('should reject employees without catalog.manage permission', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${employeeNoPermToken}`)
        .send({ name: 'Test' });
      expect(res.status).toBe(403);
    });

    it('should block creation if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' });
      expect(res.status).toBe(422);
    });

    it('should allow authorized admin to create a valid product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Fresh Tomato',
          category: categoryId,
          price: 40,
          unit: '1 kg',
          sku: 'TOM-001'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Fresh Tomato');
      createdProductId = res.body.data._id;
    });

    it('should write an audit log on successful product creation', async () => {
      const logs = await AuditLog.find({ resource: 'Product', action: AuditAction.CREATE });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].details?.sku).toBe('TOM-001');
    });

    it('should reject creation with duplicate SKU', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Fresh Tomato 2',
          category: categoryId,
          price: 50,
          unit: '1 kg',
          sku: 'TOM-001'
        });
      expect(res.status).toBe(409);
    });
  });

  describe('2. Product Updating', () => {
    it('should allow employee with catalog.manage to update product', async () => {
      const res = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${employeeWithPermToken}`)
        .send({
          price: 45
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(45);
    });

    it('should reject mass assignment of protected fields', async () => {
      const res = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          _id: new mongoose.Types.ObjectId().toString(), // invalid update
        });
      
      expect(res.status).toBe(400); // Invalid updates specified
    });
  });

  describe('3. Category Management & Deletion Safety', () => {
    let newCategoryId: string;

    it('should allow admin to create a category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Fruits'
        });
      expect(res.status).toBe(201);
      newCategoryId = res.body.data._id;
    });

    it('should block deletion of category with linked products', async () => {
      const res = await request(app)
        .delete(`/api/categories/${categoryId}`) // linked to Fresh Tomato
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(409); // conflict
    });

    it('should allow deletion of empty category', async () => {
      const res = await request(app)
        .delete(`/api/categories/${newCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
    });
  });

  describe('4. Product Archiving / Soft Delete', () => {
    it('should softly delete (archive) product', async () => {
      const res = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      
      // Verify it's archived
      const product = await Product.findById(createdProductId);
      expect(product?.isActive).toBe(false);
    });
  });
});
