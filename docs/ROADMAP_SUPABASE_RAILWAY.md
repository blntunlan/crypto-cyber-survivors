# 🗺️ Supabase & Railway Entegrasyon Yol Haritası

Bu belge, **Crypto Cyber Survivors** oyununun backend altyapısını oluşturan Supabase ve Railway arasındaki entegrasyonun mevcut durumunu ve gelecek planlarını kapsar.

---

## 🏗️ Mimari Özet

Oyunumuz "Server-Authoritative" (Sunucu Yetkili) bir model izler:
1.  **Railway (The Heartbeat):** Gerçek zamanlı market verilerini (Binance) toplar ve işler.
2.  **Supabase (The Source of Truth):** Kalıcı veri depolama, kullanıcı kimlik doğrulama ve doğrulama mantığı (Edge Functions).
3.  **Frontend:** Kullanıcı etkileşimi ve görselleştirme.

---

## 📌 Yol Haritası (Roadmap)

### ✅ Faz 1: Temel Bağlantı (Tamamlandı)
> Market verilerinin Railway'den Supabase'e güvenli akışını sağlamak.

- [x] **Railway Market Server:** Binance WebSocket entegrasyonu tamamlandı.
- [x] **Veri Akışı:** `price_logs` tablosuna saniyelik veri yazımı optimize edildi.
- [x] **Hata Takibi (V1):** Hem Railway hem Frontend hataları merkezi `error_reports` tablosuna bağlandı.
- [x] **Doğrulama (V1):** `verify-game` Edge Function ile basit PnL ve fiyat doğrulaması kuruldu.

### 🟡 Faz 2: Dayanıklılık ve İzlenebilirlik (Şu Anki Aşama)
> Sistemin kendi kendini denetlemesi ve hataların kolayca tespit edilmesi.

- [x] **Market Health Monitor:** Railway'in veri gönderip göndermediğini kontrol eden SQL RPC ve frontend entegrasyonu tamamlandı.
- [x] **Hata Analitiği:** `ErrorTracker` verilerini kullanarak en sık karşılaşılan hataları raporlayan Admin paneli görünümü eklendi.
- [ ] **Gelişmiş Sanitizasyon:** Hata raporlarından hassas kullanıcı verilerinin (tokenlar, şifreler) tamamen temizlenmesi.
- [x] **Otomatik Temizleme:** `price_logs` ve eski hataların `pg_cron` ile otomatik temizlenmesi kuruldu.

### ✅ Faz 3: Gerçek Zamanlı Senkronizasyon (Tamamlandı)
> Kullanıcı deneyimini iyileştiren anlık bildirimler.

- [x] **Market State Cache:** `market_state` tablosu üzerinden hızlı veri erişimi ve `MarketStateService` entegrasyonu tamamlandı.
- [x] **Supabase Realtime:** `MarketStateService` ile anlık fiyat ve indikatör güncellemeleri, kesinti anında (`marketDataTimeout`) otomatik uyarı sistemi kuruldu.
- [x] **Gelişmiş Uyarılar:** RSI ve Whale Tier değişimleri için oyun içi görsel efektler (EffectRenderer) ve HUD bildirimleri (MarketAnnouncer) eklendi.
- [x] **Fallback Feeds:** Railway tarafında Binance kesilirse otomatik olarak Coinbase (Ticker) API'sine geçiş sistemi (`CoinbaseService`) kuruldu.

### ✅ Faz 4: Güvenlik ve Anti-Cheat Evrimi (Tamamlandı)
> Hileleri engellemek ve veri bütünlüğünü korumak.

- [x] **Signed Payloads:** Oyun oturumu verilerinin sunucu tarafında başlatılması (`start-session`) ve doğrulanması (`verify-game`). `start_time` manipülasyonu engellendi.
- [x] **Anomali Tespiti:** İmkansız PnL/Zaman oranlarına sahip oyuncuların otomatik tespiti (PnL Velocity Check).
- [x] **Session Replay Altyapısı:** `InputLogger` servisi ile kritik oyun olaylarının (hit, combo, level-up) kaydedilmesi ve Supabase Storage'a (`session-replays`) yüklenmesi.
- [x] **Shadow Ban:** 3+ şüpheli oturum (24s içinde) tespit edilen oyuncular otomatik olarak "Shadow Ban" moduna alınır ve Leaderboard'dan gizlenir.

### 💰 Faz 5: Ekonomi ve İlerleme (Şu Anki Aşama)
> Oyuncu bağlılığını artıracak ilerleme sistemleri.

- [x] **Achievements Altyapısı:** `achievements` ve `player_achievements` tablolarının oluşturulması.
- [x] **Sanal Cüzdan:** `players` tablosuna Gold/Coin bakiyesi ekleme ve `player_wallets` işlem günlüğü. (DB Trigger ile otomatik)
- [x] **Achievement Trigger:** Oyun içi olayların (Kill, Level, PnL) başarımları tetiklemesi (`verify-game` Edge Function içinde).
- [x] **Mağaza (Shop):** Kazanılan Gold ile kalıcı özellik (meta-progression) satın alma altyapısı (`shop_items` ve `purchase_item` SQL fonksiyonu).
- [x] **Haftalık Leaderboard:** `leaderboard` view'inin haftalık sıfırlanan versiyonu (`weekly_leaderboard`).

### 🎮 Faz 6: Oyun Döngüsü ve UI Cilası (Şu Anki Aşama)
> Yeni sistemlerin (Shop, Achievements, Wallet) ön yüze entegrasyonu.

- [x] **Data Services:** `ShopService`, `AchievementService` ve `WalletService` frontend implementasyonu.
- [ ] **Profile Screen:** Oyuncu profili, başarımlar ve cüzdan geçmişi ekranı.
- [ ] **Profile Screen:** Oyuncu profili, başarımlar ve cüzdan geçmişi ekranı.
- [ ] **Shop Screen:** Eşya satın alma arayüzü ve envanter yönetimi.
- [ ] **HUD Entegrasyonu:** Oyun içi Gold toplama ve canlı bildirimler.

---

## 🛠️ Teknik Entegrasyon Detayları

### Railway -> Supabase İletişimi
- **Method:** HTTPS (PostgREST via Supabase JS SDK)
- **Güvenlik:** `SUPABASE_SERVICE_ROLE_KEY` (RLS Bypass)
- **Performans:** Saniyede 1 toplu (batch) yazma işlemi.

### Supabase -> Client İletişimi
- **Method:** WebSockets (Supabase Realtime)
- **Doğrulama:** Supabase Edge Functions (Deno Runtime)

---

## 📈 İzleme (Monitoring)
Sistemin sağlığını şu tablo üzerinden takip edebilirsiniz:
- `error_reports`: Tüm sistem hataları (Frontend + Railway + Edge Functions).
- `price_logs`: Market verisi sürekliliği.
- `game_sessions`: Doğrulama başarı oranları.

---
*Son Güncelleme: 12 Ocak 2026*
