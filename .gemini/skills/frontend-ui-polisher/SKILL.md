---
name: frontend-ui-polisher
description: Evaluate and improve the frontend UI/UX of the landing page and application. Use when auditing UI consistency, fixing typography, implementing page transitions, or ensuring mobile/desktop responsiveness.
---

# Frontend UI Polisher

This skill provides a systematic approach to evaluating and improving the frontend of the Crypto Survivors project. It focuses on UI consistency, smooth transitions, professional typography, and seamless responsiveness.

## Workflow

1. **Audit Current UI**:
   - Evaluate the landing page and internal screens against [checklists.md](references/checklists.md).
   - Identify inconsistencies in colors, spacing, and component usage.

2. **Typography Refinement**:
   - Ensure font hierarchy follows [typography.md](references/typography.md).
   - Verify that display fonts (Audiowide) and body fonts (Chakra Petch) are used correctly.

3. **Responsiveness Check**:
   - Validate layouts against [responsiveness.md](references/responsiveness.md).
   - Use `getHUDLayout` and standard breakpoints (360px, 480px, 1024px).
   - Ensure touch targets are at least 44x44px on mobile.

4. **Transition Implementation**:
   - Implement or fix page/component transitions using [transitions.md](references/transitions.md).
   - Prefer Framer Motion or CSS transitions as per project standards.

5. **Verification**:
   - Run a visual audit on both desktop and mobile viewports.
   - Check contrast ratios and accessibility.

## Triggers

- "landing page ui bütünlüğü sağla"
- "sayfalar arası geçişleri düzenle"
- "typography ve font hiyerarşisini düzelt"
- "mobil ve desktop uyumluluğunu (responsive) kontrol et"
- "UI/UX denetimi yap ve iyileştir"