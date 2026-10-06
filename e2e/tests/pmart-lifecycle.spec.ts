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
    await mongoose.connection.collection('users').updateOne({ _id: rider._id }, { $set: { name: uniqueRiderName, isActive: true, profileComplete: true } });
    
    riderUser = { id: rider._id, name: uniqueRiderName, role: 'RIDER' };
    riderToken = jwt.sign(riderUser, jwtSecret, { expiresIn: '1d' });
    await mongoose.connection.collection('riderprofiles').updateOne({ user: rider._id }, { $set: { availabilityStatus: 'AVAILABLE', isActive: true, currentDelivery: null } });

    // Customer
    const customer = await mongoose.connection.collection('users').findOne({ role: 'CUSTOMER' });
    if (!customer) throw new Error("No customer found in DB");
    customerUser = { id: customer._id, name: customer.name || 'Customer', role: 'CUSTOMER' };
    customerToken = jwt.sign(customerUser, jwtSecret, { expiresIn: '1d' });

    // Ensure customer has an address for checkout
    const addressId = new mongoose.Types.ObjectId();
    const addressDoc = {
      user: customer._id,
      label: 'HOME',
      recipientName: 'E2E Customer',
      recipientPhone: '9999999999',
      houseNumber: 'Test-123',
      street: 'Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      country: 'India',
      location: { type: 'Point', coordinates: [77.391, 28.5355] },
      isDefault: true,
      isActive: true,
      updatedAt: new Date()
    };
    
    await mongoose.connection.collection('addresses').updateOne(
      { user: customer._id, isDefault: true },
      { 
        $set: addressDoc,
        $setOnInsert: { _id: addressId, createdAt: new Date() }
      },
      { upsert: true }
    );
    
    const existingAddress = await mongoose.connection.collection('addresses').findOne({ user: customer._id, isDefault: true });
    customerUser.addressId = existingAddress?._id.toString();
    console.log('[TEST SETUP] Injected addressId:', customerUser.addressId);
  });

  test.afterAll(async () => {
    await mongoose.disconnect();
  });

  test('Complete PMart E2E Flow', async ({ browser }) => {
    test.setTimeout(120000); // 120 seconds timeout for full E2E flow
    // 1. Create Browser Contexts
    const customerContext = await browser.newContext();
    const adminContext = await browser.newContext();
    const riderContext = await browser.newContext();

    const customerPage = await customerContext.newPage();
    const adminPage = await adminContext.newPage();
    const riderPage = await riderContext.newPage();

    customerPage.on('console', msg => console.log('CUSTOMER CONSOLE:', msg.text()));
    adminPage.on('console', msg => console.log('ADMIN CONSOLE:', msg.text()));
    riderPage.on('console', msg => console.log('RIDER CONSOLE:', msg.text()));

    // 2. Inject Tokens
    const injectAuth = async (page: any, token: string, user: any) => {
      await page.addInitScript((data: any) => {
        localStorage.setItem('pmart_auth_token', data.token);
        localStorage.setItem('pmart_user', JSON.stringify(data.user));
        if (data.user.addressId) {
          localStorage.setItem('pmart_selected_location_id', data.user.addressId);
        }
      }, { token, user });
    };

    await injectAuth(customerPage, customerToken, customerUser);
    await injectAuth(adminPage, adminToken, adminUser);
    await injectAuth(riderPage, riderToken, riderUser);

    // ==========================================
    // CUSTOMER CHECKOUT
    // ==========================================
    await customerPage.goto(UI_URL);
    
    // Add product to cart
    await customerPage.getByRole('button', { name: /Add .* to cart/i }).first().click();
    await customerPage.waitForTimeout(1000); // Wait for cart context to update
    
    // Open cart & Checkout
    await customerPage.goto(`${UI_URL}/checkout`);
    
    // Wait for address to load and be selected
    try {
      await expect(customerPage.locator('.selected-addr-card')).toBeVisible({ timeout: 15000 });
    } catch (e) {
      await customerPage.screenshot({ path: 'test-results/checkout-failed.png' });
      throw e;
    }
    
    // Place order
    await customerPage.getByRole('button', { name: /Place COD Order/i }).click();
    
    // Wait for success and navigate to tracking page
    await customerPage.waitForURL(/\/orders\/[a-f0-9]+$/);
    const trackingUrl = customerPage.url();
    orderId = trackingUrl.split('/').pop() || '';
    expect(orderId).toBeTruthy();

    // Verify UI has no 'Invalid Date'
    const pageText = await customerPage.content();
    expect(pageText).not.toContain('Invalid Date');

    // ==========================================
    // ADMIN FLOW
    // ==========================================
    await adminPage.goto(`${UI_URL}/admin/orders`);
    await adminPage.waitForLoadState('networkidle');

    // Target the specific order row
    const orderDoc = await mongoose.connection.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
    if (!orderDoc) throw new Error("Order not found in DB: " + orderId);
    
    const adminSearchText = orderDoc.orderNumber || orderId.slice(-6).toUpperCase();
    const orderRow = adminPage.locator('tr', { hasText: new RegExp(adminSearchText, 'i') }).first();

    // Accept
    const approveBtn = orderRow.getByRole('button', { name: /Accept Order/i });
    await approveBtn.click();
    await adminPage.waitForTimeout(500); // Wait for status update
    
    // Prepare
    const prepareBtn = orderRow.getByRole('button', { name: /Start Preparing/i });
    await prepareBtn.click();
    await adminPage.waitForTimeout(500);
    
    // Ready
    const readyBtn = orderRow.getByRole('button', { name: /Mark Ready/i });
    await readyBtn.click();
    await adminPage.waitForTimeout(500);

    // Assign Rider
    const assignBtn = orderRow.getByRole('button', { name: /Assign Rider/i });
    await assignBtn.click();
    
    // In modal, click the specific rider
    await adminPage.getByRole('button', { name: new RegExp(riderUser.name, 'i') }).first().waitFor({ state: 'visible', timeout: 30000 });
    await adminPage.getByRole('button', { name: new RegExp(riderUser.name, 'i') }).first().click();

    // Click Assign Rider button
    await adminPage.locator('.modal-actions').getByRole('button', { name: 'Assign Rider', exact: true }).click();
    await adminPage.waitForTimeout(1500); // Wait for the assignment API and state update

    // ==========================================
    // RIDER FLOW
    // ==========================================
    await riderPage.goto(`${UI_URL}/rider/orders/${orderId}`);
    
    // Pickup
    const pickupBtn = riderPage.getByRole('button', { name: /Confirm Picked Up/i, exact: true });
    await pickupBtn.waitFor({ state: 'visible', timeout: 15000 });
    await pickupBtn.click();
    
    // Start Delivery Run
    const startRunBtn = riderPage.getByRole('button', { name: /Start Delivery Run/i });
    await startRunBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startRunBtn.click();

    // Customer Realtime Update check
    await expect(customerPage.getByText('OUT FOR DELIVERY').first()).toBeVisible({ timeout: 15000 });

    // Rider page does not listen to socket events, so if backend auto-progressed, the local state is stale.
    await riderPage.reload();

    // Enter Delivery OTP (Arrived -> OTP -> Deliver)
    // Rider clicks "Arrived"
    const arrivedBtn = riderPage.getByRole('button', { name: /Arrived at Customer/i });
    await arrivedBtn.waitFor({ state: 'visible', timeout: 15000 });
    await arrivedBtn.click();
    
    // Customer sees OTP
    const otpElement = customerPage.locator('.digits-group').first();
    await otpElement.waitFor({ state: 'visible', timeout: 15000 });
    let otpText = await otpElement.innerText();
    otpText = otpText.replace(/\s+/g, '').trim(); // Remove newlines/spaces between digits
    expect(otpText).toMatch(/^\d{4}$/);
    
    // Rider completes delivery
    // 1. Rider collects cash — wait for CollectPaymentSection to render after ARRIVED state
    const paymentBtn = riderPage.getByRole('button', { name: /Payment Received/i });
    await paymentBtn.waitFor({ state: 'visible', timeout: 15000 });
    await riderPage.screenshot({ path: 'test-results/rider-arrived.png' });
    await paymentBtn.click();
    
    // 2. Rider enters OTP
    const otpDigits = otpText.trim().split('');
    await riderPage.getByLabel('Digit 1').fill(otpDigits[0]);
    await riderPage.getByLabel('Digit 2').fill(otpDigits[1]);
    await riderPage.getByLabel('Digit 3').fill(otpDigits[2]);
    await riderPage.getByLabel('Digit 4').fill(otpDigits[3]);

    // 3. Complete
    await riderPage.getByRole('button', { name: /Verify & Complete Delivery/i }).click();

    // Verify all end states
    await expect(customerPage.getByText('DELIVERED', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(adminPage.getByText('DELIVERED', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    
    await customerContext.close();
    await adminContext.close();
    await riderContext.close();
  });
});
