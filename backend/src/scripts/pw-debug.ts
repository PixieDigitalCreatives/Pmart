import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../modules/auth/auth.model';
import path from 'path';
import { chromium } from 'playwright';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is required.');
    process.exit(1);
  }
  
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SCRIPT_EXECUTION) {
    console.error('ERROR: To run this script in production, set ALLOW_PROD_SCRIPT_EXECUTION=true');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  
  const riders = await User.find({ role: UserRole.RIDER });
  if (riders.length === 0) {
    console.log('No riders found.');
    process.exit(0);
  }
  
  const rider = riders[0];
  const token = jwt.sign(
    { id: rider._id, role: rider.role, email: rider.email },
    process.env.JWT_SECRET || 'fallback_secret_for_local_testing_only',
    { expiresIn: '1d' }
  );

  console.log(`Generated token for rider ${rider.email}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));

  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`\n[Network Response] ${response.url()}: Status ${response.status()}`);
      try {
        const body = await response.text();
        console.log(`[Network Body]: ${body}`);
      } catch (e) {}
    }
  });

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`\n[Network Request] ${request.url()}`);
      console.log(`[Network Headers]:`, request.headers());
    }
  });

  // Inject token
  await page.goto('http://localhost:5173/');
  await page.evaluate(({token, user}) => {
    localStorage.setItem('pmart_auth_token', token);
    localStorage.setItem('pmart_user', JSON.stringify(user));
  }, { token, user: { id: rider._id, role: rider.role, email: rider.email, profileComplete: rider.profileComplete } });

  // Now navigate to rider profile
  console.log('\nNavigating to /rider/profile...');
  await page.goto('http://localhost:5173/rider/profile', { waitUntil: 'networkidle' });

  // Wait a moment for any fetch to complete
  await page.waitForTimeout(2000);

  // Check the page text
  const content = await page.content();
  if (content.includes('Failed to load profile details')) {
    console.log('\n[Result]: Page shows "Failed to load profile details"');
  } else {
    console.log('\n[Result]: Page does NOT show the error.');
  }

  await browser.close();
  process.exit(0);
}

run().catch(console.error);
