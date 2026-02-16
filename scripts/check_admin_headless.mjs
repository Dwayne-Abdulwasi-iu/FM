import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
    // wait for a known element in the admin dashboard
    await page.waitForSelector('h1', { timeout: 5000 }).catch(() => {});

    const paths = [
      '/admin/audit-logs',
      '/admin/featured-items',
      '/admin/warehouse-inventory',
      '/admin/shipping',
      '/admin/payments',
      '/admin/security',
      '/admin/seller-badges',
      '/admin/subscriptions'
    ];

    const results = {};
    for (const p of paths) {
      const found = await page.evaluate((href) => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.some(a => a.getAttribute('href') === href || a.href.endsWith(href));
      }, p);
      results[p] = found;
    }

    console.log('HEADLESS_CHECK_RESULTS');
    for (const [k, v] of Object.entries(results)) {
      console.log(`${k} : ${v ? 'FOUND' : 'NOT_FOUND'}`);
    }
  } catch (err) {
    console.error('ERROR_RUNNING_HEADLESS_CHECK', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
