const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  console.log('Base URL:', base);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    const location = msg.location ? `${msg.location.url}:${msg.location.lineNumber || 0}` : '';
    const entry = { source: 'console', type, text, location, timestamp: new Date().toISOString() };
    logs.push(entry);
    console.log('[console]', type, text, location);
  });

  page.on('pageerror', err => {
    const entry = { source: 'pageerror', message: err.message, stack: err.stack, timestamp: new Date().toISOString() };
    logs.push(entry);
    console.error('[pageerror]', err.message);
  });

  page.on('requestfailed', req => {
    const entry = { source: 'requestfailed', url: req.url(), method: req.method(), timestamp: new Date().toISOString() };
    logs.push(entry);
    console.warn('[requestfailed]', req.method(), req.url());
  });

  try {
    // try to fetch designs list to pick an id
    const apiUrl = `${base}/api/designs`;
    console.log('Fetching designs list from', apiUrl);
    let res = await page.goto(apiUrl, { waitUntil: 'networkidle2', timeout: 10000 }).catch(e => null);
    let designs = null;
    if (res && res.ok()) {
      const body = await res.text();
      try { designs = JSON.parse(body); } catch (e) { designs = null }
    }

    let targetPath = '/';
    if (designs && Array.isArray(designs)) {
      if (designs.length > 0 && designs[0].id) {
        targetPath = `/designs/${designs[0].id}`;
      }
    } else {
      // fallback: try to hit /designs and pick first link
      await page.goto(base + '/designs', { waitUntil: 'networkidle2' });
      const href = await page.evaluate(() => {
        const a = document.querySelector('a[href^="/designs/"]');
        return a ? a.getAttribute('href') : null;
      });
      if (href) targetPath = href;
    }

    console.log('Target path to open:', targetPath);
    await page.goto(base + targetPath, { waitUntil: 'networkidle2', timeout: 20000 });

    // wait for a bit to capture logs
    await page.waitForTimeout(5000);

    // capture network response for the design API
    try {
      const apiResp = await page.evaluate(() => {
        return window.__LAST_API_RESPONSE__ || null;
      });
      if (apiResp) console.log('Captured __LAST_API_RESPONSE__ from page');
    } catch (e) {}

    // dump collected logs to file
    const out = { capturedAt: new Date().toISOString(), base, targetPath, logs };
    const outPath = 'headless-capture-output.json';
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('Wrote logs to', outPath);
  } catch (err) {
    console.error('Headless capture failed:', err);
  } finally {
    await browser.close();
  }
})();
