import { test, expect } from './test';

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
  const navTexts = await topNav.locator('a,button').allTextContents();
  const hasNumericPrefix = navTexts.some(text => /^\s*\d+\./.test(text.trim()));
  expect(hasNumericPrefix).toBe(false);
  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth >= 1024) {
    await expect(topNav.getByRole('link', { name: /^TEAM$/i })).toBeVisible();
  } else {
    const openMenu = topNav.getByRole('button', { name: /^Open menu$/i });
    await expect(openMenu).toBeVisible();
    await openMenu.click();

    const mobileMenu = page.getByRole('navigation').filter({
      has: page.getByRole('button', { name: /^Close menu$/i }),
    });
    await expect(mobileMenu.getByRole('link', { name: /^TEAM$/i })).toBeVisible();
    const mobileNavTexts = await mobileMenu.locator('a,button').allTextContents();
    const mobileHasNumericPrefix = mobileNavTexts.some(text =>
      /^\s*\d+\./.test(text.trim())
    );
    expect(mobileHasNumericPrefix).toBe(false);

    await mobileMenu.getByRole('button', { name: /^Close menu$/i }).click();
    await expect(mobileMenu).toBeHidden();
  }
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
  await expect(page.getByText('ONE DEVELOPER, FULL STACK')).toBeVisible();
  await expect(page.getByText('Bulent Unalan')).toBeVisible();
  await expect(page.getByText('Solo Developer & Founder')).toBeVisible();
  await expect(page.getByText('Engine & Gameplay')).toBeVisible();
  await expect(page.getByText('@blntunlan on GitHub')).toBeVisible();

  await page.waitForTimeout(900);
  await teamSection.screenshot({ path: 'output/startup-audit-team.png' });
});
