# Cash-Out And Greed Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paused cycle decision with a live 15-second server-signed cash-out offer and feed authoritative monotonic Greed into the difficulty runtime on the next simulation tick.

**Architecture:** Railway owns quote eligibility, expiry, settlement, and Greed. The React flow controller opens an offer only after a signed server response, keeps `GameStatus.PLAYING`, and emits a typed committed-decision event after reject or timeout. `DifficultyEventBridge` records that event in `DifficultyInputInbox`, and `DifficultyRuntime` applies the committed Greed value at the next tick boundary without a new singleton.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Express, Zod, PostgreSQL.

## Global Constraints

- Gameplay remains active while the offer is visible; never transition to `GameStatus.CYCLE_COMPLETE` for a cash-out offer.
- Quotes are server-signed before display and expire after exactly 15 wall-clock seconds.
- Reject and timeout increment server Greed by exactly one; Greed never decreases during an active run.
- Reject and timeout do not reset difficulty, combo state, cycle state, or player health.
- Accept ends the run only after idempotent server settlement succeeds.
- Quote request or settlement failure leaves the run active and never fabricates a client reward.
- The quote endpoint must not accept client-declared pacing as an economic authority input.
- Difficulty input changes become visible at the next simulation tick, never mid-tick.
- No new singleton is introduced.
- No `useState` or allocations are added to the gameplay RAF path.
- Do not commit changes unless the user explicitly requests a commit.

---

## File Structure

- `railway-market-server/src/services/economy/CashOutPolicy.ts`: Server-owned eligibility and 15-second offer policy.
- `railway-market-server/src/services/economy/AuthoritativeQuoteService.ts`: Signed quote construction from canonical server inputs.
- `railway-market-server/src/db/validation.ts`: Strict quote and decision request schemas.
- `railway-market-server/src/routes/economy.ts`: Escrow, quote reuse, expiry, settlement, Greed, and response payloads.
- `services/auth/GameSessionService.ts`: Typed frontend transport for quote and decision calls.
- `types/events.ts`: Authoritative cash-out decision event contract.
- `types/gameMode.ts`: Live cash-out offer presentation model.
- `services/difficulty/runtime/contracts.ts`: Greed-bearing runtime input view.
- `services/difficulty/runtime/DifficultyInputInbox.ts`: Next-tick Greed coalescing and stale-event rejection.
- `services/difficulty/runtime/DifficultyEventBridge.ts`: EventBus-to-inbox Greed bridge.
- `services/difficulty/runtime/DifficultyRuntime.ts`: Current-authority boundary input synchronization.
- `services/director/DirectorSpawnOrchestrator.ts`: Greed changes bypass the regular Director cadence.
- `services/director/ExperienceDirector.ts`: Greed changes invalidate the cached Director snapshot.
- `services/gameplay/phases/DifficultyPhase.ts`: Removes the local hardcoded Greed authority.
- `hooks/useGameFlowController.ts`: Live offer lifecycle and accept/reject/timeout orchestration.
- `components/screens/CycleCompleteScreen.tsx`: Server-valued, wall-clock offer presentation.
- `components/GameScreenRouter.tsx`: Renders the offer over active gameplay.
- `components/GameAppShell.tsx`: Threads the renamed offer state and reject callback.

### Task 1: Make Quote Eligibility Server-Owned

**Files:**
- Modify: `railway-market-server/src/services/economy/CashOutPolicy.ts`
- Modify: `railway-market-server/src/services/economy/AuthoritativeQuoteService.ts`
- Modify: `railway-market-server/src/db/validation.ts`
- Modify: `railway-market-server/src/routes/economy.ts`
- Test: `railway-market-server/tests/services/CashOutPolicy.test.ts`
- Test: `railway-market-server/tests/services/AuthoritativeQuoteService.test.ts`
- Test: `railway-market-server/tests/db/validation.test.ts`
- Test: `railway-market-server/tests/routes/cashOutQuote.test.ts`

**Interfaces:**
- Consumes: Persisted session start, canonical price timestamp, escrow `greed_level`, and last quote `responded_at`.
- Produces: `cashOutQuoteSchema` accepting only `{ session_id: string }`; `CashOutPolicy.evaluate(input)` without `pacingState`; quote responses containing `greedLevel: number`.

- [ ] **Step 1: Write failing policy and validation tests**

```ts
it('does not require client pacing to issue an eligible fresh quote', () => {
  const result = new CashOutPolicy().evaluate({
    elapsedSeconds: 300,
    lastDecisionAtSeconds: null,
    greedLevel: 0,
    marketStaleSeconds: 0,
  });

  expect(result.canIssueQuote).toBe(true);
  expect(result.quoteTtlSeconds).toBe(15);
});

it('rejects client pacing fields from the strict quote schema', () => {
  expect(
    cashOutQuoteSchema.safeParse({
      session_id: '11111111-1111-4111-8111-111111111111',
      pacing_state: 'RECOVERY',
    }).success
  ).toBe(false);
});
```

- [ ] **Step 2: Run the policy and validation tests to verify RED**

Run: `npx vitest run railway-market-server/tests/services/CashOutPolicy.test.ts railway-market-server/tests/services/AuthoritativeQuoteService.test.ts railway-market-server/tests/db/validation.test.ts`

Expected: FAIL because `pacingState` is required and `cashOutQuoteSchema` accepts the client field.

- [ ] **Step 3: Remove pacing from the economic policy input**

```ts
export type CashOutPolicyInput = {
  elapsedSeconds: number;
  lastDecisionAtSeconds: number | null;
  greedLevel: number;
  marketStaleSeconds: number;
};

return {
  canIssueQuote: eligibilityDue && marketIsFresh,
  shouldForceRecovery:
    eligibilityDue &&
    elapsedSinceDecision >= nextEligibilitySeconds + RECOVERY_GRACE_SECONDS &&
    marketIsFresh,
  safeExitAvailable,
  nextEligibilitySeconds,
  quoteTtlSeconds: QUOTE_TTL_SECONDS,
};
```

Update `AuthoritativeQuoteInput` and its policy call to omit `pacingState`. Make `cashOutQuoteSchema` strict:

```ts
export const cashOutQuoteSchema = z
  .object({ session_id: z.string().uuid() })
  .strict();
```

- [ ] **Step 4: Write failing route tests for pacing independence and Greed output**

```ts
const response = await request(makeApp())
  .post('/api/v1/economy/cash-out/quote')
  .send({ session_id: SESSION_ID });

expect(response.status).toBe(200);
expect(response.body.greedLevel).toBe(0);
expect(response.body.quote.expiresAtSeconds - response.body.quote.issuedAtSeconds).toBe(15);
```

Add a second case with a prior response timestamp ten minutes after session start and assert the route passes `lastDecisionAtSeconds: 600`, not an epoch timestamp, into the quote service behavior.

- [ ] **Step 5: Run the quote route test to verify RED**

Run: `npx vitest run railway-market-server/tests/routes/cashOutQuote.test.ts`

Expected: FAIL because the route still requires `pacing_state`, omits `greedLevel`, and forwards absolute `responded_at` epoch seconds.

- [ ] **Step 6: Implement the minimal route changes**

Destructure only `session_id`, convert persisted response time into run-relative seconds, omit `pacingState` from `quoteService.issue`, and include authoritative Greed in both new and reused quote responses:

```ts
const { session_id: sessionId } = parsed.data;
const sessionStartSeconds = Math.floor(session.created_at.getTime() / 1_000);
const lastDecisionAtSeconds =
  escrow.last_decision_at_seconds === null
    ? null
    : Math.max(0, escrow.last_decision_at_seconds - sessionStartSeconds);

body: {
  quote: quoteResult.quote,
  signature: quoteResult.signature,
  shouldForceRecovery: quoteResult.shouldForceRecovery,
  safeExitOnly: quoteResult.safeExitOnly,
  greedLevel,
}
```

When an open quote is reused, return the same `greedLevel` field.
When the route closes an expired quote during the same request, set
`lastDecisionAtSeconds = elapsedSeconds`; never assign absolute `nowSeconds` to a
run-relative policy field.

- [ ] **Step 7: Run server quote tests to verify GREEN**

Run: `npx vitest run railway-market-server/tests/services/CashOutPolicy.test.ts railway-market-server/tests/services/AuthoritativeQuoteService.test.ts railway-market-server/tests/db/validation.test.ts railway-market-server/tests/routes/cashOutQuote.test.ts`

Expected: PASS with no warnings.

### Task 2: Return Authoritative Decision Greed

**Files:**
- Modify: `railway-market-server/src/db/validation.ts`
- Modify: `railway-market-server/src/routes/economy.ts`
- Modify: `railway-market-server/src/services/economy/CashOutQuoteSigner.ts`
- Test: `railway-market-server/tests/routes/cashOutDecision.test.ts`
- Test: `railway-market-server/tests/services/CashOutQuoteSigner.test.ts`

**Interfaces:**
- Consumes: Signed quote, row-locked escrow `greed_level`, canonical sequence, and server wall clock.
- Produces: Decision request union `'accept' | 'reject' | 'safe_exit' | 'timeout'`; response `{ state, rewardPoints, greedDelta, greedLevel, canonicalSequence }`.

- [ ] **Step 1: Write failing expiry and decision response tests**

```ts
expect(
  signer.verify(quote, signature, quote.expiresAtSeconds)
).toBe(false);

expect(response.body).toEqual({
  state: 'active',
  rewardPoints: 0,
  greedDelta: 1,
  greedLevel: 1,
  canonicalSequence: 42,
});
```

Add a timeout request at or after expiry and assert it stores quote status `expired`. Add an early timeout case and expect HTTP 409 with `Cash-out quote has not expired`.

- [ ] **Step 2: Run decision tests to verify RED**

Run: `npx vitest run railway-market-server/tests/services/CashOutQuoteSigner.test.ts railway-market-server/tests/routes/cashOutDecision.test.ts`

Expected: FAIL because expiry is currently inclusive, `timeout` is rejected by Zod, and responses omit the resulting Greed and sequence.

- [ ] **Step 3: Implement strict wall-clock expiry and timeout semantics**

```ts
export const cashOutDecisionSchema = z.object({
  quote_id: z.string().uuid().or(z.string().trim().min(1).max(128)),
  decision: z.enum(['accept', 'reject', 'safe_exit', 'timeout']),
  signature: z.string().regex(/^[a-f0-9]{64}$/i),
  idempotency_key: z.string().trim().min(8).max(128),
});
```

Treat `nowSeconds >= expiresAtSeconds` as expired. Reject an early `timeout`; otherwise resolve server expiry before settlement:

```ts
const expired = nowSeconds >= Math.floor(quote.expires_at.getTime() / 1_000);
if (decision === 'timeout' && !expired) {
  return { statusCode: 409, body: { error: 'Cash-out quote has not expired' } };
}
const resolvedDecision = expired || decision === 'timeout' ? 'expired' : decision;
const greedDelta =
  resolvedDecision === 'reject' || resolvedDecision === 'expired' ? 1 : 0;
const greedLevel = quote.greed_level + greedDelta;
```

Return `greedLevel` and `canonicalSequence` in the idempotently stored body.

- [ ] **Step 4: Run decision tests to verify GREEN**

Run: `npx vitest run railway-market-server/tests/services/CashOutQuoteSigner.test.ts railway-market-server/tests/routes/cashOutDecision.test.ts`

Expected: PASS with accepted, rejected, expired, Safe Exit, tamper, and replay cases green.

### Task 3: Align The Frontend Economy Client

**Files:**
- Modify: `services/auth/GameSessionService.ts`
- Test: `tests/services/auth/GameSessionService.test.ts`

**Interfaces:**
- Consumes: Server quote and decision JSON from Tasks 1-2.
- Produces: `requestCashOutQuote(): Promise<CashOutQuoteResponse>` and `decideCashOut(..., decision: CashOutDecision, ...): Promise<CashOutDecisionResponse>`.

- [ ] **Step 1: Write the failing transport contract test**

```ts
await GameSessionService.requestCashOutQuote();
await GameSessionService.decideCashOut(
  'quote-1',
  'a'.repeat(64),
  'timeout',
  'timeout:quote-1'
);

expect(railwayPostMock).toHaveBeenCalledWith('/api/v1/economy/cash-out/quote', {
  session_id: 's1',
});
expect(railwayPostMock).toHaveBeenCalledWith(
  '/api/v1/economy/cash-out/decision',
  expect.objectContaining({ decision: 'timeout' })
);
```

Require `sessionId`, `issuedAtSeconds`, `expiresAtSeconds`, and `greedLevel` in the mocked quote response and `greedLevel` plus `canonicalSequence` in the decision response.

- [ ] **Step 2: Run the client service test to verify RED**

Run: `npx vitest run tests/services/auth/GameSessionService.test.ts`

Expected: FAIL because the method requires a pacing argument and the decision union excludes `timeout`.

- [ ] **Step 3: Implement the typed client contract**

```ts
export type CashOutDecision = 'accept' | 'reject' | 'safe_exit' | 'timeout';

export type CashOutQuoteResponse = {
  quote: {
    quoteId: string;
    sessionId: string;
    canonicalSequence: number;
    rewardPoints: number;
    issuedAtSeconds: number;
    expiresAtSeconds: number;
  };
  signature: string;
  shouldForceRecovery: boolean;
  safeExitOnly: boolean;
  greedLevel: number;
};

export type CashOutDecisionResponse = {
  state: 'active' | 'settled' | 'failed';
  rewardPoints: number;
  greedDelta: number;
  greedLevel: number;
  canonicalSequence: number;
};
```

Post only `{ session_id: this.currentSessionId }` from `requestCashOutQuote()`.

- [ ] **Step 4: Run the client service test to verify GREEN**

Run: `npx vitest run tests/services/auth/GameSessionService.test.ts`

Expected: PASS.

### Task 4: Commit Greed At The Next Tick

**Files:**
- Modify: `types/events.ts`
- Modify: `services/difficulty/runtime/contracts.ts`
- Modify: `services/difficulty/runtime/DifficultyInputInbox.ts`
- Modify: `services/difficulty/runtime/DifficultyEventBridge.ts`
- Modify: `services/difficulty/runtime/DifficultyRuntime.ts`
- Modify: `services/director/DirectorSpawnOrchestrator.ts`
- Modify: `services/director/ExperienceDirector.ts`
- Modify: `services/gameplay/phases/DifficultyPhase.ts`
- Test: `tests/services/difficulty/runtime/DifficultyInputInbox.test.ts`
- Test: `tests/services/difficulty/runtime/DifficultyEventBridge.test.ts`
- Test: `tests/services/director/DirectorSpawnOrchestrator.test.ts`
- Test: `tests/services/director/ExperienceDirector.test.ts`
- Test: `tests/services/gameplay/DifficultyPhase.test.ts`

**Interfaces:**
- Consumes: `cashOutDecisionCommitted` event `{ sessionId, quoteId, canonicalSequence, decision, greedLevel }`.
- Produces: `DifficultyRuntimeInputView.run.greedLevel: number`, updated only when its eligible tick drains.

- [ ] **Step 1: Write failing inbox monotonicity tests**

```ts
inbox.recordAuthoritativeGreed(
  { quoteId: 'quote-2', canonicalSequence: 42, greedLevel: 2 },
  11
);

expect(inbox.drain(10).run.greedLevel).toBe(0);
expect(inbox.drain(11).run.greedLevel).toBe(2);

inbox.recordAuthoritativeGreed(
  { quoteId: 'quote-1', canonicalSequence: 41, greedLevel: 1 },
  12
);
expect(inbox.drain(12).run.greedLevel).toBe(2);
```

Also assert a duplicate `quoteId` and a lower Greed value do not advance `revisions.run`.

- [ ] **Step 2: Run inbox tests to verify RED**

Run: `npx vitest run tests/services/difficulty/runtime/DifficultyInputInbox.test.ts`

Expected: FAIL because the inbox has no Greed channel.

- [ ] **Step 3: Add the Greed input channel**

Extend the input view:

```ts
run: {
  constants: DifficultyRunConstants | null;
  greedLevel: number;
};
```

Add a copied, low-frequency inbox record with validation and ordering:

```ts
public recordAuthoritativeGreed(
  event: { quoteId: string; canonicalSequence: number; greedLevel: number },
  eligibleFromTick: number
): void {
  if (
    event.quoteId.length === 0 ||
    !Number.isSafeInteger(event.canonicalSequence) ||
    !Number.isSafeInteger(event.greedLevel) ||
    event.greedLevel < this.pendingGreedLevel ||
    event.canonicalSequence < this.lastGreedCanonicalSequence ||
    event.quoteId === this.lastGreedQuoteId ||
    !Number.isSafeInteger(eligibleFromTick)
  ) return;

  this.pendingGreedLevel = event.greedLevel;
  this.lastGreedCanonicalSequence = event.canonicalSequence;
  this.lastGreedQuoteId = event.quoteId;
  this.greedDirty = true;
  this.greedEligibleTick = Math.min(this.greedEligibleTick, eligibleFromTick);
}
```

On eligible drain, copy pending Greed into `view.run.greedLevel` and increment `revisions.run` once. Full reset returns Greed and ordering fields to zero/empty; cycle reset preserves Greed.

- [ ] **Step 4: Write failing bridge and phase boundary tests**

```ts
EventBus.emit('cashOutDecisionCommitted', {
  sessionId: 'session-1',
  quoteId: 'quote-1',
  canonicalSequence: 42,
  decision: 'reject',
  greedLevel: 1,
});

expect(inbox.drain(20).run.greedLevel).toBe(0);
expect(inbox.drain(21).run.greedLevel).toBe(1);
```

Create a current-runtime boundary test that emits the event, commits tick N and tick N+1, and asserts the current Director input uses Greed zero then one.

- [ ] **Step 5: Run bridge and boundary tests to verify RED**

Run: `npx vitest run tests/services/difficulty/runtime/DifficultyEventBridge.test.ts tests/services/gameplay/DifficultyPhase.test.ts`

Expected: FAIL because the event is undefined and `DifficultyPhase` still initializes Greed locally.

- [ ] **Step 6: Bridge and apply the committed value**

Add the event name and payload to `types/events.ts`, subscribe in `DifficultyEventBridge`, and call `recordAuthoritativeGreed(event, this.nextTick())`.

After `DifficultyRuntime` drains the inbox, replace the mutable boundary run value before calling the current adapter:

```ts
if (input.run !== null) {
  input.run.greedLevel = inputView.run.greedLevel;
}
```

Remove `greedLevel: 0` as an authority decision from `DifficultyPhase`; its reusable boundary object starts neutral, while `DifficultyRuntime` owns the committed update.

- [ ] **Step 7: Run all Greed runtime tests to verify GREEN**

Run: `npx vitest run tests/services/difficulty/runtime/DifficultyInputInbox.test.ts tests/services/difficulty/runtime/DifficultyEventBridge.test.ts tests/services/gameplay/DifficultyPhase.test.ts tests/services/director/ExperienceDirector.test.ts`

Expected: PASS and Greed pressure changes only at the next tick.

### Task 5: Replace The Paused Flow With A Live Offer

**Files:**
- Modify: `types/gameMode.ts`
- Modify: `hooks/useGameFlowController.ts`
- Test: `tests/hooks/useGameFlowController.test.ts`

**Interfaces:**
- Consumes: `GameSessionService.requestCashOutQuote()` and the signed quote response.
- Produces: `cashOutOffer: CashOutOfferData | null`, `handleCashOut(): Promise<void>`, and `handleRejectCashOut(): Promise<void>`.

- [ ] **Step 1: Write failing offer-open tests**

```ts
act(() => {
  EventBus.emit('cycleComplete', { cycleNumber: 2, totalElapsedSeconds: 300 });
});

await waitFor(() => expect(result.current.cashOutOffer).not.toBeNull());
expect(GameSessionService.requestCashOutQuote).toHaveBeenCalledWith();
expect(GameStateMachine.transition).not.toHaveBeenCalledWith(
  GameStatus.CYCLE_COMPLETE
);
expect(result.current.cashOutOffer?.quote.rewardPoints).toBe(120);
```

Add a quote failure case asserting no offer opens, the run remains `PLAYING`, and the same cycle can retry.

- [ ] **Step 2: Run the hook test to verify RED**

Run: `npx vitest run tests/hooks/useGameFlowController.test.ts`

Expected: FAIL because the hook currently pauses before requesting a quote and stores only local cycle data.

- [ ] **Step 3: Add the signed offer state**

```ts
export type CashOutOfferData = {
  cycle: CycleCompleteData;
  quote: {
    quoteId: string;
    sessionId: string;
    canonicalSequence: number;
    rewardPoints: number;
    issuedAtSeconds: number;
    expiresAtSeconds: number;
  };
  signature: string;
  safeExitOnly: boolean;
  greedLevel: number;
};
```

In the `cycleComplete` subscriber, request the quote first, then set `cashOutOffer`. Never call `GameStateMachine.transition(GameStatus.CYCLE_COMPLETE)`.

- [ ] **Step 4: Write failing reject and timeout tests**

```ts
await act(async () => {
  await result.current.handleRejectCashOut();
});

expect(GameSessionService.decideCashOut).toHaveBeenCalledWith(
  'quote-1',
  'a'.repeat(64),
  'reject',
  'reject:quote-1'
);
expect(healFull).not.toHaveBeenCalled();
expect(difficultyContext.resetForCycleContinue).not.toHaveBeenCalled();
expect(result.current.cashOutOffer).toBeNull();
```

With fake timers, advance to `expiresAtSeconds` and assert decision `timeout`, event `cashOutDecisionCommitted`, and resulting Greed one. Add a decision failure case asserting the signed offer remains visible.

- [ ] **Step 5: Run hook tests to verify RED**

Run: `npx vitest run tests/hooks/useGameFlowController.test.ts`

Expected: FAIL because continue is local, heals, resets difficulty, and no expiry settlement exists.

- [ ] **Step 6: Implement one settlement path for all outcomes**

```ts
const resolveCashOutOffer = useCallback(
  async (decision: CashOutDecision): Promise<boolean> => {
    const offer = cashOutOfferRef.current;
    if (offer === null) return false;

    const settlement = await GameSessionService.decideCashOut(
      offer.quote.quoteId,
      offer.signature,
      decision,
      `${decision}:${offer.quote.quoteId}`
    );

    EventBus.emit('cashOutDecisionCommitted', {
      sessionId: offer.quote.sessionId,
      quoteId: offer.quote.quoteId,
      canonicalSequence: settlement.canonicalSequence,
      decision,
      greedLevel: settlement.greedLevel,
    });
    return true;
  }, []
);
```

Accept clears the session, resets difficulty, and invokes game over only after `state === 'settled'`. Reject and timeout clear only the offer after `state === 'active'`. Schedule one wall-clock `window.setTimeout` from the signed expiry; cleanup cancels it. Do not reset combo, cycle factor, difficulty, or health on reject/timeout.

- [ ] **Step 7: Run flow tests to verify GREEN**

Run: `npx vitest run tests/hooks/useGameFlowController.test.ts tests/services/difficulty/runtime/DifficultyEventBridge.test.ts`

Expected: PASS with live play, accept, reject, timeout, retry, and Greed event cases green.

### Task 6: Render The Server Offer Over Active Gameplay

**Files:**
- Modify: `components/screens/CycleCompleteScreen.tsx`
- Modify: `components/GameScreenRouter.tsx`
- Modify: `components/GameAppShell.tsx`
- Test: `tests/screens/CycleCompleteScreen.test.tsx`
- Test: `tests/components/GameUI.test.tsx`
- Test: `tests/components/GameAppShell.wallet.test.tsx`

**Interfaces:**
- Consumes: `CashOutOfferData`, `onCashOut`, and `onReject`.
- Produces: A live overlay showing signed reward points, authoritative Greed, and remaining wall-clock seconds while `GameStatus.PLAYING` remains active.

- [ ] **Step 1: Write failing presentation tests**

```tsx
render(
  <CycleCompleteScreen
    offer={mockOffer}
    onCashOut={mockOnCashOut}
    onReject={mockOnReject}
  />
);

expect(screen.getByText('120')).toBeInTheDocument();
expect(screen.getByText('15s')).toBeInTheDocument();
fireEvent.click(screen.getByText('common.cycle_complete_screen.continue'));
expect(mockOnReject).toHaveBeenCalledTimes(1);
```

Add a fake-timer assertion that the displayed remaining time derives from `expiresAtSeconds`, not a 35-second local constant. Add a router assertion that the overlay renders for `PLAYING` plus an offer and not for a null offer.

- [ ] **Step 2: Run presentation tests to verify RED**

Run: `npx vitest run tests/screens/CycleCompleteScreen.test.tsx tests/components/GameUI.test.tsx tests/components/GameAppShell.wallet.test.tsx`

Expected: FAIL because the screen consumes local cycle rewards and the router requires `CYCLE_COMPLETE`.

- [ ] **Step 3: Replace local reward and pause assumptions**

Remove `CoinService.calculateCycleReward` and `ComboSystem` from the screen. Use `offer.quote.rewardPoints`, `offer.greedLevel`, and a one-second recursive wall-clock timeout for display only:

```ts
const getRemainingSeconds = (): number =>
  Math.max(0, Math.ceil(offer.quote.expiresAtSeconds - Date.now() / 1_000));

useEffect(() => {
  let timerId: number | null = null;
  const update = () => {
    setTimeRemaining(getRemainingSeconds());
    if (getRemainingSeconds() > 0) {
      timerId = window.setTimeout(update, 1_000);
    }
  };
  update();
  return () => {
    if (timerId !== null) window.clearTimeout(timerId);
  };
}, [offer.quote.expiresAtSeconds]);
```

Rename the continue action to `onReject`; retain the existing translation key temporarily so this behavior change does not expand into a localization migration.

- [ ] **Step 4: Render during active play**

Thread `cashOutOffer` and `handleRejectCashOut` through `GameAppShell` and `GameScreenRouter`. Replace the paused condition with:

```tsx
{gameStatus === GameStatus.PLAYING && cashOutOffer !== null && (
  <CycleCompleteScreen
    offer={cashOutOffer}
    onCashOut={handleCashOut}
    onReject={handleRejectCashOut}
  />
)}
```

- [ ] **Step 5: Run presentation tests to verify GREEN**

Run: `npx vitest run tests/screens/CycleCompleteScreen.test.tsx tests/components/GameUI.test.tsx tests/components/GameAppShell.wallet.test.tsx`

Expected: PASS and no `CoinService` mock is required by the screen test.

### Task 7: Validate The First Remediation Slice

**Files:**
- Verify: All files modified by Tasks 1-6.
- Update if needed: `docs/superpowers/specs/2026-07-21-difficulty-contract-remediation-design.md`
- Update if needed: `public/docs/superpowers/specs/2026-07-21-difficulty-contract-remediation-design.md`

**Interfaces:**
- Consumes: Completed server, client, runtime, flow, and UI behavior.
- Produces: A green, independently releasable cash-out/Greed slice ready for the pacing/telegraph remediation plan.

- [ ] **Step 1: Run focused server tests**

Run: `npx vitest run railway-market-server/tests/services/CashOutPolicy.test.ts railway-market-server/tests/services/AuthoritativeQuoteService.test.ts railway-market-server/tests/services/CashOutQuoteSigner.test.ts railway-market-server/tests/db/validation.test.ts railway-market-server/tests/routes/cashOutQuote.test.ts railway-market-server/tests/routes/cashOutDecision.test.ts`

Expected: All selected files pass.

- [ ] **Step 2: Run focused frontend and runtime tests**

Run: `npx vitest run tests/services/auth/GameSessionService.test.ts tests/services/difficulty/runtime/DifficultyInputInbox.test.ts tests/services/difficulty/runtime/DifficultyEventBridge.test.ts tests/services/gameplay/DifficultyPhase.test.ts tests/hooks/useGameFlowController.test.ts tests/screens/CycleCompleteScreen.test.tsx tests/components/GameAppShell.wallet.test.tsx`

Expected: All selected files pass.

- [ ] **Step 3: Run package validation**

Run: `npm run typecheck`

Expected: Exit code 0.

Run: `npm run validate --prefix railway-market-server`

Expected: Server typecheck, lint, and build pass.

- [ ] **Step 4: Run UI and architecture gates**

Run: `npm run check:ui-contract`

Expected: Exit code 0 with no new production UI violations.

Run: `npm run check:architecture`

Expected: Exit code 0; no singleton whitelist change is required.

- [ ] **Step 5: Run the repository baseline gate**

Run: `npm run check:baseline`

Expected: Typecheck, architecture, reset coverage, UI contract, lint, test, and build all pass. If an unrelated pre-existing failure appears, record the exact command and failure without modifying unrelated code.

- [ ] **Step 6: Review the diff without committing**

Run: `git diff --check`

Expected: No whitespace errors.

Run: `git status --short`

Expected: Only the intended cash-out/Greed files plus the user's pre-existing changes are listed; no commit is created.
