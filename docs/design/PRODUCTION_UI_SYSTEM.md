# Production UI System

> **Status** live
> Owner: UI engineering

## Purpose

CS-UI-DS-V1 keeps player-facing UI modular and recognizably Crypto Survivors. New screens are assembled from a small set of typed primitives and structural patterns instead of bespoke Tailwind surfaces.

The system is **token-driven, variant-based, and governed**. It supports the cyberpunk and retro skins without changing a screen's DOM hierarchy or interaction model.

## Layer Model

| Layer | Responsibility | Examples |
|---|---|---|
| Foundations | Design decisions and skin values | `config/ui/semanticTokens.ts`, `config/themes/` |
| Primitives | Accessible, typed controls | `ThemedButton`, `ThemedInput`, `ThemedPanel` |
| Structure | Screen layout and state chrome | `PageShell`, `ScreenHeader`, `OverlayChrome`, `StatePanel` |
| Patterns | A repeated player interaction | selection card, setting row, confirmation panel |
| Screens | Product-specific composition | landing, hub, settings, HUD, game-over |

Atomic Design words may describe the inventory, but they do not dictate folder depth or force a one-use abstraction. A pattern enters the shared layer only after two production consumers need it.

## Applied Patterns

- **Token-driven system:** base values remain in a skin; semantic tokens express intent; component recipes consume those semantics. This prevents palette drift without hiding meaningful design decisions behind generic utilities.
- **Variant-based APIs with skin adapters:** typed `intent`, `size`, `tone` and `surface` props preserve a single behavior and DOM contract. A skin resolver changes the recipe, never the screen implementation.
- **Primitive-to-pattern composition:** foundations feed primitives, primitives feed structural components, and only interactions used twice become shared patterns. It avoids both copy-paste screens and premature abstraction.
- **Strangler-fig cutover:** legacy screens are migrated one player flow at a time and added to `enforcedPaths` only after their local contract is clean. New production files are governed from day one.
- **Architecture fitness functions:** `check:ui-contract` turns UI rules into executable constraints. A deliberately small, expiring legacy allowlist contains migration debt rather than normalizing it.
- **Visual contract testing:** stable browser screenshots verify the composition that static analysis cannot see. Seeded data, reduced motion and tightly scoped masks isolate UI regressions from game and market noise.

## Tokens And Skins

Use semantic meaning rather than a palette value:

- `surface.canvas`, `surface.default`, `surface.raised`, `surface.inset`
- `text.primary`, `text.muted`
- `action.primary.*`, `focus.ring`, `status.*`, `motion.*`

The allowed direction is **base value → semantic token → component token**. Raw color values belong only in a skin definition. A production component must not branch on `isRetro`; themed primitives read the active skin through `useUiSkin` and retain one component API.

## Composition

Use typed variants for presentation and slots/children for structure.

```tsx
<ThemedPanel surface="raised" className="w-full max-w-xl">
  <ThemedText as="h1" variant="h1">Cycle report</ThemedText>
  <ThemedDivider label="Position" />
  <ThemedButton intent="primary" size="lg">Continue</ThemedButton>
</ThemedPanel>
```

`className` is for layout only: flow, grid/flex layout, width/height, positioning, overflow and ordering. Do not override color, radius, shadow, typography, padding, border appearance, animation or transition through a primitive's `className`. Add a typed variant or a shared pattern instead.

Use `lucide-react` for navigation and utility icons. Use `CardIcons` only where the icon is game content or brand content.

## Interaction Rules

- One surface has one primary CTA; secondary actions use a lower intent.
- Interactive controls maintain a visible focus ring, an accessible name and a minimum 44px touch target.
- Motion uses the semantic motion token and must respect reduced-motion.
- HUD and requestAnimationFrame paths do not receive React state, new allocations or presentation effects from this system.

## Contract Gate

Run `npm run check:ui-contract` before review. The gate rejects:

- raw `button`, `input`, `select` and `textarea` in enforced production UI
- direct `isRetro` presentation branches
- raw color literals and standalone visual surfaces
- visual overrides on themed primitives

The gate is phased during migration. New production files are always checked. Existing debt may be listed only in `config/ui-contract/legacy-allowlist.json`, with an owner, reason, rule list and expiry date. An exemption is temporary and must shrink over time.

## Verification

- Unit tests cover primitive intent, skin, loading/disabled state, focus and accessible names.
- `npm run test:e2e:ui-contract` captures the landing, hub, main menu, settings, HUD, level-up and game-over flows in Chromium at `1440×900` and `390×844`, for both skins.
- Dynamic canvas and live market regions are masked; reduced motion and a seeded local profile keep UI composition deterministic. A 50-pixel anti-aliasing tolerance is limited to renderer jitter.
- `npm run test:e2e:ui-contract:update` is the only command that refreshes committed snapshots. Regular CI never accepts a changed baseline automatically.
