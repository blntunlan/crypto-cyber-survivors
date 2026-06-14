# Game Feel Juice Workflow

> **Status** live
> Owner: Gameplay / Frontend

## Objective

Bu workflow, combat feedback ve game feel iyileştirmelerine düşük riskli bir yerden başlamak için kullanılır. Hedef, oyuncunun her hit, hasar, kill ve market momentini daha net hissetmesi; bunu yaparken `GameEngine` hot path performans kurallarını bozmamaktır.

## Start Scope

İlk sprint sadece combat feedback çekirdeğine odaklanır:

- Enemy hit feedback: flash, recoil, floating damage, particles
- Player damage feedback: direction indicator, edge flash, hit sound, optional haptic
- Crit feedback: mevcut hit-stop ve crit flash davranışını daha okunur hale getirme
- Reduced motion policy: shake yerine opacity, color ve text feedback kullanma
- Test coverage: collision feedback eventleri ve renderer smoke testleri

## Working Rules

- `GameEngine.tsx` içinde 60 FPS state için `useState` eklenmez.
- Per-frame allocation yapılmaz; yeni transient görseller `PoolManager` üzerinden gider.
- Feedback kararları mümkün olduğunca `EventBus` eventleriyle tetiklenir.
- Normal hit feedback düşük yoğunluklu kalır; crit, super crit, elite ve whale eventleri daha güçlü olur.
- Mobile haptic `navigator.vibrate()` ile opsiyonel ve capability-check tabanlı eklenir.
- Her efekt `graphics.reducedMotion`, `showParticles`, `showDamageNumbers` ve `showScreenShake` ayarlarına saygı gösterir.

## Implementation Flow

| Step | Task | Primary Files | Done When |
|---|---|---|---|
| 1 | Add `enemyDamaged` event contract | `types/events.ts` | Event payload typed and tests compile |
| 2 | Emit hit feedback event from collision | `services/combat/physics/CollisionSystem.ts` | Every valid bullet hit emits position, damage, crit tier |
| 3 | Tune enemy hit response | `services/renderers/EntityRenderer.ts` | Hit enemies flash/recoil without extra allocations |
| 4 | Restore player damage direction | `services/renderers/GameRenderer.ts` | Direction arc renders on `playerHit` source data |
| 5 | Add feedback coordinator | `services/gameplay/FeedbackService.ts` or `services/system/FeedbackService.ts` | Cooldowns, reduced-motion scaling, haptic guards centralized |
| 6 | Add tests | `tests/services/physics`, `tests/renderers`, `tests/hooks` | New behavior covered without brittle visual assertions |

## Event Design

Use event payloads that describe gameplay facts, not rendering instructions:

```typescript
enemyDamaged: {
  enemyId: string;
  enemyType: string;
  damage: number;
  remainingHp: number;
  x: number;
  y: number;
  isCrit: boolean;
  isSuperCrit: boolean;
}
```

`CollisionSystem` owns hit detection and damage math. Renderers and feedback services consume the event or mutated enemy state to decide how to visualize it.

## First Pull Request

Keep the first PR intentionally small:

- Add `enemyDamaged` to `GameEvent` and `EventDataMap`
- Emit `enemyDamaged` inside `resolveBulletHit`
- Add source coordinates to `playerHit`
- Re-enable and modernize damage direction indicators
- Add tests for event emission and player damage indicator cleanup

Avoid adding new art assets, new animation systems, or broad renderer rewrites in the first PR.

## Acceptance Checklist

- Normal hits are readable but not noisy.
- Crits feel stronger than normal hits through text scale, hit-stop, flash, and sound.
- Player damage source is visually clear within one frame.
- Reduced motion keeps gameplay information visible without shake.
- Mobile vibration gracefully no-ops on unsupported browsers.
- `npm run lint` and focused Vitest files pass before broader validation.

## Follow-Up Backlog

- Whale death shockwave preset
- Elite kill gold ring preset
- Combo milestone radial pulse
- Gem magnet sparkle and pickup pitch ramp
- Market momentum flow trail
- Full `EffectRegistry` to `FeedbackService` migration
