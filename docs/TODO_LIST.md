# 📋 Yapılacaklar ve İyileştirmeler Listesi

**Tarih**: 2026-01-18  
**Son Kontrol**: Supabase Advisors, Lint, Tests, Roadmap

---

## 🔴 Kritik (Hemen Yapılmalı)

### Hiçbir şey yok! ✅

Tüm kritik sorunlar düzeltildi:
- ✅ RLS güvenlik açıkları kapatıldı
- ✅ Veri akışı düzeltildi (UPSERT pattern)
- ✅ Edge function UUID döndürüyor
- ✅ Lint 0 hata
- ✅ Testler geçiyor (1431/1431)

---

## 🟡 Orta Öncelikli (Performans İyileştirmeleri)

### Supabase Performance Advisories

| Sorun | Tablo | Öneri | Etki |
|-------|-------|-------|------|
| Eksik FK indeksi | `player_achievements.achievement_id` | INDEX ekle | Orta |
| Eksik FK indeksi | `player_achievements.session_id` | INDEX ekle | Orta |
| Eksik FK indeksi | `player_inventory.item_id` | INDEX ekle | Orta |
| Eksik FK indeksi | `verification_failures.session_id` | INDEX ekle | Düşük |
| Kullanılmayan index | `idx_market_state_whale_tier` | Kaldır veya bekle | Düşük |
| Kullanılmayan index | `idx_price_logs_pair_timestamp` | Kaldır veya bekle | Düşük |
| Kullanılmayan index | `idx_coin_transactions_player` | Kaldır veya bekle | Düşük |
| Kullanılmayan index | `idx_withdrawal_status` | Kaldır veya bekle | Düşük |

**Düzeltme SQL:**
```sql
-- Eksik FK indekslerini ekle
CREATE INDEX IF NOT EXISTS idx_player_achievements_achievement_id 
  ON player_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_session_id 
  ON player_achievements(session_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_item_id 
  ON player_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_verification_failures_session_id 
  ON verification_failures(session_id);
```

---

## 🟢 Düşük Öncelikli (Gelecek İyileştirmeler)

### Kodda Bulunan TODO'lar

| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `tests/screens/CycleCompleteScreen.test.tsx` | 138 | CardIcons mock fix (test env) |

### Master Roadmap'ten Bekleyen İşler

| Kategori | Task | Öncelik |
|----------|------|---------|
| **Anti-Cheat** | Session signing | ⭐⭐⭐⭐⭐ |
| **Anti-Cheat** | Replay hash verification | ⭐⭐⭐⭐ |
| **Anti-Cheat** | Client obfuscation | ⭐⭐⭐ |
| **Anti-Cheat** | DevTools detection | ⭐⭐⭐ |
| **PWA** | Manifest + icons | ⭐⭐⭐⭐ |
| **PWA** | Service worker (offline) | ⭐⭐⭐ |
| **PWA** | Install prompt | ⭐⭐⭐ |
| **UI/UX** | Tutorial/Onboarding | ⭐⭐ |
| **Web3** | Wallet Connect | ⬜ (Gelecek) |
| **Web3** | NFT Contract | ⬜ (Gelecek) |
| **Native** | Capacitor | ⬜ (Gelecek) |
| **Native** | App Store submission | ⬜ (Gelecek) |

---

## 📊 Mevcut Durum Özeti

| Kontrol | Durum |
|---------|-------|
| **Supabase Security** | ✅ 0 hata |
| **Supabase Performance** | 🟡 8 INFO (kritik değil) |
| **ESLint** | ✅ 0 hata, 0 uyarı |
| **Unit Tests** | ✅ 1431 geçti |
| **Railway Services** | ✅ 2/2 aktif |
| **Edge Functions** | ✅ 2/2 aktif |
| **Veri Akışı** | ✅ Düzeltildi |
| **RLS Policies** | ✅ Düzeltildi |

---

## 🚀 Önerilen Sonraki Adımlar

### Hemen (Bugün)
1. ~~Deploy değişiklikleri Railway'e~~ (opsiyonel - testler geçiyor)

### Bu Hafta
1. **FK indekslerini ekle** (5 dk migration)
2. **PWA manifest oluştur** (30 dk)
3. **Service worker ekle** (1 saat)

### Gelecek Sprint
1. Anti-cheat session signing
2. Replay verification
3. Tutorial/Onboarding

---

## 🎯 Karar Noktaları

| Karar | Seçenekler | Durum |
|-------|-----------|-------|
| NFT blockchain | Solana vs Polygon | ⬜ Bekliyor |
| Monetizasyon | Free-to-play vs NFT-gated | ⬜ Bekliyor |
| Token | Mevcut vs yeni token | ⬜ Bekliyor |

---

## ✅ Sonuç

**Kritik sorun yok!** Proje stabil durumda. 

Performans indeksleri eklenebilir ama acil değil - oyun zaten çalışıyor.
