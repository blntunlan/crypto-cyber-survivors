---
name: UI/UX Assessment
description: Evaluate user interface and experience for both Desktop and Mobile, focusing on aesthetics, naming, consistency, and responsive design.
---

# UI/UX Assessment Skill

This skill allows you to perform a comprehensive audit of the application's UI/UX from the perspective of a senior designer/expert.

## 🎯 Objectives
1.  **Platform Parity:** Ensure the interface is optimized for both Mouse/Keyboard (Desktop) and Touch (Mobile).
2.  **Visual Excellence:** Evaluate the "Cyberpunk Crypto" aesthetic against modern premium standards.
3.  **Hierarchy & Information Design:** Check if critical information (Price, HP, PnL) is clearly visible and readable.
4.  **Feedback & Micro-interactions:** Ensure every action has appropriate visual/haptic/audio feedback.
5.  **Aesthetics Audit:** Detect generic colors, poor spacing, or "MVP-style" layouts.

## 📋 Evaluation Checklist

### 1. Visual Design (Aesthetics)
- [ ] **Color Palette:** Are we using premium HSL-tailored colors or generic defaults?
- [ ] **Typography:** Is the font choice consistent? Are the headings vs body text clear?
- [ ] **Glows & Gradients:** Are they adding depth or making things messy?
- [ ] **Theme Consistency:** Does "Retro" vs "Cyber" feel cohesive?

### 2. Mobile Experience (Touch-First)
- [ ] **Safe Areas:** Is the HUD avoiding notches and home indicators?
- [ ] **Button Sizes:** Are hit targets at least 44x44px?
- [ ] **Thumb Zone:** Is critical navigation reachable with one thumb?
- [ ] **Text Size:** Is the text readable on a small screen (minimum 12px)?

### 3. Desktop Experience (Mouse/Keyboard)
- [ ] **Hover States:** Do all interactive elements have visual hover feedback?
- [ ] **Keyboard Nav:** Can the user navigate menus using Arrow Keys/WASD/Enter?
- [ ] **Screen Real Estate:** Are we using the wider aspect ratio effectively (e.g. Leaderboard sidebars)?

### 4. Gameplay HUD (In-Game UX)
- [ ] **Clutter:** Is the screen too crowded with debug panels or overlapping HUD elements?
- [ ] **Visual Hierarchy:** Does the HP bar stand out enough? Is the Price color change (Green/Red) intuitive?
- [ ] **Announcements:** Are "Level Up" or "Cycle Complete" transitions too jarring or too subtle?

## 📝 Report Format

When generating a report, follow this structure:

### 🌟 UI/UX Status Report: [Component/Section Name]

#### 🖥️ Desktop Assessment
- **Pros:** [What works well]
- **Cons:** [Identified issues]
- **Priority:** [High/Medium/Low]

#### 📱 Mobile Assessment
- **Pros:** [What works well]
- **Cons:** [Identified issues]
- **Priority:** [High/Medium/Low]

#### 🎨 Aesthetic & Thematic Evaluation
- [Brief comment on Cyberpunk/Crypto feel]

#### 🚀 Recommended Improvements
1.  **Item 1:** [Clear instruction for the developer]
2.  **Item 2:** [Clear instruction for the developer]

---

## 🛠️ How to trigger this skill
Usually triggered when a user asks for a "UI/UX Review" or "Design Audit". Use it to analyze specific components like `GameUI`, `MainMenu`, or `SettingsPanel`.
