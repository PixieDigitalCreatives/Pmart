import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));

  // Listen to network
  page.on('response', async response => {
    if (response.url().includes('/rider/profile')) {
      console.log(`\n[Network] Response for ${response.url()}: Status ${response.status()}`);
      try {
        const body = await response.text();
        console.log(`[Network] Body: ${body}`);
      } catch (e) {
        console.log(`[Network] Could not read body`);
      }
    }
  });

  page.on('request', request => {
    if (request.url().includes('/rider/profile')) {
      console.log(`\n[Network] Request to ${request.url()}`);
      console.log(`[Network] Headers:`, request.headers());
    }
  });

  try {
    // Navigate to admin users page to get a rider's email to login (or just login if we know credentials)
    // Wait, PMart uses Firebase Auth with Google. I can't easily automate Google Login.
    // Instead, I'll inject the JWT directly into localStorage!
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173/');

    // Get the token from backend logic
    const token = 'YOUR_GENERATED_TOKEN'; // We'll inject this dynamically in a node script
    
  } catch (error) {
    console.error('Error during browser automation:', error);
  } finally {
    await browser.close();
  }
})();
