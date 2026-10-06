import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

let adminToken: string;

test.describe('Admin Settings Persistence and Navigation (ID010)', () => {
    
    test.beforeAll(async () => {
        // Connect DB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmart');
    });
    
    test.afterAll(async () => {
        await mongoose.connection.close();
    });

    test('should verify Admin Settings UI navigation, persistence, validation and DB state', async ({ browser, request }) => {
        const adminContext = await browser.newContext();
        const page = await adminContext.newPage();
        
        page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        page.on('response', async res => {
            if (!res.ok() && res.url().includes('/api/')) {
                console.log('API ERROR:', res.status(), res.url(), await res.text().catch(() => ''));
            }
        });
        
        // 1. Setup Admin Account and Login
        const email = `admin_settings_${Date.now()}@test.com`;
        const phone = `+91999${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
        
        const insertResult = await mongoose.connection.collection('users').insertOne({
            name: 'Admin Settings Tester',
            email,
            phone,
            passwordHash: '$2a$10$XU.k/.f2HXYnJ/Z8T12DVu2K4t4I4vJ6n4VvD6y/x2wJ.O4WvD4K6', // 123456
            role: 'ADMIN',
            profileComplete: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const adminUser = { id: insertResult.insertedId.toString(), name: 'Admin Settings Tester', role: 'ADMIN' };
        const adminToken = jwt.sign(adminUser, process.env.JWT_SECRET || 'test', { expiresIn: '1d' });

        await page.addInitScript((data: any) => {
            try {
                localStorage.setItem('pmart_auth_token', data.token);
                localStorage.setItem('pmart_user', JSON.stringify(data.user));
            } catch (e) {}
        }, { token: adminToken, user: adminUser });

        await page.goto('http://localhost:5173/admin');
        
        // Wait for dashboard
        await expect(page.getByRole('heading', { name: 'Platform Central Overview' })).toBeVisible({ timeout: 10000 });
        
        // 2. Open /admin/settings from the sidebar
        await page.getByRole('link', { name: /Settings/i }).click();
        await expect(page).toHaveURL(/.*\/admin\/settings/);
        
        // 3. Confirm there is no redirect loop and it renders
        await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible({ timeout: 5000 });

        // Refresh the browser directly to /admin/settings
        await page.reload();
        await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible({ timeout: 5000 });

        // 4. Change values
        const randomFee = Math.floor(Math.random() * 10) + 10;
        
        // Fill baseDeliveryFee
        await page.getByLabel(/Standard Delivery Fee/).fill(randomFee.toString());
        // Fill freeDeliveryThreshold
        await page.getByLabel(/Free Delivery Order Minimum/).fill('499');
        // Fill platformHandlingFee
        await page.getByLabel(/Platform Handling Fee/).fill('2');

        // 5. Save and confirm the actual API request succeeds
        await page.screenshot({ path: 'filled_form.png', fullPage: true });

        const [response] = await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/admin/settings') && res.request().method() === 'PUT'),
            page.getByRole('button', { name: 'Save System Parameters' }).click()
        ]);
        
        const reqData = response.request().postDataJSON();
        console.log('PUT Payload:', reqData);

        expect(response.status()).toBe(200);
        await expect(page.getByText(/Settings saved successfully!/)).toBeVisible();

        // 6. Verify the database values changed
        const dbSettings = await mongoose.connection.collection('settings').findOne({});
        console.log('DB Settings:', dbSettings);
        expect(dbSettings).toBeTruthy();
        expect(dbSettings?.baseDeliveryFee).toBe(randomFee);
        expect(dbSettings?.freeDeliveryThreshold).toBe(499);
        expect(dbSettings?.platformHandlingFee).toBe(2);

        // 7. Reload the page and confirm the persisted values are restored
        await page.reload();
        await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible();
        await expect(page.getByLabel(/Standard Delivery Fee/)).toHaveValue(randomFee.toString());
        await expect(page.getByLabel(/Free Delivery Order Minimum/)).toHaveValue('499');
        await expect(page.getByLabel(/Platform Handling Fee/)).toHaveValue('2');
        
        // 9. Confirm invalid values are rejected with UI errors
        await page.getByLabel(/Standard Delivery Fee/).fill('-5'); // invalid negative fee
        await page.getByRole('button', { name: 'Save System Parameters' }).click();
        
        await page.screenshot({ path: 'validation_error.png', fullPage: true });
        
        await expect(page.getByText('Standard Delivery Fee cannot be negative')).toBeVisible();
        
        await adminContext.close();
    });
});
