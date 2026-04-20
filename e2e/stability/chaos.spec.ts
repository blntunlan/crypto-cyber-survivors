import { test, expect } from '../test';
import { goToMainMenuFromHub } from '../support/game-helpers';

test.describe('Chaos Monkey Stability Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    // The 'errors' array was declared but never used. Removing it as per instruction.
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // If console errors need to be asserted later, the 'errors' array should be re-introduced
        // and its contents checked. For now, just logging the error.
        console.error(`Console error: ${msg.text()}`);
      }
    });

    // Mock user to skip intro and make market feed deterministic for this suite.
    await page.addInitScript(() => {
      type Listener = (event: Event) => void;
      type ListenerMap = Record<string, Listener[]>;

      const win = window as Window & { __chaosMarketPatched?: boolean };

      if (!win.__chaosMarketPatched) {
        const NativeWebSocket = window.WebSocket;

        const createMarketSocket = (rawUrl: string): WebSocket => {
          const listeners: ListenerMap = {
            open: [],
            message: [],
            close: [],
            error: [],
          };

          const pairMatch = /([A-Z]{3,5})USDT/i.exec(rawUrl);
          const pair = (pairMatch?.[1] ?? 'BTC').toUpperCase();
          const symbol = `${pair}USDT`;
          const basePriceByPair: Record<string, number> = {
            BTC: 50000,
            ETH: 3000,
            SOL: 150,
          };
          const basePrice = basePriceByPair[pair] ?? 1000;
          const isCoinbase = rawUrl.includes('coinbase');

          let tick = 0;
          let interval: number | null = null;

          const socket = {
            url: rawUrl,
            readyState: 0,
            onopen: null as ((event: Event) => void) | null,
            onmessage: null as ((event: MessageEvent) => void) | null,
            onclose: null as ((event: Event) => void) | null,
            onerror: null as ((event: Event) => void) | null,
            send: () => {
              // No-op for subscription messages in tests.
            },
            close: () => {
              if (interval !== null) {
                window.clearInterval(interval);
                interval = null;
              }
              if ((socket as any).readyState === 3) return;
              (socket as any).readyState = 3;
              const closeEvent =
                typeof CloseEvent === 'function'
                  ? new CloseEvent('close')
                  : new Event('close');
              emit('close', closeEvent);
            },
            addEventListener: (
              type: string,
              listener: EventListenerOrEventListenerObject
            ) => {
              const list = listeners[type];
              if (!list) return;
              const callback =
                typeof listener === 'function'
                  ? (listener as Listener)
                  : (event: Event) => listener.handleEvent(event);
              list.push(callback);
            },
            removeEventListener: (
              type: string,
              listener: EventListenerOrEventListenerObject
            ) => {
              const list = listeners[type];
              if (!list) return;
              const callback =
                typeof listener === 'function'
                  ? (listener as Listener)
                  : (event: Event) => listener.handleEvent(event);
              const idx = list.indexOf(callback);
              if (idx >= 0) list.splice(idx, 1);
            },
            dispatchEvent: (event: Event) => {
              emit(event.type, event);
              return true;
            },
          } as unknown as WebSocket & {
            onopen: ((event: Event) => void) | null;
            onmessage: ((event: MessageEvent) => void) | null;
            onclose: ((event: Event) => void) | null;
            onerror: ((event: Event) => void) | null;
          };

          const emit = (type: string, event: Event) => {
            const handler = socket[`on${type}` as keyof typeof socket] as
              | ((ev: Event) => void)
              | null;
            if (typeof handler === 'function') {
              handler(event);
            }
            const list = listeners[type];
            if (!list) return;
            for (const listener of list) {
              listener(event);
            }
          };

          window.setTimeout(() => {
            if ((socket as { readyState: number }).readyState !== 0) return;
            (socket as { readyState: number }).readyState = 1;
            emit('open', new Event('open'));

            interval = window.setInterval(() => {
              if ((socket as { readyState: number }).readyState !== 1) return;
              tick += 1;
              const drift = Math.sin(tick / 3) * 12;
              const price = Math.max(1, basePrice + drift);

              const payload = isCoinbase
                ? {
                    type: 'ticker',
                    product_id: `${pair}-USD`,
                    price: price.toFixed(2),
                  }
                : {
                    e: 'kline',
                    E: Date.now(),
                    s: symbol,
                    k: {
                      t: Date.now() - 1000,
                      T: Date.now(),
                      s: symbol,
                      i: '1s',
                      o: price.toFixed(2),
                      c: price.toFixed(2),
                      h: (price + 10).toFixed(2),
                      l: (price - 10).toFixed(2),
                      v: '123.45',
                      n: 1,
                      x: true,
                      q: '12345.67',
                    },
                  };

              emit(
                'message',
                new MessageEvent('message', { data: JSON.stringify(payload) })
              );
            }, 250);
          }, 50);

          return socket;
        };

        const PatchedWebSocket = function (
          url: string | URL,
          protocols?: string | string[]
        ): WebSocket {
          const rawUrl = String(url);
          const isMarketFeed =
            rawUrl.includes('binance') || rawUrl.includes('coinbase');
          if (isMarketFeed) {
            return createMarketSocket(rawUrl);
          }
          if (protocols !== undefined) {
            return new NativeWebSocket(url, protocols);
          }
          return new NativeWebSocket(url);
        } as unknown as typeof WebSocket;

        (PatchedWebSocket as any).CONNECTING = 0;
        (PatchedWebSocket as any).OPEN = 1;
        (PatchedWebSocket as any).CLOSING = 2;
        (PatchedWebSocket as any).CLOSED = 3;

        window.WebSocket = PatchedWebSocket;
        win.__chaosMarketPatched = true;
      }

      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'ChaosBot',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });

    await page.goto('/?no-sw=true');

    // Navigate to Main Menu if on Hub
    await goToMainMenuFromHub(page);
  });

  test('should survive random input spam in Main Menu', async ({ page }) => {
    // Wait for menu (LONG button is a good indicator of main menu)
    const longButton = page.getByRole('button', { name: /LONG/i }).first();
    await expect(longButton).toBeVisible({ timeout: 15000 });

    // Click random coordinates for 5 seconds
    const box = await page.evaluate(() => {
      return { w: window.innerWidth, h: window.innerHeight };
    });

    console.log('Starting random click spam...');
    const duration = 5000;
    const end = Date.now() + duration;

    while (Date.now() < end) {
      const x = Math.floor(Math.random() * box.w);
      const y = Math.floor(Math.random() * box.h);

      try {
        await page.mouse.click(x, y);
      } catch {
        // Ignore click errors (e.g. clicking on disabled elements)
      }

      // Small delay to be realistic-ish
      await page.waitForTimeout(50);
    }

    // Assert application is still alive and hasn't crashed
    // We check for either the start button, or the in-game HUD if a click started the game
    const anyStateIndicator = page
      .locator('text=/LONG|SHORT|PLAY|LEVEL|LVL|LV/i')
      .first();
    await expect(anyStateIndicator).toBeVisible();

    // Explicitly check for Error Boundary text
    await expect(page.locator('body')).not.toContainText(/Something went wrong/i);
  });

  test('should survive random key mashing during gameplay', async ({ page }) => {
    // Start game
    const longButton = page.getByRole('button', { name: /LONG/i }).first();
    await expect(longButton).toBeVisible({ timeout: 30000 });

    // Ensure enabled (price loaded)
    await expect(longButton).toBeEnabled({ timeout: 30000 });
    await longButton.click();

    // Verify game started
    await expect(page.locator('text=/ACTIVE/i').first()).toBeVisible({
      timeout: 15000,
    });

    console.log('Starting random key mash...');
    const keys = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      ' ',
      'Enter',
      'Escape',
      'w',
      'a',
      's',
      'd',
    ];

    const duration = 5000;
    const end = Date.now() + duration;

    while (Date.now() < end) {
      const key = keys[Math.floor(Math.random() * keys.length)] as string;
      await page.keyboard.press(key);
      await page.waitForTimeout(50);
    }

    // Assert game is still running (HUD visible)
    await expect(page.locator('text=/LV|LVL|LEVEL/i').first()).toBeVisible();
  });
});
