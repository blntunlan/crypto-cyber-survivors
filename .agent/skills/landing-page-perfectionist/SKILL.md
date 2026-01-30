---
name: Landing Page Perfectionist
description: Master-level audit and refinement system for the Landing Page. Detects inconsistencies, standardizes design tokens, and ensures a "Tier-1" corporate-cyber aesthetic.
---

# Landing Page Perfectionist Skill

Bu yetenek, projenin Landing Page (`LandingPage.tsx`) bileşenini en yüksek profesyonel standartlara çekmek, görsel tutarsızlıkları gidermek ve teknik bütünlüğü korumak için tasarlanmıştır.

## 🎯 Objectives (Hedefler)
1.  **Visual DNA Consistency:** "Casino-Cyber Mix" estetiğinin (Kırmızı/Altın/Eski Terminal) her pikselde tutarlı olmasını sağlamak.
2.  **Structural Integrity:** Sayfa bölümlerinin dökümantasyon standartlarına (Manifesto) uygunluğunu denetlemek.
3.  **Responsive Excellence:** Desktop'ta devasa, Mobile'da ise kompakt ve hatasız bir deneyim sunmak.
4.  **Interactive Precision:** Tema geçişleri, navigasyon linkleri ve CTA butonlarının kusursuz çalışması.

## 📋 The "Infinite Polish" Checklist

### 1. Navigation & Branding
- [ ] **Logo Clearance:** Marka isminin sağındaki navigasyon öğeleriyle arası yeterince açık mı? (Minimum 64px padding-right).
- [ ] **Protocol Button:** Tema değiştirici butonu mevcut temayı mı gösteriyor yoksa hedef temayı mı? (Etiket netliği).
- [ ] **Active State:** Scroll edilen bölüm navigasyonda görsel olarak vurgulanıyor mu? (İlerleyen aşamada eklenebilir).

### 2. Hero Section (First Impression)
- [ ] **Typography Scale:** "VOLATILITY" metni mobilde taşıyor mu? Responsive ölçeklendirme doğru mu?
- [ ] **Terminal Simulation:** Teknik terminaldeki veriler (Latency, Memory) gerçekçi mi? Animasyonlar akıcı mı?
- [ ] **CTA Balance:** "START SURVIVAL" dominantlığı korunuyor mu? GitHub linki ile arasındaki görsel hiyerarşi doğru mu?

### 3. Engineering & Manifesto Sections
- [ ] **Grid Harmony:** Manifesto kartlarının yükseklikleri eşit mi? İçerik yoğunluğu dengeyi bozuyor mu?
- [ ] **Iconography:** Lucide ikonlarının kullanımı bölüme uygun mu? (Cpu, Shield, Activity).
- [ ] **Theme Transitions:** Retro mode'da 8-bit gölgeler (shadow-[4px_4px_0px_...]) tüm kartlarda uygulanmış mı?

### 4. Logic & Dev Flow
- [ ] **Context Logic:** `useTheme` hook'u doğru parametrelerle (isTransitioning, toggleTheme) kullanılıyor mu?
- [ ] **Annotation Integrity:** Kod içindeki Section Marker'lar (--- 01. NAV --- vb.) JSX yorumları olarak `{}` içinde mi?

### 5. Utilities & Footer
- [ ] **Scroll Logic:** "Back to Top" butonu tüm sayfalarda ve mobile viewportlarda erişilebilir mi?
- [ ] **Legal Links:** Privacy ve Terms linklerinin hover efektleri navigasyon ile tutarlı mı?

## 🎨 Design Rules (The Manifesto)
- **Primary Gold (#d6b85c):** Sadece ödül, başarı, tema geçişi ve ana CTA'lar için kullanılır.
- **Primary Red (#b22222):** Sistem durumu, güvenlik, hile koruması ve ikincil navigasyon vurguları için kullanılır.
- **Micro-interactions:** Her buton en az `active:scale-95` ve `transition-all` (300ms) içermelidir.
- **Retro Rule:** Retro mode aktifken butonlara ve kartlara `shadow-[4px_4px_0px_...]` eklenmelidir.

## 📝 How to Use this Skill
Bu yeteneği kullanırken:
1.  **Analyze:** `view_file` ile `LandingPage.tsx` dosyasını oku.
2.  **Audit:** Yukarıdaki checklist üzerinden eksikleri saptanmış bir rapor oluştur.
3.  **Refine:** Standartlara uymayan her satırı `replace_file_content` ile modernize et.
4.  **Validate:** JSX yorumlarının doğruluğunu ve exportların bütünlüğünü kontrol et.
