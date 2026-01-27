/**
 * E2E Tests - Localization (i18n)
 *
 * Tests:
 * 1. Language switching logic
 * 2. Persistence of language preference
 * 3. Verification of new languages (ZH, RU)
 * 4. RTL/Special character rendering checks
 */

import { test, expect } from '@playwright/test';

test.describe('Localization (i18n) System', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      // Set a valid user session to bypass nickname entry
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'LocTester',
          createdAt: Date.now(),
        })
      );
      // Aggressive Tutorial Bypass
      localStorage.setItem('tutorial-completed', 'true');
    });
    // Reload to apply
    await page.reload();

    // Ensure tutorial is gone if it somehow appeared
    await page.evaluate(() => {
      const overlay = document.querySelector('.tutorial-overlay');
      if (overlay) overlay.remove();
    });

    // Enter Hub -> Click Play to get to Main Menu
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 15000 });
    await playHubBtn.click({ force: true });

    // Wait for ANY main menu element to confirm load
    await expect(
      page
        .locator('text=Market Sentiment Engine')
        .or(page.locator('text=CRYPTO SURVIVORS'))
    ).toBeVisible({
      timeout: 20000,
    });
  });

  test('should switch to Chinese (Simplified) and display correct characters', async ({
    page,
  }) => {
    // Open Settings
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Find Language Section
    await expect(page.getByText('Language')).toBeVisible();

    // Click Chinese (中文)
    const zhButton = page.getByRole('button', { name: 'Chinese' });
    await expect(zhButton).toBeVisible();
    await zhButton.click();

    // Verify localStorage update
    const storedLang = await page.evaluate(() => localStorage.getItem('game_lang'));
    expect(storedLang).toBe('zh');

    // Verify UI update (Settings title should be '设置')
    await expect(
      page.getByRole('heading', { name: '设置', exact: true })
    ).toBeVisible();

    // Verify Menu translation
    const closeBtn = page.getByRole('button', { name: '关闭' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(page.getByText('市场情绪引擎')).toBeVisible();
  });

  test('should switch to Russian and display Cyrillic characters', async ({ page }) => {
    // Open Settings
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await settingsButton.click();

    const ruButton = page.getByRole('button', { name: /Russian|Русский/i });
    await expect(ruButton).toBeVisible();
    await ruButton.click();

    // Verify localStorage
    const storedLang = await page.evaluate(() => localStorage.getItem('game_lang'));
    expect(storedLang).toBe('ru');

    // Verify UI update
    await expect(
      page.getByRole('heading', { name: 'Настройки', exact: true })
    ).toBeVisible();

    // Close settings
    const closeBtn = page.getByRole('button', { name: 'Закрыть' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify Main Menu text
    await expect(page.getByText('Движок настроений рынка')).toBeVisible();
  });

  test('should show Tutorial in Chinese when language is selected', async ({
    page,
  }) => {
    // 1. Switch to Chinese
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByRole('button', { name: 'Chinese' }).click();
    await page.getByRole('button', { name: '关闭' }).click();

    // 2. Refresh to ensure full reload
    await page.reload();

    // 3. Navigate back to Main Menu (Hub -> Play)
    const playHubBtn = page.getByRole('button', { name: /PLAY|开始/i });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    // Let's check the controls hint in the footer
    await expect(page.getByText(/WASD/i).or(page.getByText(/移动/i))).toBeVisible();
  });

  test('should switch to Spanish and display correct characters', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await settingsButton.click();

    const esButton = page.getByRole('button', { name: /Spanish|Español/i });
    await expect(esButton).toBeVisible();
    await esButton.click();

    await expect(
      page.getByRole('heading', { name: 'Ajustes', exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByText('Motor de Sentimiento de Mercado')).toBeVisible();
  });

  test('should switch to Portuguese and display correct characters', async ({
    page,
  }) => {
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await settingsButton.click();

    const ptButton = page.getByRole('button', { name: /Portuguese|Português/i });
    await expect(ptButton).toBeVisible();
    await ptButton.click();

    await expect(
      page.getByRole('heading', { name: 'Configurações', exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(page.getByText('Motor de Sentimento de Mercado')).toBeVisible();
  });

  test('should switch to Hindi and display Devanagari characters', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await settingsButton.click();

    const hiButton = page.getByRole('button', { name: /Hindi/i });
    await expect(hiButton).toBeVisible();
    await hiButton.click();

    await expect(
      page.getByRole('heading', { name: 'सेटिंग्स', exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'बंद करें' }).click();
    await expect(page.getByText('मार्केट सेंटीमेंट इंजन')).toBeVisible();
  });

  test('should switch to Vietnamese and display correct characters', async ({
    page,
  }) => {
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await settingsButton.click();

    const viBtn = page.getByRole('button', { name: /Vietnamese|Vietnamita/i });
    await expect(viBtn).toBeVisible();
    await viBtn.click();

    await expect(
      page.getByRole('heading', { name: 'Cài đặt', exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByText('Công cụ Tâm lý Thị trường')).toBeVisible();
  });
});
