import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Load backend env to get JWT_SECRET and MONGODB_URI
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const UI_URL = 'http://localhost:5173';

test.describe('PMart Address Flow E2E', () => {
  let customerToken: string;
  let customerUser: any;

  test.beforeAll(async () => {
    // Connect to DB to generate tokens
    await mongoose.connect(process.env.MONGODB_URI as string);
    const jwtSecret = process.env.JWT_SECRET || 'test';

    // Customer
    const customer = await mongoose.connection.collection('users').findOne({ role: 'CUSTOMER' });
    if (!customer) throw new Error("No customer found in DB");
    
    // Create a fresh customer profile if one doesn't exist to avoid data issues
    let profile = await mongoose.connection.collection('customerprofiles').findOne({ user: customer._id });
    if (!profile) {
       console.log("No profile found, assuming backend will create one upon address add.");
    }

    customerUser = { id: customer._id, name: customer.name || 'Customer', role: 'CUSTOMER' };
    customerToken = jwt.sign(customerUser, jwtSecret, { expiresIn: '1d' });
  });

  test.afterAll(async () => {
    await mongoose.disconnect();
  });

  test('Address CRUD Lifecycle', async ({ browser }) => {
    // 1. Create Browser Context
    const customerContext = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 28.5355, longitude: 77.3910 }
    });

    const customerPage = await customerContext.newPage();
    customerPage.on('console', msg => console.log('CUSTOMER CONSOLE:', msg.text()));

    // 2. Inject Tokens
    await customerPage.addInitScript((data: any) => {
      localStorage.setItem('pmart_auth_token', data.token);
      localStorage.setItem('pmart_user', JSON.stringify(data.user));
    }, { token: customerToken, user: customerUser });

    // Debug API requests
    customerPage.on('response', async response => {
      if (!response.ok() && response.url().includes('/api/')) {
        console.log(`API ERROR: ${response.status()} ${response.url()}`);
        try {
          console.log(`API ERROR BODY: ${await response.text()}`);
        } catch(e) {}
      }
    });

    // ==========================================
    // 3. Navigate to Addresses Page
    // ==========================================
    await customerPage.goto(`${UI_URL}/addresses`);
    
    // Wait for page load
    await expect(customerPage.getByText('Manage Delivery Addresses')).toBeVisible();

    // ==========================================
    // 4. Create Address
    // ==========================================
    await customerPage.getByRole('button', { name: /Add New Address/i }).click();

    // The map modal should open
    await expect(customerPage.getByRole('heading', { name: 'Add New Address' })).toBeVisible();

    // Click "Use Current Location"
    await customerPage.getByRole('button', { name: /Use Current Location/i }).click();

    // Wait for reverse geocode to hit and populate the preview
    // "Move marker to select location" should disappear, and city/state should appear
    await expect(customerPage.getByText('Move marker to select location')).not.toBeVisible({ timeout: 10000 });
    
    // Click "Enter Complete Address"
    await customerPage.getByRole('button', { name: /Enter Complete Address/i }).click();

    // We are now on step 2. Fill missing fields.
    const uniqueHouse = `A-${Date.now()}`;
    await customerPage.locator('.form-group').filter({ hasText: 'House / Flat / Building *' }).locator('input').fill(uniqueHouse);
    
    // Sometimes reverse geocode fails to get pincode/city/state, ensure we fill them just in case
    const cityInput = customerPage.locator('.form-group').filter({ hasText: 'City *' }).locator('input');
    const currentCity = await cityInput.inputValue();
    if (!currentCity) {
        await cityInput.fill('Noida');
    }

    const stateInput = customerPage.locator('.form-group').filter({ hasText: 'State *' }).locator('input');
    const currentState = await stateInput.inputValue();
    if (!currentState) {
        await stateInput.fill('Uttar Pradesh');
    }

    const pincodeInput = customerPage.locator('.form-group').filter({ hasText: 'Pincode *' }).locator('input');
    const currentPincode = await pincodeInput.inputValue();
    if (!currentPincode || currentPincode.length !== 6) {
       await pincodeInput.fill('201301');
    }

    const phoneInput = customerPage.locator('.form-group').filter({ hasText: 'Phone Number *' }).locator('input');
    // Always fill phone to ensure it passes 10-digit validation (pre-filled from profile might be invalid)
    await phoneInput.fill('9999999999');

    const nameInput = customerPage.locator('.form-group').filter({ hasText: 'Full Name *' }).locator('input');
    const currentName = await nameInput.inputValue();
    if (!currentName) {
        await nameInput.fill('Test User');
    }

    // Select tag
    await customerPage.getByRole('button', { name: 'HOME', exact: true }).click();

    // Save
    await customerPage.getByRole('button', { name: /Save Address/i }).click();

    // Wait for modal to close and the new address to be visible in the list
    await expect(customerPage.getByText(uniqueHouse)).toBeVisible({ timeout: 10000 });

    // ==========================================
    // 5. Read / Verify Address is in DB
    // ==========================================
    const savedAddress = await mongoose.connection.collection('addresses').findOne({ user: new mongoose.Types.ObjectId(customerUser.id), houseNumber: uniqueHouse });
    expect(savedAddress).toBeTruthy();
    expect(savedAddress!.pincode).toBeTruthy();
    
    // ==========================================
    // 6. Update Address
    // ==========================================
    // Find the address card and click Edit
    const addressCard = customerPage.locator('.address-card', { hasText: uniqueHouse }).first();
    await addressCard.getByRole('button', { name: /Edit/i }).click();

    // Edit modal should be on Step 2 directly
    await expect(customerPage.getByRole('heading', { name: 'Edit Address' })).toBeVisible();
    
    // Change House number
    const updatedHouse = `${uniqueHouse}-UPDATED`;
    await customerPage.locator('.form-group').filter({ hasText: 'House / Flat / Building *' }).locator('input').fill(updatedHouse);
    
    // Save
    await customerPage.getByRole('button', { name: /Save Address/i }).click();

    // Verify it changed in UI
    await expect(customerPage.getByText(updatedHouse)).toBeVisible({ timeout: 10000 });

    // ==========================================
    // 7. Delete Address
    // ==========================================
    const updatedAddressCard = customerPage.locator('.address-card', { hasText: updatedHouse }).first();
    customerPage.once('dialog', dialog => dialog.accept());
    await updatedAddressCard.getByRole('button', { name: /Delete/i }).click();

    // Verify deletion
    await expect(customerPage.getByText(updatedHouse)).not.toBeVisible({ timeout: 10000 });

    await customerContext.close();
  });
});
