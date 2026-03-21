import { test, expect } from '@playwright/test';

test('landing surfaces technology and team transparency blocks @smoke', async ({
  page,
}) => {
  await page.goto('/?no-sw=true');
  await page.evaluate(() => {
    localStorage.setItem('disable_sw', 'true');
    localStorage.removeItem('has_seen_landing');
  });
  await page.reload();

  const topNav = page.locator('nav').first();
  const desktopNav = topNav.locator('div.hidden.lg\\:flex');
  const navTexts = await desktopNav.locator('a,button').allTextContents();
  const hasNumericPrefix = navTexts.some(text => /^\s*\d+\./.test(text.trim()));
  expect(hasNumericPrefix).toBe(false);
  expect(navTexts.some(text => /TEAM/i.test(text))).toBe(true);
  await topNav.screenshot({ path: 'output/startup-audit-nav.png' });

  await expect(page.getByText('Technology / How It Works')).toBeVisible();
  await expect(
    page.getByText('C-SYNC Protocol', { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText('Real-Time WebSocket Fabric', { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText('Neural AI Director', { exact: true }).first()
  ).toBeVisible();
  const technologySection = page.locator('#dev');
  await technologySection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await technologySection.screenshot({ path: 'output/startup-audit-technology.png' });

  const teamSection = page.locator('#team');
  await teamSection.scrollIntoViewIfNeeded();
  await expect(page.getByText('PEOPLE BEHIND THE ENGINE')).toBeVisible();
  await expect(page.getByText('Bulent Unalan')).toBeVisible();
  await expect(page.getByText('Lead Architect & Founder')).toBeVisible();
  await expect(page.getByText('Core Contributors')).toBeVisible();
  await expect(
    page.getByText('maintain Crypto Survivors in their LinkedIn Experience records')
  ).toBeVisible();

  await page.waitForTimeout(900);
  await teamSection.screenshot({ path: 'output/startup-audit-team.png' });
});
