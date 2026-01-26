---
name: localization-i18n
description: Manage multi-language support (English/Turkish) and translation keys
---

# Localization (i18n) Skill

Oyunun çoklu dil desteğini (İngilizce/Türkçe) yönet ve yeni çeviri anahtarları ekle.

## Usage

```
/localization-i18n [key] [value]
```

## Project Setup

Oyun `i18next` veya custom bir context-based switching logic kullanır.

- **English (en)**: `public/locales/en/common.json`
- **Turkish (tr)**: `public/locales/tr/common.json`

## Workflow

### 1. Yeni Metin Ekleme

Bir component'e metin eklerken hardcoded yazmak yerine:
1. `common.json` dosyalarına key ekle.
2. Kod içinde `t('key_name')` fonksiyonunu kullan.

### 2. Market-Specifc Translations

Kripto terimlerinin doğru çevrildiğinden emin ol:
- `Long`: Boğa / Yükseliş
- `Short`: Ayı / Düşüş
- `Volatility`: Oynaklık

## Implementation Helper

```typescript
// Component içinde
const { t } = useTranslation();
<h1>{t('menu.start_game')}</h1>
```

## Guidelines

- **Naming**: Key'ler hiyerarşik olmalı: `menu.stats.health`, `game.popups.levelup`.
- **Interpolation**: Değişken içeren metinler için placeholder kullan: `score: "{{val}} BTC"`.
- **Fallback**: Eğer bir dilde karşılık yoksa her zaman English (default) gösterilmeli.

## Checklist

- [ ] Her iki dilde de key mevcut mu?
- [ ] Karakter sınırları kontrol edildi mi? (Türkçe kelimeler bazen İngilizce'ye göre daha uzundur, UI'da taşma yapabilir).
- [ ] Font supporting symbols (₺, $, BTC) emoji ve özel karakterler düzgün görünüyor mu?

## Code References

- `contexts/LanguageContext.tsx`: Main context switcher.
- `public/locales/`: JSON translation files.
