const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async ()=> {
  try {
    const profileDir = process.env.PLAYWRIGHT_USER_DATA_DIR || path.join(os.tmpdir(), 'pw_playwright_profile');
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
    console.log('Using Playwright profile dir:', profileDir);

    const context = await chromium.launchPersistentContext(profileDir, { headless: false });
    const page = context.pages()[0] || await context.newPage();
    console.log('Opening sign-in page at http://localhost:3000/api/auth/signin ...');
    await page.goto('http://localhost:3000/api/auth/signin');
    console.log('Browser opened. Please sign in manually in the opened window. When finished, close the browser window to continue.');

    // Wait until the browser context is closed
    await new Promise((resolve) => context.on('close', resolve));
    console.log('Browser closed, exiting script.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to launch Playwright persistent context:', err);
    process.exit(1);
  }
})();
