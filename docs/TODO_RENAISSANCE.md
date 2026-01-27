# 🚀 Database Renaissance - Master Roadmap

Bu dosya, veritabanının sıfırdan, SOLID ve Scalable (Ölçeklenebilir) bir mimariyle yeniden inşasını takip eder.

## 📅 Durum: BAŞLANGIÇ (2026-01-26)

---

## 🧹 Phase 0: Cleanup & Preparation (Temizlik)
- [ ] Mevcut `supabase/migrations` altındaki eski dosyaların arşivlenmesi/silinmesi.
- [ ] `Supabase.ts` ve servislerdeki eski tablo referanslarının tespiti.
- [ ] Veritabanındaki tüm tabloların `DROP` edilmesi (TRUNCATE değil, tam temizlik).

## 🏛️ Phase 1: Core Identity & Auth (Kimlik Sistemi)
- [ ] `profiles`: Merkezi oyuncu profili (Nickname, XP, Level).
- [ ] `identities`: Multi-auth (Email, Twitter, Discord, Google) mapping.
- [ ] `wallets`: Web3 hazırlığı için cüzdan adresleri (Phantom, MetaMask).
- [ ] `virtual_accounts`: Sanal bakiye (Gold, Gems) ana tablosu.
- [ ] **Verification:** `schema_version` tablosu ve sync kontrol mekanizması.

## 📊 Phase 2: Performance & Error Monitoring (Gözlem Katmanı)
- [ ] `error_logs`: Client-side ve Server-side hataların detaylı (stack trace, device info) kaydı.
- [ ] `performance_metrics`: Cihaz bazlı benchmark verileri (Average FPS, Memory, Device Model, OS).
- [ ] Mobil ve Masaüstü ayrımı için detaylı `metadata` kolonları.

## ⚔️ Phase 3: Gameplay & Anti-Cheat (Oyun ve Doğrulama)
- [ ] `sessions`: Oyun oturumları ve `session_secret` mimarisi.
- [ ] `price_history`: Railway'den gelen saniyelik veriler için optimize edilmiş (Partitioning/BRIN) tablo.
- [ ] `market_state`: Global oyun dinamiklerini etkileyen canlı veriler.
- [ ] **Sync Check:** Backend servisleri ile tablo şeması arasındaki tip uyumu testi.

## 💰 Phase 4: Finance & Ledger (Ekonomi ve Mağaza)
- [ ] `ledger`: Silinemez finansal işlem kayıtları (Immutable Audit Trail).
- [ ] `shop_items`: Ürün tanımları.
- [ ] `inventory`: Oyuncu envanteri.

## 🎁 Phase 5: Rewards & Airdrops (Beta & Early Adopter)
- [ ] `eligibility_criteria`: Ödül kazanma kuralları (Örn: "Beta sürecinde 10 level oldu").
- [ ] `claims`: Hak edilen ödüllerin talep edilme (Claim) sistemi.

---

## 🛠️ Modern Verification Methods (Entegre Edilecekler)
1. **Auto-TypeGen:** `npm run supabase:gen` ile tam tip güvenliği.
2. **Schema Integrity:** Backend servisleri başlatılırken `check_db_version()` RPC çağrısı.
3. **Automated Integration Tests:** Veritabanı ile servislerin uyumunu test eden Vitest suite'leri.

---
*Not: Bu dosya süreç boyunca güncellenecektir.*
