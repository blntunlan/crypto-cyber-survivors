import { test, expect } from './test';
import { type Page } from '@playwright/test';

const LANDING_BTC_PRICE_PATTERN = /^(SYNCING|\$\d{1,3}(,\d{3})*\.\d{2})$/;

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(
    viewport?.width ?? metrics.innerWidth
  );
};

const expectElementInsideViewport = async (
  page: Page,
  locator: ReturnType<Page['locator']>
): Promise<void> => {
  const viewport = page.viewportSize();
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
};

const installMarketStreamRecorder = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    class MockEventSource {
      public onopen: ((event: Event) => void) | null = null;
      public onmessage: ((event: MessageEvent) => void) | null = null;
      public onerror: ((event: Event) => void) | null = null;

      constructor(url: string) {
        const store = window as unknown as { __marketStreamUrls?: string[] };
        store.__marketStreamUrls = [...(store.__marketStreamUrls ?? []), url];
        window.setTimeout(() => {
          this.onerror?.(new Event('error'));
        }, 0);
      }

      close(): void {}
    }

    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      value: MockEventSource,
    });
  });
};

test('landing surfaces technology and team transparency blocks @smoke', async ({
  page,
}) => {
  await page.goto('/?no-sw=true');
  await page.evaluate(() => {
    localStorage.setItem('disable_sw', 'true');
    localStorage.removeItem('has_seen_landing');
  });
  await page.reload();

  const startButton = page.getByRole('button', { name: /START SURVIVAL/i });
  await expect(startButton).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const priceFeed = page.locator('.landing-price-feed');
  await expect(priceFeed).toHaveCount(1);
  await page.evaluate(() => {
    document.querySelector('.landing-price-feed')?.scrollIntoView({
      block: 'center',
    });
  });
  await expect(priceFeed).toBeVisible();
  await expectElementInsideViewport(page, priceFeed);
  await expectNoHorizontalOverflow(page);
  await expect(page.locator('.landing-depth-field')).toHaveCount(1);
  await expect(page.locator('.landing-candle-ribbon')).toHaveCount(1);
  await expect(page.locator('.landing-arena-map')).toHaveCount(0);
  await expect(page.getByText('BTC COMPRESSION ZONE', { exact: true })).toHaveCount(0);
  await expect(page.locator('.landing-rotate-circle')).toHaveCount(0);
  await expect(page.getByText('BTC/USD LIVE FEED', { exact: true })).toBeVisible();
  await expect(
    page.getByText('MARKET PRESSURE FORECAST', { exact: true })
  ).toBeVisible();
  const btcPrice = page.getByTestId('landing-btc-price');
  await expect(btcPrice).toBeVisible();
  await expect(btcPrice).toHaveText(LANDING_BTC_PRICE_PATTERN);
  await expect(page.locator('.landing-forecast-bias')).toBeVisible();
  await expect(page.getByTestId('landing-feed-status')).toHaveText(
    /LIVE|SYNCING|CACHED/
  );
  await expect(page.getByText('DEMO', { exact: true })).toHaveCount(0);
  await expect(
    page.locator(
      '.landing-blob-gold, .landing-blob-red, .landing-sweep-gold, .landing-sweep-red'
    )
  ).toHaveCount(0);
  await expect(page.locator('.landing-red-radial')).toHaveCount(1);

  const topNav = page.locator('nav').first();
  const navTexts = await topNav.locator('a,button').allTextContents();
  const hasNumericPrefix = navTexts.some(text => /^\s*\d+\./.test(text.trim()));
  expect(hasNumericPrefix).toBe(false);
  const viewportWidth = page.viewportSize()?.width ?? 0;
  await expect(page.getByTitle('Back to Top')).toBeHidden();
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

  await expect(page.getByText('Engine Notes', { exact: true })).toBeVisible();
  await expect(page.getByText('Engineering Manifesto')).toHaveCount(0);
  await expect(page.getByText('60 FPS', { exact: true })).toBeVisible();
  await expect(page.getByText('Live Market Rules', { exact: true })).toBeVisible();

  await expect(page.getByText('Typed EventBus', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Live Price Feed', { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText('Unified Difficulty Director', { exact: true }).first()
  ).toBeVisible();
  const technologySection = page.locator('#dev');
  await technologySection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await technologySection.screenshot({ path: 'output/startup-audit-technology.png' });

  await expect(page.getByText('Live now', { exact: true })).toBeVisible();
  await expect(page.getByText('Q2 2026', { exact: true })).toHaveCount(0);

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

test('landing does not present unavailable market data as demo', async ({ page }) => {
  await installMarketStreamRecorder(page);
  await page.goto('/?no-sw=true');
  await page.evaluate(() => {
    localStorage.setItem('disable_sw', 'true');
    localStorage.removeItem('has_seen_landing');
  });
  await page.reload();

  await expect(page.locator('.landing-price-feed')).toBeVisible();
  await page.waitForTimeout(2200);

  await expect(page.getByText('DEMO', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('landing-feed-status')).toHaveText(
    /LIVE|SYNCING|CACHED/
  );
  await expect(page.getByTestId('landing-btc-price')).toHaveText(
    LANDING_BTC_PRICE_PATTERN
  );
});

test('landing market stream uses configured aggregator endpoint', async ({ page }) => {
  await installMarketStreamRecorder(page);
  await page.goto('/?no-sw=true');
  await page.evaluate(() => {
    localStorage.setItem('disable_sw', 'true');
    localStorage.removeItem('has_seen_landing');
  });
  await page.reload();

  await expect(page.locator('.landing-price-feed')).toBeVisible();
  const streamUrls = await page.evaluate(
    () =>
      (window as unknown as { __marketStreamUrls?: string[] }).__marketStreamUrls ?? []
  );
  const streamPaths = streamUrls.map(url => {
    const streamUrl = new URL(url, page.url());
    return `${streamUrl.pathname}${streamUrl.search}`;
  });

  expect(streamPaths).toContain('/api/v1/market/stream?pair=BTC');
  expect(streamPaths.every(path => path === '/api/v1/market/stream?pair=BTC')).toBe(
    true
  );
});
