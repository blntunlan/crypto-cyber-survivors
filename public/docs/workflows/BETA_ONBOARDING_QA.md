# Beta Onboarding QA

> **Status** live
> Owner: Product, QA, Frontend, Backend

Bu belge beta açılışı öncesi ilk kullanıcı akışındaki sürtünme noktalarını ve test kanıtlarını sabitler. Kapsam nickname validation, Railway anonymous auth handoff, returning user recovery, position selection, market connecting state ve tutorial persistence davranışıdır.

## Acceptance Matrix

| Flow | Acceptance | Evidence |
|---|---|---|
| Nickname validation | Invalid nickname error verir; valid nickname login çağırır ve onboarding tamamlanır | `tests/screens/NicknameEntryScreen.test.tsx`, `tests/auth/NicknameValidator.test.ts`, `tests/services/auth/NicknameValidator.test.ts` |
| Auth handoff | New nickname Railway anonymous auth ile profil oluşturur; conflict kullanıcıya hata döner; local session kaydı korunur | `tests/services/auth/UserSessionService.test.ts`, `tests/services/auth/RailwayAuthService.test.ts` |
| Returning user | Stored user/corrupt storage recovery hub’a döner ve wallet refresh kırılmaz | `tests/components/GameAppShell.wallet.test.tsx`, `e2e/beta-smoke.spec.ts` |
| Market connecting state | Price `0` iken start butonları disable olur ve connecting state görünür | `tests/screens/MainMenu.test.tsx` |
| Position selection | LONG/SHORT mouse ve keyboard navigation ile doğru `onStart(position, leverage)` çağırır | `tests/screens/MainMenu.test.tsx` |
| Game start handoff | Hub → Play → LONG → `GameSessionService.startSession` → gameplay transition çalışır | `tests/integration/GameStartFlow.test.tsx` |
| First-run tutorial | Fresh user tutorial’ı tamamlayabilir veya skip edebilir; skip persistence reload sonrası korunur | `e2e/tutorial-flow.spec.ts` |

## Test Commands

```terminal
npx vitest run tests/auth/NicknameValidator.test.ts tests/services/auth/NicknameValidator.test.ts tests/screens/NicknameEntryScreen.test.tsx tests/services/auth/UserSessionService.test.ts tests/services/auth/RailwayAuthService.test.ts tests/screens/MainMenu.test.tsx tests/integration/GameStartFlow.test.tsx tests/components/GameAppShell.wallet.test.tsx
```

```terminal
PLAYWRIGHT_CHROME_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe" npx playwright test e2e/tutorial-flow.spec.ts --project=chromium
```

## Beta Notes

- Playwright Chromium tutorial flow validates browser-visible first-run UX, but does not replace mobile real-device sign-off.
- Returning user wallet visibility is covered by beta smoke and wallet shell tests.
- Market connecting state is a UI guardrail; actual market disconnect recovery is covered by the beta smoke reconnect scenario and [Beta SSE Market Contract](/docs/workflows/BETA_SSE_MARKET_CONTRACT).
- Nickname and auth tests use mocked Railway responses; beta environment auth sign-off remains part of Railway environment validation.

## Beta Acceptance

- Nickname entry has client validation and backend/auth failure messaging.
- Anonymous auth handoff persists user identity locally.
- Returning users can reach hub and play menu without re-entering nickname.
- Position selection works for LONG and SHORT with keyboard support.
- Market connecting state blocks starting a run without price data.
- Tutorial can be completed or skipped, and skip persists after reload.
