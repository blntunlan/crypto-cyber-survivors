# Modular Theme UI System Plan

This document proposes a system to modularize UI elements that change appearance based on the active theme ("Cyberpunk" vs. "Retro 16-Bit"). The goal is to eliminate repetitive `isRetro ? ... : ...` logic scattered throughout the codebase and strictly separate structural logic from presentational styling.

## 1. The Problem
Currently, components handle theme differences via inline conditional logic:
```tsx
// Example of current "Anti-Pattern"
<div className={`${isRetro ? 'border-2 border-zinc-700 rounded-none' : 'border border-white/10 rounded-xl backdrop-blur-md'}`}>
  {/* Content */}
</div>
```
This leads to:
-   **Code Duplication:** The same retro vs. modern class strings are repeated.
-   **Maintenance Difficulty:** Changing the "Retro" look requires hunting down every ternary operator.
-   **Visual Inconsistency:** different components might implement "Retro" slightly differently.

## 2. The Solution: "Themed Primitives"
We will create a set of base UI components (Primitives) that internally handle theme switching based on the current context.

### A. Theme Variant Configuration
We will define style maps for each primitive type. This is purely configuration data, likely in `config/themeVariants.ts`.

```typescript
// config/themeVariants.ts
export const PANEL_VARIANTS = {
  modern: "bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]",
  retro: "bg-zinc-900 border-2 border-zinc-700 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.5)]",
};

export const BUTTON_VARIANTS = {
  primary: {
    modern: "rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:shadow-cyan-500/25",
    retro: "rounded-none border-2 border-white bg-blue-600 hover:bg-blue-500 active:translate-y-1 active:shadow-none",
  },
  // ... secondary, danger, etc.
};
```

### B. Themed Components
We will create wrapper components in `components/themed/`.

#### 1. `ThemedPanel`
A container that adapts its frame, border, and background.
```tsx
import { useTheme } from '../../contexts/useTheme';
import { PANEL_VARIANTS } from '../../config/themeVariants';

export const ThemedPanel = ({ children, className, ...props }) => {
  const { isRetro } = useTheme();
  const variantClass = isRetro ? PANEL_VARIANTS.retro : PANEL_VARIANTS.modern;
  
  return (
    <div className={`${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
```

#### 2. `ThemedButton`
A comprehensive button that handles fonts, borders, and hover states.
```tsx
export const ThemedButton = ({ intent = 'primary', children, ...props }) => {
    const { isRetro } = useTheme();
    // Selects variant based on intent (primary, danger) and theme
    // ...
}
```

#### 3. `ThemedText`
Handles font families automatically (`font-display` vs `font-sans`).
```tsx
// Automatically ensures Retro uses pixel fonts for headers
<ThemedText variant="h1">Title</ThemedText> 
```

## 3. Implementation Phases

### Phase 1: Setup
1.  Create `config/themeVariants.ts`.
2.  Create `components/themed/` directory.
3.  Implement `ThemedPanel`, `ThemedButton`, `ThemedText`.

### Phase 2: Refactor HUD
1.  Replace manual logic in `LeaderboardPanel` with `<ThemedPanel>`.
2.  Replace manual logic in `NicknameEntryScreen` with `<ThemedPanel>` and `<ThemedInput>`.

### Phase 3: Core UI Refactor
1.  Update `MainMenu` to use `<ThemedButton>` primitives.
2.  Update `SettingsPanel`.

## 4. Benefits
-   **"Design Once, Update Everywhere":** Tweak the Retro look in *one* file.
-   **Cleaner Component Code:** Logic focuses on behavior, not styling conditionals.
-   **Scalable:** Adding a 3rd theme (e.g., "Minimalist") becomes trivial involved adding a key to the variant map.
