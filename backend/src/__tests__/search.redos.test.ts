import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { User, UserRole } from '../modules/auth/auth.model';
import { Product, Category } from '../modules/catalog/catalog.model';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let mongoServer: MongoMemoryReplSet;
let adminToken: string;
let categoryId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());

  const admin = await User.create({ name: 'Admin', phone: '+919999999999', role: UserRole.ADMIN, isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
  adminToken = jwt.sign({ id: admin._id, role: admin.role }, env.JWT_SECRET, { expiresIn: '1h' });

  const cat = await Category.create({ name: 'TestCat', slug: 'testcat', shortName: 'TC', isActive: true });
  categoryId = cat._id as mongoose.Types.ObjectId;

  await Product.create({
    name: 'Apple iPad Pro',
    brand: 'Apple',
    slug: 'apple-ipad-pro',
    category: categoryId,
    categorySlug: 'testcat',
    price: 999,
    mrp: 1099,
    unit: 'pcs',
    sku: 'IPAD-PRO-1',
    isActive: true
  });
  
  await Product.create({
    name: 'Samsung Galaxy Tab',
    brand: 'Samsung',
    slug: 'samsung-galaxy-tab',
    category: categoryId,
    categorySlug: 'testcat',
    price: 799,
    mrp: 899,
    unit: 'pcs',
    sku: 'SAM-TAB-1',
    isActive: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Search ReDoS and Security Tests', () => {
  describe('Catalog Public Search', () => {
    it('should return results for normal literal searches', async () => {
      const res = await request(app).get('/api/products/search?q=Apple');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toContain('Apple');
    });

    it('should treat regex metacharacters literally', async () => {
      const res = await request(app).get('/api/products/search?q=.*');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0); // Should not match anything since we don't have literally '.*' in product names
    });

    it('should reject oversized inputs (>100 characters) with 400', async () => {
      const hugeInput = 'A'.repeat(150);
      const res = await request(app).get(`/api/products/search?q=${hugeInput}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Search query too long');
    });


    it('should execute adversarial regex input safely and quickly without timing out', async () => {
      // If unescaped, an input like ^(a+)+$ against a non-matching string might cause high CPU.
      // But now it should be escaped to \^\(a\+\)\+\$ and quickly return 0 matches.
      const startTime = Date.now();
      const res = await request(app).get(`/api/products/search?q=^(a+)+$`);
      const duration = Date.now() - startTime;
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
      expect(duration).toBeLessThan(1000); // Should be very fast
    });
  });

  describe('Catalog Admin Search', () => {
    it('should treat regex metacharacters literally', async () => {
      const res = await request(app)
        .get('/api/admin/products?search=.*')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(0);
    });

    it('should reject oversized inputs', async () => {
      const hugeInput = 'B'.repeat(150);
      const res = await request(app)
        .get(`/api/admin/products?search=${hugeInput}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Search query too long');
    });
  });

  describe('Admin Users Search', () => {
    it('should return matching users for normal text', async () => {
      const res = await request(app)
        .get('/api/admin/users/search?q=Admin')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toBe('Admin');
    });

    it('should reject oversized inputs', async () => {
      const hugeInput = 'C'.repeat(150);
      const res = await request(app)
        .get(`/api/admin/users/search?q=${hugeInput}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Search query too long');
    });
  });
});
