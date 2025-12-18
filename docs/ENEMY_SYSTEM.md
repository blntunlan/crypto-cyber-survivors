# 👾 Enemy System Reference

## Enemy Types (6 Total)

| Tip | Icon | Renk | Spawn % |
|-----|------|------|---------|
| Bear | 🐻 | Kırmızı | 60% |
| Bull | 🐂 | Yeşil | 25% |
| FUD | 📰 | Gri | 10% |
| Whale | 🐋 | Mor | 5% |
| Liquidator | 💣 | Turuncu | 8% |
| PumpDump | 🌪️ | Yeşil Neon | 6% |

---

## Detaylı Stats

### 🐻 Bear (Temel Düşman)
| Stat | Değer |
|------|-------|
| HP | 50 |
| Speed | 1.6 |
| Damage | 10 |
| Radius | 14 |
| EXP | 10 |
| Gems | 15 |
| Hareket | Chase (düz takip) |

---

### 🐂 Bull (Dayanıklı)
| Stat | Değer |
|------|-------|
| HP | 70 |
| Speed | 1.8 |
| Damage | 12 |
| Radius | 16 |
| EXP | 15 |
| Gems | 20 |
| Hareket | Circle (dairesel) |

---

### 📰 FUD (Hızlı & Zayıf)
| Stat | Değer |
|------|-------|
| HP | 30 |
| Speed | 2.2 |
| Damage | 5 |
| Radius | 10 |
| EXP | 8 |
| Gems | 10 |
| Hareket | ZigZag (zikzak) |

---

### 🐋 Whale (Boss)
| Stat | Değer |
|------|-------|
| HP | 300 |
| Speed | 0.8 |
| Damage | 25 |
| Radius | 35 |
| EXP | 100 |
| Gems | 100 |
| Hareket | SlowApproach (yavaş) |

---

### 💣 Liquidator (Patlayıcı)
| Stat | Değer |
|------|-------|
| HP | 40 |
| Speed | 2.0 |
| Damage | 30 |
| Radius | 12 |
| EXP | 20 |
| Gems | 25 |
| Hareket | Explosive (hızlanır) |
| Özel | Yaklaştıkça 1.5x hız |

---

### 🌪️ PumpDump (Büyüyen)
| Stat | Değer |
|------|-------|
| HP | 80 |
| Speed | 1.2 |
| Damage | 15 |
| Radius | 18 |
| EXP | 25 |
| Gems | 30 |
| Hareket | Growing (dalga) |
| Özel | Zamanla büyür |

---

## Hareket Stratejileri

| Strateji | Kullanıcı | Açıklama |
|----------|-----------|----------|
| Chase | Bear | Düz takip |
| ZigZag | FUD | Zikzak hareket |
| Circle | Bull | Etrafta döner |
| SlowApproach | Whale | Yavaş yaklaşır |
| Explosive | Liquidator | Yakınlaşınca hızlanır |
| Growing | PumpDump | Dalga paterni |

---

## Difficulty Scaling

| Zorluk | HP | Speed | Spawn |
|--------|-----|-------|-------|
| 1x | Base | Base | 2000ms |
| 2x | +20% | +10% | 1700ms |
| 3x | +40% | +20% | 1400ms |
| 5x | +80% | +40% | 1000ms |
