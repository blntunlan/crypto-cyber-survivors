# Market Cache Lootbox Juice Design

> Status: approved design and implementation-plan ready
> Date: 2026-07-13
> Domain: gameplay rewards, collection, VFX, cosmetics progression

## Summary

The existing world `LOOT_CRATE` becomes a contact-opened **Market Cache**. The
player breaks it by walking over it, receives an immediately useful run reward,
and can earn a persistent encrypted cosmetic fragment after a time-gated roll.
The opening uses a short micro-cinematic without interrupting the survivors-style
combat flow.

The system is always positive. It has no trap, damage, enemy spawn, empty result,
or other Rug Pull outcome.

## Approved Product Decisions

- Reward model is hybrid: guaranteed run reward plus an optional encrypted
  cosmetic fragment.
- Run rewards use smart weighted selection instead of unrestricted random choice.
- Opening uses a 70-100 ms micro-cinematic.
- Reward presentation scales by rarity.
- Rarity uses the existing casino/card palette.
- Cosmetic fragments are unavailable in the early run and unlock through a
  gradual time curve.
- Fragments only support cosmetic progression. They never grant permanent power.
- Negative loot outcomes are forbidden.
- Development builds expose keyboard controls for rapid spawn and animation
  review.

## Current State

- `GameEngine` spawns a `LOOT_CRATE` every 30 seconds with inline logic.
- The crate is currently damaged by bullets through `CollisionSystem`.
- Destroying it produces one large rare XP gem.
- `EntityRenderer` draws it as a flat purple square with a gift emoji and health
  bar.
- The separate `LootboxService` handles meta lootboxes and weighted inventory
  drops. The Market Cache must not reuse that service as its run-time authority;
  the two mechanics have different lifecycles and reward contracts.
- `stores/cosmeticsStore.ts` is the existing local-first persistent cosmetic
  boundary and already exposes a future server-sync seam.

## Goals

1. Make finding and opening a cache a readable reward beat.
2. Preserve the uninterrupted movement and combat loop.
3. Ensure the immediate reward is useful for the player's current state.
4. Create cosmetic progression currency without prematurely implementing the
   future cosmetic unlock UI.
5. Keep all hot-path work compliant with the 60 FPS allocation and pooling rules.
6. Make every rarity and opening animation easy to inspect in development.

## Non-Goals

- Implementing the future cosmetic shop, crafting screen, or fragment redemption.
- Granting a complete skin directly from a world cache.
- Granting virtual coins or mutating verified wallet balances.
- Adding paid keys, purchasable boxes, crypto-token rewards, or real-value claims.
- Adding negative, trapped, or adversarial caches.
- Reworking the existing meta `LootboxService` opening UI.

## Player Experience

### Spawn

1. The first cache becomes eligible between 35 and 55 seconds.
2. Later caches use a randomized 55-95 second window.
3. Only one active Market Cache may exist.
4. The cache spawns within the visible play area, 180-320 pixels from the player,
   outside immediate enemy overlap.
5. The spawn resolver gets a bounded number of placement attempts and uses a
   safe viewport fallback when every candidate is blocked.
6. A cache remains until collected or the run resets. Ignoring a cache cannot
   produce a penalty.
7. An edge marker points toward a cache whenever camera/layout changes place it
   outside the safe HUD viewport.

The spawn window is dynamic rather than a fixed repeating timer:

- Excessive on-screen enemy pressure may defer a scheduled spawn by up to 15
  seconds.
- Player health below 35% biases the current window toward its earlier bound,
  without spawning more than one cache.
- Pause, level-up, and other non-playing states freeze the timer through game
  time rather than wall-clock time.

### Rarity Curve

Rarity is selected at spawn so the cache's appearance communicates its value
before collection. Colors come from the existing card tier configuration rather
than a duplicated loot palette.

| Run time | Slot Silver / Common | Electric Blue / Rare | Royal Purple / Epic | Casino Gold / Legendary |
|---|---:|---:|---:|---:|
| 0-3 min | 78% | 20% | 2% | 0% |
| 3-7 min | 65% | 27% | 7% | 1% |
| 7-12 min | 55% | 30% | 12% | 3% |
| 12+ min | 45% | 32% | 18% | 5% |

All values live in a dedicated config module and remain independently tunable.

### Contact and Opening

- `LOOT_CRATE` no longer accepts bullet damage.
- Player-circle overlap starts the opening exactly once.
- The cache immediately becomes non-collectible so consecutive physics frames
  cannot duplicate rewards.
- Its world entity remains active only for the short opening animation, then
  returns to the pool.
- Mining rigs and other destructible interactables preserve their existing
  bullet behavior.

## Smart Run Rewards

The resolver starts with four positive reward families:

| Reward | Theme | Base effect |
|---|---|---|
| `liquidity_injection` | Emergency liquidity | Heal 25% max HP and grant 1.5 seconds of contact protection |
| `data_dividend` | Market data payout | Spawn pooled XP gems worth a configured kill-equivalent amount |
| `overclock_contract` | Miner overclock | +25% damage and +30% fire rate for 10 seconds |
| `circuit_breaker` | Exchange protection | Emit a knockback ring and slow affected enemies for 2.5 seconds |

### Smart Weight Rules

Base selection weights are Liquidity 25, Data 30, Overclock 25, and Circuit
Breaker 20. The resolver adjusts them from a read-only player/run snapshot:

- HP below 35% adds 70 to Liquidity weight.
- HP above 80% sets Liquidity weight to zero.
- High enemy density adds 50 to Circuit Breaker and 20 to Overclock.
- Low current level-progress adds 25 to Data Dividend.
- An already-active Overclock sets its own weight to zero instead of stacking.
- If a candidate is invalid, its weight becomes zero before the roll.
- The resolver always retains at least one valid reward and falls back to Data
  Dividend if external state is malformed.

### Rarity Scaling

- Silver grants one base reward at 1.0 strength.
- Blue grants one base reward at 1.25 strength.
- Purple grants one base reward at 1.6 strength.
- Gold triggers **Whale Liquidity**: two distinct valid rewards at 1.5 strength
  each.

The resolver returns gameplay facts. Reward application, rendering, audio, and UI
copy remain separate consumers.

## Encrypted Cosmetic Fragments

The first release adds one generic balance named `encryptedFragments`. It avoids
prematurely defining cosmetic recipes while giving the future cosmetic system a
stable persisted currency.

No world cache directly unlocks a skin.

### Time and Rarity Gate

| Run time | Silver | Blue | Purple | Gold |
|---|---:|---:|---:|---:|
| 0-3 min | 0% | 0% | 0% | 0% |
| 3-7 min | 0% | 0% | 2% | 8% |
| 7-12 min | 0% | 1% | 5% | 15% |
| 12+ min | 0% | 2% | 8% | 25% |

Fragment rolls are additional to the guaranteed run reward and cannot replace it.

### Soft Pity

- Only fragment-eligible openings count toward pity.
- After eight eligible misses, every additional miss adds two percentage points.
- The bonus caps at ten percentage points.
- A fragment drop resets the miss counter.
- Pity is run-local; the fragment balance itself persists across runs.
- Pity is not presented as a visible guarantee.

### Persistence

- `cosmeticsStore` gains `encryptedFragments` and an additive action.
- The Zustand persist layer stores the balance across sessions.
- Store hydration uses a versioned migration so existing cosmetic saves default
  missing fragment data to zero.
- The existing future `syncFromServer` seam remains authoritative when Railway
  cosmetic inventory is implemented.
- Fragment persistence failure never removes the immediate run reward. It logs a
  recoverable error and leaves the opening complete.

## Game Feel Sequence

### Idle and Proximity

- The cache uses a small vertical hover and rarity-colored glow pulse.
- Corner lamps and a lock glyph communicate that it is a reward object rather
  than an enemy.
- Within 96 pixels, the pulse accelerates and quiet slot ticks rise in pitch.
- Proximity feedback is visual-only when slot audio is muted.

### Opening Timeline

1. `0-40 ms`: anticipation squash to approximately 92% height.
2. `40 ms`: the cache becomes collected and the gameplay fact is committed.
3. `40-110/140 ms`: rarity-scaled hit-stop freezes simulation but continues
   rendering.
4. `110-260 ms`: four lid/body fragments burst outward, a one-frame white core
   flash appears, and a rarity-colored impact ring expands.
5. `180-500 ms`: reward symbols follow a short upward arc.
6. `350-650 ms`: symbols magnetize into the player and the floating reward label
   resolves.
7. The cache entity and temporary visuals return to their pools.

Hit-stop durations are Silver 70 ms, Blue 80 ms, Purple 90 ms, and Gold 100 ms.

### Rarity Presentation

| Rarity | Base particles | Camera shake | Audio finish |
|---|---:|---:|---|
| Silver | 8 | none | short confirmation chime |
| Blue | 12 | 1.5 px | slot win accent |
| Purple | 18 | 2.5 px | stronger slot win and sparkle |
| Gold | 28 | 3.5 px | jackpot fanfare and chip shower |

Particle counts scale through the active performance profile. All crate pieces,
particles, rings, floating text, and reward symbols use pools.

### Accessibility

- Reduced motion removes camera shake and physical fragment travel.
- It retains the rarity ring, color change, floating label, and permitted audio.
- Screen-flash settings cap or remove the white core frame.
- The result never depends on color alone; silhouette, label, icon, and sound also
  identify rarity.

## Architecture

### `LootCacheSystem`

A non-singleton runtime service owned by `GameRuntime`.

Responsibilities:

- Maintain scalar spawn-window and pity state.
- Select spawn position and rarity.
- Create/cache pooled Market Cache entities.
- Expose development-only forced spawn operations.
- Reset all run-local state on the canonical runtime reset path.

It must not own React state, persistent cosmetics, rendering, or wallet mutation.

### `LootCacheRewardResolver`

A pure, dependency-injected resolver.

Inputs include seeded RNG, elapsed game time, rarity, health ratio, level progress,
enemy pressure, and active reward buffs. Output contains the selected run rewards,
fragment result, and presentation tier.

Deterministic injection makes distribution and boundary tests stable. Production
uses the run RNG; tests use fixed sequences.

### `CollectionSystem`

Collection detection expands to active Market Caches. It performs a zero-allocation
indexed loop over the sparse interactable pool, tests player overlap, marks the
cache opening, and delegates the one-time resolution to `LootCacheSystem`.

### Reward Application

- XP uses pooled gems and the existing collection path.
- Heal/contact protection updates the live player through the established gameplay
  event/runtime boundary.
- Overclock uses a dedicated BuffManager decorator with pause-aware duration.
- Circuit Breaker performs one bounded enemy pass at opening time, not each frame.
- No reward calls `CoinService.creditCoins` or any optimistic wallet API.

### Rendering and Events

`EntityRenderer` reads the cache's mutable animation phase and timers without
allocating per frame. Typed fact events are added:

- `lootCacheSpawned`: id, rarity, position, source
- `lootCacheOpened`: id, rarity, reward ids, position, elapsed game time, source
- `cosmeticFragmentEarned`: amount, rarity, elapsed game time, source

Event payload allocation is allowed only on spawn/open events, never continuously
in the RAF loop.

## Development Controls

Development controls integrate with `CheatManager` rather than adding another
global key listener.

- `B`: replace any active cache in development and spawn a random-rarity cache near the
  player.
- `Shift+B`: replace any active cache in development and spawn a Gold cache that previews
  the complete jackpot and fragment-reveal animation.
- Both operations require `import.meta.env.DEV` and the playing game state.
- Dev caches use source `debug`.
- Dev fragment previews never increment persistent fragment balance, analytics,
  pity, or verified reward data.
- The Cheat Manager help overlay lists both shortcuts.

## Error Handling

- Invalid or empty reward weights fall back to Data Dividend.
- Failed safe-position searches use a clamped viewport fallback.
- A pool-capacity failure skips the spawn and schedules a short retry; it does not
  throw inside the game loop.
- Reward application is idempotent per cache id.
- Fragment-store errors are logged and do not roll back the run reward.
- Missing audio or unsupported vibration silently degrades to visual feedback.
- Reset, game-over, cash-out, and continue clear active caches and run-local pity
  through the canonical runtime reset path.

## Testing Strategy

### Unit Tests

- Rarity distributions select the correct tier at every time boundary.
- Fragment chance is exactly zero before three minutes.
- Blue eligibility begins at seven minutes.
- Soft pity begins after eight eligible misses, caps correctly, and resets.
- Smart weighting suppresses full-health healing and prioritizes critical-health
  healing.
- Active Overclock cannot stack with another Overclock result.
- Gold produces two distinct valid run rewards.
- Invalid input falls back to Data Dividend.

### Integration Tests

- Player overlap opens one cache once across consecutive frames.
- Bullets do not damage `LOOT_CRATE`; other destructibles retain bullet damage.
- Opening applies an immediate reward even when fragment persistence fails.
- Canonical runtime reset releases caches and clears spawn/pity state.
- `B` and `Shift+B` only work in development and playing state.
- Dev fragment preview does not mutate persisted fragment balance.

### Renderer and Accessibility Tests

- Every rarity renders with its shared card-tier color.
- Opening phases render without throwing and release pooled visuals.
- Reduced motion removes shake/travel while retaining readable confirmation.
- Gold follows the jackpot audio path; lower tiers do not.

### Performance Verification

- No new `useState` or `setState` enters the RAF loop.
- No `map`, `filter`, object spread, or transient arrays are introduced in the
  per-frame cache update/render path.
- All high-frequency visual objects come from `PoolManager`.
- Targeted tests run before the repository-wide `npm run check:baseline` gate.

## Acceptance Criteria

1. Walking over a cache opens it; shooting it does not.
2. Every opening grants a useful immediate run reward.
3. Cache rarity is readable before collection and uses the casino/card palette.
4. The first three minutes cannot grant encrypted fragments or skins.
5. Later fragment chance follows the approved time/rarity curve and soft pity.
6. No cache can damage, trap, debuff, or spawn enemies against the player.
7. Silver, Blue, Purple, and Gold openings feel progressively stronger without a
   blocking modal.
8. Reduced-motion mode remains readable and substantially calmer.
9. `B` and `Shift+B` allow rapid animation review only in development.
10. Production wallet verification and direct coin-credit paths remain untouched.
11. The system resets cleanly and does not allocate continuously in the RAF loop.
