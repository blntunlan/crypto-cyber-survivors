---
description: Perform a comprehensive UI/UX audit on a specific component or screen.
---

# UI/UX Audit Workflow

Use this workflow to evaluate the design quality and usability of any screen or component in the game.

## Steps

1.  **Identify Target:** Choose the screen (e.g., `MainMenu`, `GameUI`, `HubMenu`) or specific component to audit.
2.  **Read Skill:** Open and read `.agent/skills/ui-ux-assessment/SKILL.md` to refresh the expert perspective.
3.  **Cross-Platform Analysis:**
    - Examine the code for responsive logic (e.g., `isMobile` checks, `Z_LAYERS`, `screenService`).
    - Analyze CSS/Tailwind classes for padding, font sizes, and layout shifts between desktop and mobile.
4.  **Visual Hierarchy Check:** Verify if the most important elements (Start button, HP, Price) are the most prominent.
5.  **Interactive Feedback Check:** Look for `onHover`, `active:scale-95`, and audio triggers.
6.  **Generate Report:** Create a detailed report following the template in the SKILL.md.
7.  **Propose Fixes:** Immediately offer code changes for the highest priority issues (e.g. overlapping buttons, poor contrast).

// turbo
8.  **Verify Lints:** Run `npm run lint` if any changes are proposed.
