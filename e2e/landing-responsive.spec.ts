import { expect, test, type Page } from './test';

const visitLanding = async (page: Page): Promise<void> => {
  await page.goto('/?no-sw=true');
  await page.evaluate(() => {
    localStorage.setItem('disable_sw', 'true');
    localStorage.removeItem('has_seen_landing');
  });
  await page.reload();
  await expect(page.getByRole('button', { name: /start survival/i })).toBeVisible();
};

test.describe('landing responsive controls', () => {
  test('uses non-overlapping navigation at 1024px', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Targets the Chromium desktop breakpoint.'
    );

    await page.setViewportSize({ width: 1024, height: 768 });
    await visitLanding(page);

    const docsButton = page.locator('#docs-nav-link');
    const playButton = page
      .locator('nav#top > button')
      .filter({ hasText: 'PLAY THE BETA' });
    const openMenu = page.getByRole('button', { name: 'Open menu' });

    const [docsVisible, playVisible] = await Promise.all([
      docsButton.isVisible(),
      playButton.isVisible(),
    ]);

    if (!docsVisible && !playVisible) {
      await expect(openMenu).toBeVisible();
      await openMenu.click();
      await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
      return;
    }

    expect(docsVisible).toBe(true);
    expect(playVisible).toBe(true);

    const [docsBox, playBox] = await Promise.all([
      docsButton.boundingBox(),
      playButton.boundingBox(),
    ]);

    expect(docsBox).not.toBeNull();
    expect(playBox).not.toBeNull();
    expect((docsBox?.x ?? 0) + (docsBox?.width ?? 0)).toBeLessThanOrEqual(
      playBox?.x ?? 0
    );
  });

  test('shows Back to Top after scrolling the landing surface', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Targets the Chromium desktop breakpoint.'
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await visitLanding(page);

    const landingSurface = page.locator('[data-runtime-gameplay-active]');
    await landingSurface.evaluate(element => {
      element.scrollTop = element.scrollHeight;
    });

    const backToTop = page.getByTitle('Back to Top');
    await expect(backToTop).toBeVisible();
    await backToTop.click();

    await expect
      .poll(() => landingSurface.evaluate(element => element.scrollTop))
      .toBeLessThanOrEqual(1);
  });
});
