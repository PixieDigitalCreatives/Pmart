import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createServer } from 'http';
import app from './src/app';
import { Product } from './src/modules/catalog/catalog.model';
import { Shop } from './src/modules/shop/shop.model';
import { User, UserRole } from './src/modules/auth/auth.model';
import jwt from 'jsonwebtoken';
import { env } from './src/config/env';
import request from 'supertest';

async function run() {
  const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());

  const shop = await Shop.create({
    name: 'Stress Test Shop',
    owner: new mongoose.Types.ObjectId(),
    address: { street: 'Main', city: 'City', state: 'ST', pincode: '12345', coordinates: { lat: 0, lng: 0 } },
    openTime: '00:00',
    closeTime: '23:59',
    location: { type: 'Point', coordinates: [0, 0] }
  });

  const catId = new mongoose.Types.ObjectId();
  const product = await Product.create({
    name: 'Product 0',
    slug: 'product-0',
    sku: 'SKU-0',
    description: 'Desc 0',
    price: 10,
    stock: 10000,
    stockCount: 10000, // Important, maybe it's stockCount?
    inStock: true,
    shop: shop._id,
    category: catId,
    categorySlug: 'groceries',
    unit: 'kg',
    isActive: true,
    images: ['img.jpg']
  });

  const customer = await User.create({
    name: 'Stress Customer',
    phone: '+10000000000',
    role: UserRole.CUSTOMER,
    isActive: true,
    authProvider: 'GOOGLE'
  });

  const token = jwt.sign({ id: (customer._id as any).toString(), role: customer.role }, env.JWT_SECRET, { expiresIn: '1h' });

  const res = await request(app)
    .post('/api/orders/checkout')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [
        { product: (product._id as any).toString(), quantity: 1, price: product.price, shop: (product.shop as any).toString() }
      ],
      deliveryAddress: {
        street: '123 Test',
        city: 'Test City',
        state: 'Test State',
        pincode: '12345',
        coordinates: { lat: 10, lng: 20 }
      },
      paymentMethod: 'COD'
    });
    
  console.log('STATUS:', res.status);
  console.log('BODY:', res.body);

  await mongoose.disconnect();
  await mongoServer.stop();
}
run().catch(console.error);
