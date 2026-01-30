---
name: UI Polisher
description: Comprehensive UI refinement agent for Landing Page and Documentation sections. Ensures pixel-perfect consistency across mobile and desktop viewports with responsive excellence.
---

# 🎨 UI Polisher Skill

Landing Page ve Documentation bölümlerini hem mobil hem desktop için profesyonel standartlara çeken, görsel tutarlılık sağlayan ve responsive mükemmelliği garanti eden uzman yetenek.

## 🎯 Scope & Objectives

### Target Components
1. **Landing Page** (`components/LandingPage.tsx`)
2. **Documentation Pages** (`docs/` klasörü ve ilgili UI componentleri)
3. **Shared UI Elements** (Navigation, Footer, Cards, Buttons)

### Core Objectives
| Objective | Mobile | Desktop |
|-----------|--------|---------|
| Visual Consistency | ✅ | ✅ |
| Responsive Layouts | ✅ | ✅ |
| Typography Scale | ✅ | ✅ |
| Touch/Click Targets | ✅ | ✅ |
| Animation Performance | ✅ | ✅ |
| Accessibility (a11y) | ✅ | ✅ |

## 📱 Mobile-First Checklist

### Viewport & Layout
- [ ] **Breakpoint Coverage**: `sm (640px)`, `md (768px)`, `lg (1024px)`, `xl (1280px)` tüm breakpointlerde test edildi mi?
- [ ] **Safe Area (Notch)**: iOS notch ve Android punch-hole alanları hesaba katıldı mı? (`env(safe-area-inset-*)`)
- [ ] **Viewport Units**: `dvh` (dynamic viewport height) mobil tarayıcı toolbar'ları için kullanılıyor mu?
- [ ] **Horizontal Scroll**: Yatay scroll oluşturan overflow var mı? (width: 100vw tehlikesi)

### Touch Targets
- [ ] **Minimum Size**: Tüm interaktif elementler minimum 44x44px touch target'a sahip mi?
- [ ] **Spacing**: Butonlar arası minimum 8px boşluk var mı? (Fat finger prevention)
- [ ] **Tap Highlight**: `-webkit-tap-highlight-color` düzgün ayarlanmış mı?

### Typography (Mobile)
- [ ] **Base Font**: Minimum 16px (iOS zoom engellemek için)
- [ ] **Line Height**: `leading-relaxed` veya minimum 1.5 oranı
- [ ] **Heading Scale**: H1 mobile'da `text-2xl` (24px) ile `text-4xl` (36px) arasında mı?
- [ ] **Text Truncation**: Uzun metinler için `truncate` veya `line-clamp-*` kullanılıyor mu?

### Navigation (Mobile)
- [ ] **Hamburger Menu**: 768px altında hamburger menü aktif mi?
- [ ] **Menu Animation**: Slide-in animasyonu akıcı mı? (300ms, ease-out)
- [ ] **Backdrop**: Menü açıkken arka plan karartılıyor mu? (`backdrop-blur`)
- [ ] **Close on Outside Click**: Dışarı tıklandığında menü kapanıyor mu?

## 🖥️ Desktop Excellence Checklist

### Layout & Grid
- [ ] **Max Width**: Content container `max-w-7xl` veya benzeri sınırlı mı?
- [ ] **Grid System**: CSS Grid/Flexbox tutarlı kullanılıyor mu?
- [ ] **Whitespace**: Section aralarında yeterli padding (`py-16` veya `py-24`)?
- [ ] **Alignment**: Tüm elementler grid'e align edilmiş mi?

### Typography (Desktop)
- [ ] **Heading Hierarchy**: H1 > H2 > H3 boyut sırası korunuyor mu?
- [ ] **Reading Width**: Paragraph max-width `65ch` ile sınırlı mı? (Optimal okuma)
- [ ] **Font Pairing**: Başlık ve gövde fontları uyumlu mu?

### Hover & Focus States
- [ ] **Hover Effects**: Tüm interaktif elementlerde hover state var mı?
- [ ] **Focus Visible**: Keyboard navigation için `focus-visible` outline var mı?
- [ ] **Cursor**: Doğru cursor tipi (`pointer`, `text`, `not-allowed`) kullanılıyor mu?
- [ ] **Transition**: Hover geçişleri `transition-all duration-300` ile akıcı mı?

### Navigation (Desktop)
- [ ] **Sticky Header**: Scroll'da header sticky kalıyor mu?
- [ ] **Active State**: Aktif sayfa/section navigasyonda vurgulanıyor mu?
- [ ] **Dropdown Menus**: Hover'da açılan menüler için hover delay var mı? (150ms)

## 🎨 Design System Compliance

### Color Tokens
```typescript
// Kullanılması gereken renkler
const DESIGN_TOKENS = {
  // Primary
  gold: '#d6b85c',      // CTA, ödüller, vurgular
  red: '#b22222',       // Sistem durumu, güvenlik, uyarılar
  
  // Neutrals
  dark: '#1a1a2e',      // Background (Dark mode)
  light: '#f5f5f5',     // Background (Light mode)
  
  // Semantic
  success: '#22c55e',   // Başarı mesajları
  error: '#ef4444',     // Hata mesajları
  warning: '#f59e0b',   // Uyarılar
};
```

### Spacing Scale
- `4px` (p-1), `8px` (p-2), `16px` (p-4), `24px` (p-6), `32px` (p-8), `48px` (p-12), `64px` (p-16)
- **Kural**: Rastgele değerler (`p-[13px]`) yerine scale'den seç.

### Border Radius
- **Buttons**: `rounded-lg` (8px)
- **Cards**: `rounded-xl` (12px)
- **Modals**: `rounded-2xl` (16px)
- **Retro Mode**: `rounded-none` + `shadow-[4px_4px_0px_...]`

## 📄 Documentation UI Specifics

### Doc Page Layout
- [ ] **Sidebar**: Sol tarafta sticky navigation (desktop)
- [ ] **TOC (Table of Contents)**: Sağ tarafta section linkleri (desktop)
- [ ] **Mobile Drawer**: Mobilde sidebar drawer olarak açılıyor mu?
- [ ] **Breadcrumbs**: Sayfa hiyerarşisi görünür mü?

### Code Blocks
- [ ] **Syntax Highlighting**: Dil bazlı renklendirme aktif mi?
- [ ] **Copy Button**: Kod bloklarında kopyalama butonu var mı?
- [ ] **Line Numbers**: Opsiyonel satır numaraları gösterilebiliyor mu?
- [ ] **Overflow**: Horizontal scroll içeren kod blokları düzgün görünüyor mu?

### Content Elements
- [ ] **Tables**: Responsive table (`overflow-x-auto` wrapper)
- [ ] **Images**: Lazy loading ve responsive srcset
- [ ] **Callouts**: Info/Warning/Tip blokları stilize mi?
- [ ] **Links**: External linkler yeni sekmede açılıyor mu? (`target="_blank"`)

## 🔧 Implementation Process

### 1. Audit Phase
```bash
# Analiz için dosyaları incele
view components/LandingPage.tsx
view docs/
grep "className" components/LandingPage.tsx
```

### 2. Mobile Testing Matrix
| Device | Width | Test Items |
|--------|-------|------------|
| iPhone SE | 375px | Small screen edge cases |
| iPhone 14 Pro | 393px | Standard mobile |
| iPad Mini | 768px | Tablet breakpoint |
| iPad Pro | 1024px | Tablet landscape |

### 3. Desktop Testing Matrix  
| Screen | Width | Test Items |
|--------|-------|------------|
| Laptop | 1280px | Common laptop |
| Desktop | 1440px | Standard desktop |
| Wide | 1920px | Full HD |
| Ultra-wide | 2560px | Max-width container test |

### 4. Fix Priority Order
1. **P0 - Critical**: Broken layouts, unreadable text, inaccessible buttons
2. **P1 - High**: Inconsistent spacing, wrong colors, missing hover states
3. **P2 - Medium**: Animation polish, micro-interactions
4. **P3 - Low**: Pixel-perfect alignment, subtle shadows

## ✅ Quality Gates

Before marking complete:
- [ ] All checklist items verified
- [ ] Mobile Chrome DevTools responsive test passed
- [ ] Desktop 1920px+ no horizontal scroll
- [ ] Lighthouse Accessibility score ≥ 90
- [ ] No console errors related to styling
- [ ] Theme toggle works (Light/Dark/Retro)

## 📝 Output Format

Audit sonrası şu formatta rapor üret:

```markdown
## UI Polish Report - [Component Name]

### 🔴 Critical Issues (P0)
- Issue description + file:line + fix suggestion

### 🟠 High Priority (P1)
- Issue description + file:line + fix suggestion

### 🟡 Medium Priority (P2)
- Issue description + file:line + fix suggestion

### 🟢 Low Priority (P3)
- Issue description + file:line + fix suggestion

### ✅ Passing Checks
- List of verified items
```

## 🔗 Related Skills
- `landing-page-perfectionist` - Landing page specific deep dive
- `mobile-polish` - Game HUD mobile optimization
- `ui-animation-polish` - Animation and transitions
- `documentation-system` - Doc content management
