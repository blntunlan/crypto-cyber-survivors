---
name: asset-management
description: Manage game assets, icons, sprites, and background generation
---

# Asset Management Skill

Oyun içi görselleri, ikonları ve asset pipeline'ını yönet.

## Usage

```
/asset-management [type] [action]
```

**Types**: `icon`, `enemy-sprite`, `background`, `particle`.

## Guidelines

### 1. Sprite Generation
Enemy veya player sprite'ları için `generate_image` tool'unu kullan. 
Promptlarda "pixel art", "cyberpunk", "crypto theme" keyword'lerini kullan.

### 2. Format & Sizes
- **Icons**: SVG (preferred) veya transparent PNG.
- **Sprites**: PNG. Max size genelde 64x64 veya 128x128 olmalı.
- **Backgrounds**: 1920x1080 (veya döngüsel - tiling - yapıda).

### 3. Tiling Backgrounds
Arka planın sonsuz döngüde (tiling) olması oyun için kritiktir. 
`generate_image` ile oluşturulan görsellerin kenarlarının eşleştiğinden emin ol.

## Directory Structure

```
public/
├── assets/
│   ├── enemies/    # Düşman sprite'ları
│   ├── players/    # Oyuncu sprite'ları
│   ├── icons/      # UI ikonları (SVG)
│   └── effects/    # Mermiler, patlamalar
└── background/     # Tiling background görselleri
```

## Adding New Assets

1. **Generate**: `generate_image` ile görseli oluştur.
2. **Optimize**: TinyPNG veya benzeri bir logic ile (agent tool'u varsa) optimize et.
3. **Register**: `constants.ts` veya ilgili config dosyasına path ekle.
4. **Preload**: `AssetLoader` servisinde asset'i sıraya al.

## Aesthetic Rules
- **Crypto Theme**: Her asset bir kripto parayı veya blockchain konseptini anımsatmalı.
- **Cyberpunk Color Palette**: Neon mavisi, mor ve parlak yeşil tonları.
- **Consistency**: Tüm sprite'ların aynı pixel density'de olduğundan emin ol.

## Checklist

- [ ] Transparent background (PNG) kontrol edildi mi?
- [ ] Asset boyutu performansı etkileyecek kadar büyük mü?
- [ ] `AssetLoader` tarafından başarıyla yüklendi mi?
- [ ] Aspect ratio'lar doğru mu?
