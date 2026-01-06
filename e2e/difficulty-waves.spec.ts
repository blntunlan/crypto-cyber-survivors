import { test, expect } from '@playwright/test';

test.describe('Difficulty & Wave Phases', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
    });

    // Set localStorage to skip nickname entry and start with a known state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          playerId: 'e2e-tester',
          nickname: 'WaveTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();
  });

  test('should transition through wave phases', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /LONG/i }).click();

    // Specific locator for the wave phase text
    const phaseValue = page.locator('span.font-black.uppercase.italic').first();

    // Initial check
    await expect(phaseValue).toHaveText(/warmup/i);

    // Jump to buildup (45s+)
    console.log('Jumping to 50s (buildup)...');
    await page.evaluate(() => window.gameDebug.timeJump(50));
    await expect(phaseValue).toHaveText(/buildup/i);

    // Jump to breather (105s buildup + 30s firstPeak = 135s+)
    console.log('Jumping to 150s (breather)...');
    await page.evaluate(() => window.gameDebug.timeJump(150));
    await expect(phaseValue).toHaveText(/breather/i);

    // Jump to climax (240s+)
    console.log('Jumping to 250s (climax)...');
    await page.evaluate(() => window.gameDebug.timeJump(250));
    await expect(phaseValue).toHaveText(/climax/i);

    // Jump to resolution (285s+)
    console.log('Jumping to 290s (resolution)...');
    await page.evaluate(() => window.gameDebug.timeJump(290));
    await expect(phaseValue).toHaveText(/resolution/i);

    // Jump to next cycle warmup (305s+)
    console.log('Jumping to 310s (next cycle warmup)...');
    await page.evaluate(() => window.gameDebug.timeJump(310));
    await expect(phaseValue).toHaveText(/warmup/i);
  });

  test('should show correct color for different phases', async ({ page }) => {
    await page.getByRole('button', { name: /LONG/i }).click();

    const phaseValue = page.locator('span.font-black.uppercase.italic');

    // Warmup should be cyan (text-cyan-400)
    await expect(phaseValue).toHaveClass(/text-cyan-400/);

    // Climax should be red (text-red-500)
    await page.evaluate(() => window.gameDebug.timeJump(241));
    await expect(phaseValue).toHaveClass(/text-red-500/);
  });
});
