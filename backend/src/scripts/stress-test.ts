import { createServer } from 'http';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../app';
import { Product } from '../modules/catalog/catalog.model';
import { Shop } from '../modules/shop/shop.model';
import { User, UserRole } from '../modules/auth/auth.model';
import { Order } from '../modules/order/order.model';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import http from 'http';

// Increase sockets to prevent local socket exhaustion
http.globalAgent.maxSockets = 10000;

const NUM_PRODUCTS = 100;
const TEST_DURATION_MS = 3000; // 3 seconds per phase
const CONCURRENCY_LEVELS = [10, 50, 100, 200, 500];

async function seedData() {
  const shop = await Shop.create({
    name: 'Stress Test Shop',
    owner: new mongoose.Types.ObjectId(),
    address: { street: 'Main', city: 'City', state: 'ST', pincode: '12345', coordinates: { lat: 0, lng: 0 } },
    openTime: '00:00',
    closeTime: '23:59',
    location: { type: 'Point', coordinates: [0, 0] }
  });

  const catId = new mongoose.Types.ObjectId();
  const products = [];
  for (let i = 0; i < NUM_PRODUCTS; i++) {
    products.push({
      name: `Product ${i}`,
      slug: `product-${i}`,
      sku: `SKU-${i}`,
      description: `Desc ${i}`,
      price: 10 + (i % 50),
      stock: 10000,
      stockCount: 100000,
      shop: shop._id,
      category: catId,
      categorySlug: 'groceries',
      unit: 'kg',
      isActive: true,
      images: ['img.jpg']
    });
  }
  await Product.insertMany(products);

  const customer = await User.create({
    name: 'Stress Customer',
    phone: '+10000000000',
    role: UserRole.CUSTOMER,
    isActive: true,
    authProvider: 'GOOGLE'
  });

  const token = jwt.sign({ id: (customer._id as any).toString(), role: customer.role }, env.JWT_SECRET, { expiresIn: '1h' });

  return { shop, customer, token, products: await Product.find() };
}

async function runLoadPhase(port: number, concurrency: number, endpoint: string, method: string = 'GET', token?: string, body?: any, bodyFn?: () => any) {
  let completed = 0;
  let errors = 0;
  const latencies: number[] = [];
  
  const startTime = Date.now();
  const endTime = startTime + TEST_DURATION_MS;

  const agent = new http.Agent({ keepAlive: true, maxSockets: concurrency });
  
  const headers: any = {
    'Connection': 'keep-alive',
    'Content-Type': 'application/json'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const requestPromises: Promise<void>[] = [];

  for (let i = 0; i < concurrency; i++) {
    requestPromises.push(new Promise<void>(async (resolve) => {
      while (Date.now() < endTime) {
        const reqStart = Date.now();
        const currentBody = bodyFn ? bodyFn() : body;
        const payload = currentBody ? JSON.stringify(currentBody) : undefined;
        await new Promise<void>((reqResolve) => {
          const req = http.request({
            hostname: '127.0.0.1',
            port,
            path: endpoint,
            method,
            headers,
            agent
          }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
              if (res.statusCode && res.statusCode < 400) {
                latencies.push(Date.now() - reqStart);
                completed++;
              } else {
                if (errors === 0) {
                  console.log('HTTP ERROR:', res.statusCode, resBody);
                }
                errors++;
              }
              reqResolve();
            });
          });
          req.on('error', (err) => { 
            if (errors === 0) console.log('REQ ERROR:', err.message);
            errors++; 
            reqResolve();
          });
          if (payload) req.write(payload);
          req.end();
        });
      }
      resolve();
    }));
  }

  await Promise.all(requestPromises);
  
  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const reqPerSec = completed / (TEST_DURATION_MS / 1000);

  return { concurrency, completed, errors, reqPerSec, p95 };
}

async function runStressTest() {
  console.log('Starting PMart Stress Test...');
  
  const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());
  
  console.log('Seeding Database...');
  const { token, products } = await seedData();

  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  console.log(`Server running on port ${port} (NODE_ENV=${process.env.NODE_ENV})`);

  console.log('\n--- Catalog Endpoint Load Test ---');
  for (const c of CONCURRENCY_LEVELS) {
    const res = await runLoadPhase(port, c, '/api/products');
    console.log(`Concurrency: ${c.toString().padStart(4)} | Req/s: ${res.reqPerSec.toFixed(2).padStart(8)} | p95 Latency: ${res.p95.toString().padStart(4)}ms | Errors: ${res.errors}`);
    if (res.p95 > 1000 || res.errors > res.completed * 0.1) {
      console.log(`-> Breakdown detected at concurrency ${c}`);
      break;
    }
  }

  console.log('\n--- Search Endpoint Load Test ---');
  for (const c of CONCURRENCY_LEVELS) {
    const res = await runLoadPhase(port, c, '/api/products?search=Product');
    console.log(`Concurrency: ${c.toString().padStart(4)} | Req/s: ${res.reqPerSec.toFixed(2).padStart(8)} | p95 Latency: ${res.p95.toString().padStart(4)}ms | Errors: ${res.errors}`);
    if (res.p95 > 1000 || res.errors > res.completed * 0.1) {
      console.log(`-> Breakdown detected at concurrency ${c}`);
      break;
    }
  }

  console.log('\n--- Checkout Endpoint Load Test ---');
  for (const c of [10, 50, 100]) { // Lower concurrency bounds for writes
    const checkoutPayloadFn = () => {
      const p1 = products[Math.floor(Math.random() * products.length)];
      const p2 = products[Math.floor(Math.random() * products.length)];
      return {
        items: [
          { product: (p1._id as any).toString(), quantity: 1, price: p1.price, shop: (p1.shop as any).toString() },
          { product: (p2._id as any).toString(), quantity: 2, price: p2.price, shop: (p2.shop as any).toString() }
        ],
        deliveryAddress: { street: '123 Test', city: 'Test City', state: 'Test State', pincode: '12345', coordinates: { lat: 10, lng: 20 } },
        paymentMethod: 'COD'
      };
    };
    
    const res = await runLoadPhase(port, c, '/api/orders/checkout', 'POST', token, undefined, checkoutPayloadFn);
    console.log(`Concurrency: ${c.toString().padStart(4)} | Req/s: ${res.reqPerSec.toFixed(2).padStart(8)} | p95 Latency: ${res.p95.toString().padStart(4)}ms | Errors: ${res.errors}`);
    if (res.p95 > 2000 || res.errors > res.completed * 0.2) {
      console.log(`-> Breakdown detected at concurrency ${c}`);
      break;
    }
  }

  console.log('\nTest Complete.');
  server.close();
  await mongoose.disconnect();
  await mongoServer.stop();
}

runStressTest().catch(console.error);
