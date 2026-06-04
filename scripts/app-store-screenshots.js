// Capture by reloading + re-logging-in for each tab, so the CSS error from
// one screen doesn't poison the next. Slow but robust.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8082';
const OUT = path.join(__dirname, '..', 'screenshots', 'app-store');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TRAINER_TABS = ['Home', 'Clients', 'Schedule', 'Programs', 'Requests', 'Packages', 'Profile'];
const CLIENT_TABS  = ['Home', 'Discover', 'Bookings', 'Journal', 'Profile'];

function newCtx(browser) {
  return browser.newContext({
    viewport: { width: 1032, height: 1376 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });
}

async function loginDemo(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(7000);
  await page.click('text=App Review demo sign-in', { timeout: 8000 }).catch(() => {});
  await sleep(14000);
}

async function loginPassword(page, email, password) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(7000);
  await page.fill('input[placeholder="you@example.com"]', email).catch(() => {});
  await page.fill('input[placeholder="Password"]', password).catch(() => {});
  await sleep(400);
  await page.click('text=Sign in', { timeout: 8000 }).catch(() => {});
  await sleep(14000);
}

async function captureViaTab(browser, loginFn, tabLabel, outName) {
  const ctx = await newCtx(browser);
  const page = await ctx.newPage();
  try {
    await loginFn(page);
    if (tabLabel !== 'Home') {
      await page.click(`text=${tabLabel}`, { timeout: 6000 }).catch((e) => console.log('    tab miss', tabLabel, e.message.split('\n')[0]));
      await sleep(7000);
    }
    // Suppress CSS error overlay if present (just screenshot what loaded before the error)
    await page.screenshot({ path: path.join(OUT, outName + '.png') });
    console.log('  ✓', outName);
  } finally {
    await ctx.close();
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox', '--ignore-certificate-errors'] });

  console.log('TRAINER:');
  for (let i = 0; i < TRAINER_TABS.length; i++) {
    const t = TRAINER_TABS[i];
    const name = `trainer-${String(i + 1).padStart(2, '0')}-${t.toLowerCase()}`;
    await captureViaTab(browser, loginDemo, t, name);
  }

  console.log('CLIENT:');
  for (let i = 0; i < CLIENT_TABS.length; i++) {
    const t = CLIENT_TABS[i];
    const name = `client-${String(i + 1).padStart(2, '0')}-${t.toLowerCase()}`;
    await captureViaTab(
      browser,
      (p) => loginPassword(p, 'client-demo@trainerhub.local', 'ClientDemo!2026'),
      t,
      name,
    );
  }

  await browser.close();
  console.log('done →', OUT);
})();
