---
description: Step-by-step workflow for polishing Landing Page and Documentation UI across mobile and desktop viewports.
---

# 🎨 UI Polisher Workflow

Landing Page ve Documentation bölümlerinin hem mobil hem desktop için sistematik şekilde iyileştirilmesi için adım adım iş akışı.

## 🚀 Quick Start

```bash
# Bu workflow'u başlatmak için:
# 1. Hedef bileşeni belirle (landing-page | documentation | both)
# 2. Viewport'u belirle (mobile | desktop | all)
```

## 📋 Workflow Stages

### Stage 1: Discovery & Audit (15 dk)

#### 1.1 Component Mapping
```bash
# Landing Page yapısını incele
view components/LandingPage.tsx

# Documentation yapısını incele  
view docs/

# Ortak UI componentlerini bul
glob "components/**/*{Nav,Header,Footer,Card,Button}*.tsx"
```

#### 1.2 Current State Analysis
- [ ] Mevcut breakpoint kullanımını tespit et
- [ ] Responsive class'ları listele (`sm:`, `md:`, `lg:`, `xl:`)
- [ ] Eksik responsive tanımları not et

#### 1.3 Theme Compatibility Check
- [ ] Light mode görünümü
- [ ] Dark mode görünümü
- [ ] Retro mode görünümü

---

### Stage 2: Mobile Audit (20 dk)

#### 2.1 Viewport Simulation
```
Chrome DevTools → Device Toolbar → Test Devices:
├── iPhone SE (375px)
├── iPhone 14 Pro (393px)
├── Samsung Galaxy S21 (360px)
├── iPad Mini (768px)
└── iPad Pro (1024px)
```

#### 2.2 Mobile Checklist Execution
Run through `.agent/skills/ui-polisher/SKILL.md` Mobile-First Checklist:

**Viewport & Layout**
- [ ] Breakpoint coverage verified
- [ ] Safe area (notch) handled
- [ ] No horizontal scroll

**Touch Targets**
- [ ] Min 44x44px targets
- [ ] 8px button spacing
- [ ] Tap highlight configured

**Typography**
- [ ] 16px minimum font
- [ ] Proper line height
- [ ] Responsive headings

**Navigation**
- [ ] Hamburger menu working
- [ ] Smooth animations
- [ ] Outside click closes menu

#### 2.3 Mobile Issues Log
```markdown
| Issue | File:Line | Priority | Status |
|-------|-----------|----------|--------|
| ...   | ...       | P0/P1/P2 | ⏳/✅  |
```

---

### Stage 3: Desktop Audit (20 dk)

#### 3.1 Viewport Simulation
```
Test at these widths:
├── 1280px (Laptop)
├── 1440px (Desktop)
├── 1920px (Full HD)
└── 2560px (Ultra-wide)
```

#### 3.2 Desktop Checklist Execution

**Layout & Grid**
- [ ] Max-width container
- [ ] Consistent grid system
- [ ] Proper whitespace

**Typography**
- [ ] Heading hierarchy
- [ ] 65ch max reading width
- [ ] Font pairing harmony

**Interactions**
- [ ] Hover states present
- [ ] Focus-visible outlines
- [ ] Correct cursors
- [ ] Smooth transitions

**Navigation**
- [ ] Sticky header works
- [ ] Active states visible
- [ ] Dropdown menus functional

#### 3.3 Desktop Issues Log
```markdown
| Issue | File:Line | Priority | Status |
|-------|-----------|----------|--------|
| ...   | ...       | P0/P1/P2 | ⏳/✅  |
```

---

### Stage 4: Implementation (30-60 dk)

#### 4.1 Priority Order
1. **P0 Critical** - Fix immediately
2. **P1 High** - Fix in this session
3. **P2 Medium** - Fix if time permits
4. **P3 Low** - Document for later

#### 4.2 Common Fixes Patterns

**Responsive Container Fix**
```tsx
// Before
<div className="w-full px-4">

// After
<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

**Mobile Typography Fix**
```tsx
// Before
<h1 className="text-5xl">

// After  
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
```

**Touch Target Fix**
```tsx
// Before
<button className="p-2">

// After
<button className="p-2 min-h-[44px] min-w-[44px]">
```

**Hover State Fix**
```tsx
// Before
<button className="bg-gold">

// After
<button className="bg-gold hover:bg-gold/90 transition-colors duration-200">
```

**Safe Area Fix**
```css
/* Add to parent container */
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);
```

#### 4.3 Edit Commands
```bash
# Her fix için edit tool kullan
edit path/to/file.tsx
old_str: "..."
new_str: "..."
```

---

### Stage 5: Validation (10 dk)

#### 5.1 Visual Regression Test
- [ ] Mobile 375px screenshot comparison
- [ ] Desktop 1920px screenshot comparison
- [ ] Theme toggle all 3 modes

#### 5.2 Functional Test
- [ ] All navigation links work
- [ ] All buttons clickable
- [ ] No console errors
- [ ] No layout shift on load

#### 5.3 Performance Check
```bash
# Lighthouse check (if available)
npm run lighthouse -- --only-categories=accessibility
```

#### 5.4 Accessibility Quick Check
- [ ] Color contrast ≥ 4.5:1
- [ ] Focus indicators visible
- [ ] Alt text on images
- [ ] ARIA labels present

---

### Stage 6: Documentation & Commit (5 dk)

#### 6.1 Update Changelog
```markdown
## UI Polish - [Date]

### Landing Page
- Fixed: [description]
- Improved: [description]

### Documentation
- Fixed: [description]
- Improved: [description]
```

#### 6.2 Commit
```bash
git add .
git commit -m "style: polish UI for mobile and desktop responsiveness

- Fix responsive breakpoints in LandingPage
- Add missing hover states
- Improve mobile navigation
- Ensure safe area compliance"
```

---

## 📊 Progress Tracker

```markdown
## Session: [Date]

### Landing Page
- [ ] Stage 1: Discovery
- [ ] Stage 2: Mobile Audit
- [ ] Stage 3: Desktop Audit
- [ ] Stage 4: Implementation
- [ ] Stage 5: Validation
- [ ] Stage 6: Commit

### Documentation
- [ ] Stage 1: Discovery
- [ ] Stage 2: Mobile Audit
- [ ] Stage 3: Desktop Audit
- [ ] Stage 4: Implementation
- [ ] Stage 5: Validation
- [ ] Stage 6: Commit
```

---

## 🔧 Useful Commands

```bash
# Responsive class'ları bul
grep -E "(sm:|md:|lg:|xl:|2xl:)" components/LandingPage.tsx

# Hover state eksiklerini bul
grep -E "className.*bg-" components/ | grep -v "hover:"

# Touch target kontrolü
grep -E "(p-1|p-2|w-6|h-6)" components/

# Safe area kullanımı
grep "safe-area" index.css
```

---

## 🎯 Success Criteria

Bu workflow tamamlandığında:

1. ✅ Landing Page tüm cihazlarda mükemmel görünüyor
2. ✅ Documentation tüm cihazlarda okunabilir
3. ✅ Touch hedefleri yeterli boyutta
4. ✅ Hover/focus states tutarlı
5. ✅ Theme geçişleri sorunsuz
6. ✅ Accessibility score ≥ 90
7. ✅ No horizontal scroll issues
8. ✅ Safe area compliance

---

## 🔗 Related Resources

- **Skill**: `.agent/skills/ui-polisher/SKILL.md`
- **Landing Page Perfectionist**: `.agent/skills/landing-page-perfectionist/SKILL.md`
- **Mobile Polish**: `.agent/skills/mobile-polish/SKILL.md`
- **UI Animation**: `.agent/skills/ui-animation-polish/SKILL.md`
