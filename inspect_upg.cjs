const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'C:\\Users\\bulen\\AppData\\Local\\Temp\\opencode';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  await page.goto('http://localhost:3000/?no-sw=true', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(2000);
  await page
    .locator('button:has-text("START SURVIVAL")')
    .first()
    .click({ timeout: 8000 });
  await page.waitForTimeout(2000);
  await page.locator('input').first().fill('TestPlayer', { timeout: 5000 });
  await page.waitForTimeout(300);
  await page
    .locator('button:has-text("Enter the Arena")')
    .first()
    .click({ timeout: 8000 });
  await page.waitForTimeout(2500);
  try {
    await page
      .locator('button:has-text("SKIP TUTORIAL"), button:has-text("Skip Tutorial")')
      .first()
      .click({ timeout: 4000 });
    await page.waitForTimeout(1500);
  } catch {}
  await page.locator('button:has-text("Start Game")').first().click({ timeout: 8000 });
  await page.waitForTimeout(2500);
  fs.writeFileSync(
    path.join(OUT, 'menu_buttons2.txt'),
    JSON.stringify(await page.locator('button').allTextContents()),
    'utf-8'
  );

  // Open upgrades
  try {
    await page
      .getByRole('button', { name: /^Upgrades$/i })
      .first()
      .click({ timeout: 6000 });
  } catch (e) {
    fs.writeFileSync(path.join(OUT, 'upg_open_err.txt'), e.message, 'utf-8');
    // fallback: try contains
    await page.locator('button:has-text("Upgrades")').first().click({ timeout: 6000 });
  }
  await page.waitForTimeout(2500);
  fs.writeFileSync(
    path.join(OUT, 'upgrades_rendered.txt'),
    await page.innerText('body'),
    'utf-8'
  );
  // also dump the overlay panel HTML structure (classes) to spot layout issues
  const html = await page.evaluate(() => {
    const panels = document.querySelectorAll(
      '[class*="ThemedPanel"], [class*="overlay"], [class*="fixed"]'
    );
    return Array.from(panels)
      .slice(0, 10)
      .map(el => el.className)
      .join('\n');
  });
  fs.writeFileSync(path.join(OUT, 'upgrades_classes.txt'), html, 'utf-8');

  fs.writeFileSync(path.join(OUT, 'console2.txt'), logs.join('\n'), 'utf-8');
  await browser.close();
  console.log('DONE');
})();
