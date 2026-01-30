# Icon Design System & Art Direction

This document defines the visual language and generation rules for the game's icon assets, specifically focusing on the Card and Skill icons.

## Core Visual Philosophy

*   **Style:** Ultra-Detailed Cyberpunk / Neon.
*   **Background:** 100% Solid Black (#000000).
*   **Constraint:** **NO TEXT**. Icons must be purely visual symbols.
*   **Rendering:** Optimized for **Additive Blend Mode**.
    *   **Sharp Edges:** Avoid excessive radial blur or soft outer glows that muddy the texture atlas.
    *   **High Contrast:** Bright neon colors against deep black ensuring the icon "pops" when overlaid on dark game backgrounds.

## Tier Hierarchy System

We use a visual progression system to allow players to instantly recognize a card's rarity/power level based on the icon's density and style.

### 🟢 Tier 1: Common (The Spark)
*   **Concept:** Minimalist, Abstract, Line Art.
*   **Visual Characteristics:**
    *   Thin, clean neon lines (vector-like).
    *   Abstract shapes that vaguely hint at the subject.
    *   Low visual weight (mostly black space).
*   **Example (Bull Run):** A simple zigzag stock chart arrow that curves slightly to suggest a horn.

### 🔵 Tier 2: Rare (The Structure)
*   **Concept:** Defined, Geometric, Outline.
*   **Visual Characteristics:**
    *   Medium thickness lines.
    *   Clear, recognizable silhouette/outline of the subject.
    *   Tech identifiers like circuitry nodes, dots, or geometric connections (PCB style).
*   **Example (Bull Run):** A clear geometric outline of a Bull's head formed by connected graph lines.

### 🟣/🟡 Tier 3: Legendary (The Essence)
*   **Concept:** Solid, Crystalline, Pure Energy.
*   **Visual Characteristics:**
    *   Solid, filled shapes (Mass > Lines).
    *   "Crystalline" or "Energy Core" look.
    *   Internal glowing details/veins instead of external outlines.
    *   Maximum brightness/intensity.
*   **Example (Bull Run):** A solid, glowing green crystal-like Bull head, fully illuminated from within.

---

## AI Generation Prompt Templates

Use these templates to generate new icons consistent with this art direction.

### Tier 1 (Common) Prompt Matrix
> **Subject:** [ICON_NAME]
> **Prompt:** Tier 1 Game Icon: Common '[ICON_NAME]'. A completely text-free, minimalist [COLOR] neon icon on a solid black background. A simple, sharp, abstract line-art representation of [SUBJECT]. Thin, clean vector-like lines. NO background glow, NO radial effects, NO text. High contrast, sharp edges.

### Tier 2 (Rare) Prompt Matrix
> **Subject:** [ICON_NAME]
> **Prompt:** Tier 2 Game Icon: Rare '[ICON_NAME]'. A completely text-free, defined [COLOR] neon icon on a solid black background. The lines clearly connect to form the geometric OUTLINE of [SUBJECT]. Medium thickness lines, circuitry nodes at corners. NO background glow, NO radial blur, NO text. Clean, crisp, high contrast.

### Tier 3 (Legendary) Prompt Matrix
> **Subject:** [ICON_NAME]
> **Prompt:** Tier 3 Game Icon: Legendary '[ICON_NAME]'. A completely text-free, solid filled [COLOR] neon icon on a solid black background. A powerful, crystalline [SUBJECT], fully illuminated from within. The shape is solid and dominant. NO background glow, NO radial halo, NO text. Intense brightness within the shape, sharp cut-off at edges. Additive blend ready.

---

## Reference Asset: Bull Run Series

The following logic was used to generate the "Bull Run" (Market Rally) icons:

1.  **Common:** Simple chart arrow (Green).
2.  **Rare:** Chart lines forming a Bull Head outline.
3.  **Legendary:** Solid, glowing Jade/Emerald Bull Head.
