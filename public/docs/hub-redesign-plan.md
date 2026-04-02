# Hub Menu Visual Refresh Plan

> Objective: Build a brand-new Hub experience that matches the polish of the Main Menu, without deleting the existing Hub implementation until the replacement is production-ready.

---

## 1. Research & Requirements Alignment

| Step | Description | Owner / Skill |
| --- | --- | --- |
| 1.1 | Audit `components/screens/MainMenu.tsx`, `ThemedPanel`, `ThemedButton`, and `OverlayChrome` to extract spacing, typography, glow, blur, and border patterns. Document reusable tokens (e.g., `max-w-xl`, `sizes.title`, neon gradients). | Frontend design audit (Built-in) |
| 1.2 | Review UI/UX Pro Max guidance for **dark-mode bento layouts** to confirm color contrast, touch targets, hover/focus states, and grid responsiveness. | `$ui-ux-pro-max` |
| 1.3 | Capture current Hub behavior (screenshots via Playwright at desktop/tablet/mobile) for regression comparison. | Playwright (develop-web-game pattern) |

Deliverable: `docs/hub-style-report.md` summarizing extracted tokens, UI/UX checklist, and screenshot links.

---

## 2. Visual System & Layout Blueprint

| Step | Details | Skill |
| --- | --- | --- |
| 2.1 | Define **layout tiers**: <br>• Mobile (<768px): single-column stack, safe-area padding <br>• Tablet (768–1279px): 2-column grid inside `max-w-3xl` panel <br>• Desktop (≥1280px): 3-column grid, `max-w-5xl`, hero header aligned with Main Menu. | `$frontend-design`, `$ui-ux-pro-max` |
| 2.2 | Author a component map: hero header, player summary rail, feature grid (6 tiles), footnote CTA. | Frontend architecture |
| 2.3 | Document state interactions (hover, focus, keyboard navigation) mirroring Main Menu behavior. | `$ui-ux-pro-max` Accessibility |

Deliverable: `docs/hub-wireframe.md` with annotated diagrams or ASCII layout.

---

## 3. Implementation Plan (while keeping old Hub live)

| Phase | Tasks | Notes |
| --- | --- | --- |
| Phase A – Infrastructure | • Introduce new feature-flagged Hub component `HubMenuV2.tsx`. <br>• Create shared helpers (e.g., `HubPanel.tsx`, `HubGrid.tsx`). <br>• Keep existing `HubMenu` exported; `GameScreenRouter` selects between versions via dev flag. | Allows side-by-side QA. |
| Phase B – Visual Components | • Rebuild player card (`HubPlayerCardV2`) using Main Menu panel primitives. <br>• Recreate tile buttons with Main Menu typography + neon glow. <br>• Add responsive CSS (Tailwind classes + minimal custom `.hub-grid` definitions in `index.css`). | Reference `$frontend-design`. |
| Phase C – Interactions & Localization | • Preserve keyboard navigation (WASD/arrow). <br>• Verify translations (`public/locales/*`). <br>• Wire `OverlayBackButton` for desktop + safe-area on mobile. | `$ui-ux-pro-max` focus states |
| Phase D – Migration | • Once V2 passes QA, update exports: `HubMenu = HubMenuV2`. <br>• Remove legacy CSS (`.hub-grid-item` if unused). | Decommission carefully. |

---

## 4. Validation & QA Checklist

1. **Automated Tests**  
   - Update `tests/components/hub/HubMenu.test.tsx` to include V2 snapshots and interaction cases.  
   - Run targeted suite: `npx vitest run tests/components/hub/*.test.tsx`.

2. **Lint & Build**  
   - `npm run lint` (ESLint).  
   - `npm run test` (full Vitest).  
   - `npm run build` to ensure no chunk regressions.

3. **Visual Regression**  
   - Playwright screenshots for 390px, 768px, 1280px using `scripts/ui-consistency-audit.ts` or manual `page.setViewportSize`.  
   - Compare against baseline Main Menu captures.

4. **Accessibility**  
   - Verify keyboard focus order (tabbing matches visual order).  
   - Ensure contrast ≥4.5:1 (use `$ui-ux-pro-max` contrast table).  
   - Confirm touch targets ≥44px on mobile.

---

## 5. Deployment Strategy

1. Feature flag toggle in `GameScreenRouter` allowing QA to switch between Hub versions via query param or settings toggle.
2. Once approved, remove flag and legacy Hub files in a final PR.
3. Run `.agents/skills/deployment_assistant/scripts/verify.ps1` before merge (format + lint + test).

---

## 6. Open Questions / Follow-ups

- Should Hub share the same background animation layers as Main Menu (`components/screens/MainMenu.tsx`)?  
- Do we need new player stats (e.g., XP, streak) surfaced in the Hub?  
- Is there a requirement for external data (Leaderboards) inside the Hub panel during redesign?

---

**Next Action:** Kick off Phase 1 tasks (style audit, UI/UX checklist, screenshot baselines) before writing any new components. Once the style report is signed off, proceed with V2 component scaffolding.
