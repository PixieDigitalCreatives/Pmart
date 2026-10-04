import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Load backend env to get JWT_SECRET and MONGODB_URI
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const UI_URL = 'http://localhost:5173';

test.describe('PMart Full E2E Lifecycle', () => {
  let adminToken: string;
  let adminUser: any;
  let riderToken: string;
  let riderUser: any;
  let customerToken: string;
  let customerUser: any;
  let orderId = '';

  test.beforeAll(async () => {
    // Connect to DB to generate tokens
    await mongoose.connect(process.env.MONGODB_URI as string);
    const jwtSecret = process.env.JWT_SECRET || 'test';

    // Admin
    const admin = await mongoose.connection.collection('users').findOne({ role: 'ADMIN' });
    if (!admin) throw new Error("No admin found in DB");
    adminUser = { id: admin._id, name: admin.name || 'Admin', role: 'ADMIN' };
    adminToken = jwt.sign(adminUser, jwtSecret, { expiresIn: '1d' });

    // Rider
    const rider = await mongoose.connection.collection('users').findOne({ role: 'RIDER' });
    if (!rider) throw new Error("No rider found in DB");
    
    // Give rider a unique name so Playwright can click the exact right one in the list
    const uniqueRiderName = 'Test Rider ' + Date.now();
    await mongoose.connection.collection('users').updateOne({ _id: rider._id }, { $set: { name: uniqueRiderName, isActive: true } });
    
    riderUser = { id: rider._id, name: uniqueRiderName, role: 'RIDER' };
    riderToken = jwt.sign(riderUser, jwtSecret, { expiresIn: '1d' });
    await mongoose.connection.collection('riderprofiles').updateOne({ user: rider._id }, { $set: { availabilityStatus: 'AVAILABLE', isActive: true, currentDelivery: null } });

    // Customer
    const customer = await mongoose.connection.collection('users').findOne({ role: 'CUSTOMER' });
    if (!customer) throw new Error("No customer found in DB");
    customerUser = { id: customer._id, name: customer.name || 'Customer', role: 'CUSTOMER' };
    customerToken = jwt.sign(customerUser, jwtSecret, { expiresIn: '1d' });
  });

  test.afterAll(async () => {
    await mongoose.disconnect();
  });

  test('Live Tracking E2E Flow', async ({ browser }) => {
    const customerContext = await browser.newContext({ permissions: ['geolocation'] });
    const adminContext = await browser.newContext({ permissions: ['geolocation'] });
    const riderContext = await browser.newContext({ permissions: ['geolocation'] });

    const customerPage = await customerContext.newPage();
    const adminPage = await adminContext.newPage();
    const riderPage = await riderContext.newPage();

    customerPage.on('console', msg => console.log('CUSTOMER CONSOLE:', msg.text()));
    customerPage.on('dialog', dialog => { console.log('CUSTOMER DIALOG:', dialog.message()); dialog.dismiss(); });
    customerPage.on('pageerror', err => console.log('CUSTOMER PAGE ERROR:', err));
    customerPage.on('response', res => { if (res.url().includes('/checkout')) console.log('CHECKOUT RESP:', res.status(), res.url()); });
    adminPage.on('console', msg => console.log('ADMIN CONSOLE:', msg.text()));
    riderPage.on('console', msg => console.log('RIDER CONSOLE:', msg.text()));

    const injectAuth = async (page: any, token: string, user: any) => {
      await page.addInitScript((data: any) => {
        localStorage.setItem('pmart_auth_token', data.token);
        localStorage.setItem('pmart_user', JSON.stringify(data.user));
      }, { token, user });
    };

    await injectAuth(customerPage, customerToken, customerUser);
    await injectAuth(adminPage, adminToken, adminUser);
    await injectAuth(riderPage, riderToken, riderUser);

    // 1. Place order
    await customerPage.goto(UI_URL);
    await customerPage.getByRole('button', { name: /Add .* to cart/i }).first().click();
    await customerPage.waitForTimeout(1000);
    await customerPage.goto(`${UI_URL}/checkout`);
    await expect(customerPage.locator('.selected-addr-card')).toBeVisible({ timeout: 15000 });
    await customerPage.getByRole('button', { name: /Place COD Order/i }).click();
    await customerPage.waitForURL(/\/orders\/[a-f0-9]+$/);
    const trackingUrl = customerPage.url();
    orderId = trackingUrl.split('/').pop() || '';

    // 2. Admin accepts, prepares, readies, and assigns
    await adminPage.goto(`${UI_URL}/admin/orders`);
    const orderDoc = await mongoose.connection.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
    if (!orderDoc) throw new Error("Order not found in DB: " + orderId);
    
    const adminSearchText = orderDoc.orderNumber || orderId.slice(-6).toUpperCase();
    const orderRow = adminPage.locator('tr', { hasText: new RegExp(adminSearchText, 'i') }).first();
    await orderRow.getByRole('button', { name: /Accept Order/i }).click();
    await adminPage.waitForTimeout(500);
    await orderRow.getByRole('button', { name: /Start Preparing/i }).click();
    await adminPage.waitForTimeout(500);
    await orderRow.getByRole('button', { name: /Mark Ready/i }).click();
    await adminPage.waitForTimeout(500);
    await orderRow.getByRole('button', { name: /Assign Rider/i }).click();
    await adminPage.getByRole('button', { name: new RegExp(riderUser.name, 'i') }).first().waitFor({ state: 'visible', timeout: 30000 });
    await adminPage.getByRole('button', { name: new RegExp(riderUser.name, 'i') }).first().click();
    await adminPage.locator('.modal-actions').getByRole('button', { name: 'Assign Rider', exact: true }).click();
    await adminPage.waitForTimeout(1500);

    // 3. Open Admin Live Deliveries page to observe
    await adminPage.goto(`${UI_URL}/admin/live-deliveries`);

    // 4. Rider picks up and starts delivery
    await riderPage.goto(`${UI_URL}/rider/orders/${orderId}`);
    
    const pickupBtn = riderPage.getByRole('button', { name: /Confirm Picked Up/i, exact: true });
    await pickupBtn.waitFor({ state: 'visible', timeout: 15000 });
    await pickupBtn.click();
    
    const startRunBtn = riderPage.getByRole('button', { name: /Start Delivery Run/i });
    await startRunBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startRunBtn.click();

    // 5. Simulate GPS movement for the Rider
    // We will emit location 1, then verify admin and customer maps
    await riderContext.setGeolocation({ latitude: 24.9588592, longitude: 84.0155717 });
    
    // Check that customer sees out for delivery
    await expect(customerPage.getByText('OUT FOR DELIVERY').first()).toBeVisible({ timeout: 15000 });
    
    // Wait for the tracking map to load on customer page
    await customerPage.waitForSelector('.live-delivery-tracking-section', { timeout: 15000 });
    await customerPage.waitForTimeout(2000); // Give socket some time

    // Simulate Rider movement
    await riderContext.setGeolocation({ latitude: 24.9542000, longitude: 84.0210000 });
    await riderPage.waitForTimeout(2000);
    
    // Verify admin dashboard sees the rider's new location
    await expect(adminPage.locator('.logistics-map-card')).toBeVisible();
    
    await riderContext.setGeolocation({ latitude: 24.9490000, longitude: 84.0295000 });
    await riderPage.waitForTimeout(2000);

    // Rider arrives and completes
    await riderPage.getByRole('button', { name: /Arrived at Customer/i }).click();
    
    const otpElement = customerPage.locator('.otp-number').first();
    await otpElement.waitFor({ state: 'visible' });
    const otpText = await otpElement.innerText();
    
    await riderPage.getByRole('button', { name: /Payment Received/i }).click();
    const otpDigits = otpText.replace(/\D/g, '').split('');
    await riderPage.getByLabel('Digit 1').fill(otpDigits[0]);
    await riderPage.getByLabel('Digit 2').fill(otpDigits[1]);
    await riderPage.getByLabel('Digit 3').fill(otpDigits[2]);
    await riderPage.getByLabel('Digit 4').fill(otpDigits[3]);
    await riderPage.getByRole('button', { name: /Verify & Complete Delivery/i }).click();

    await expect(customerPage.getByText('DELIVERED', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  });
});
