# 🔄 Frontend ↔ Supabase Veri Eşleştirme Tablosu

**Tarih**: 2026-01-18  
**Durum**: ✅ TÜM EŞLEŞTİRMELER DOĞRU

---

## 📊 game_sessions Tablosu

| Frontend (SessionMetrics) | DB Column | Tip | Eşleşme |
|---------------------------|-----------|-----|---------|
| `session.sessionId` | `session_id` | TEXT | ✅ |
| `session.serverSessionId` | `id` (UUID) | UUID | ✅ |
| `playerId` (UserSession) | `player_id` | UUID | ✅ |
| `session.sessionTimestamp` | `session_timestamp` | TIMESTAMPTZ | ✅ |
| `session.player.survivalTimeMs` | `survival_time_ms` | INTEGER | ✅ |
| `session.gameEndReason` | `end_reason` | TEXT | ✅ |
| `session.player.maxLevel` | `max_level` | INTEGER | ✅ |
| `session.player.totalKills` | `total_kills` | INTEGER | ✅ |
| `session.pair` | `crypto_pair` | TEXT | ✅ |
| `session.bitcoin.positionChosen` | `position_chosen` | TEXT | ✅ |
| `session.bitcoin.leverage` | `leverage` | INTEGER | ✅ |
| `session.bitcoin.priceAtStart` | `entry_price` | NUMERIC | ✅ |
| `session.bitcoin.priceAtEnd` | `exit_price` | NUMERIC | ✅ |
| `session.bitcoin.pnlAtDeath` | `pnl_percent` | NUMERIC | ✅ |
| `session.bitcoin.priceAtStart` | `claimed_entry_price` | NUMERIC | ✅ |
| `session.bitcoin.priceAtEnd` | `claimed_exit_price` | NUMERIC | ✅ |
| `session.bitcoin.pnlAtDeath` | `claimed_pnl` | NUMERIC | ✅ |
| `session.performance.deviceFingerprint` | `device_fingerprint` | TEXT | ✅ |
| `session.verification.isSuspicious` | `is_suspicious` | BOOLEAN | ✅ |
| `session.verification.suspicionReason` | `suspicion_reason` | TEXT | ✅ |
| `new Date()` | `end_time` | TIMESTAMPTZ | ✅ |

---

## 👤 players Tablosu

| Frontend (WalletService) | DB Column | Tip | Eşleşme |
|--------------------------|-----------|-----|---------|
| `getBalance()` | `gold_balance` | INTEGER | ✅ |
| `display_name` | `display_name` | TEXT | ✅ |
| (anti-cheat) | `is_banned` | BOOLEAN | ✅ |
| (anti-cheat) | `is_shadow_banned` | BOOLEAN | ✅ |
| `total_sessions` | `total_sessions` | INTEGER | ✅ |
| `total_kills` | `total_kills` | INTEGER | ✅ |
| `high_score` | `high_score` | INTEGER | ✅ |
| `total_playtime_ms` | `total_playtime_ms` | BIGINT | ✅ |

---

## 🏆 achievements Tablosu

| Frontend (AchievementService) | DB Column | Tip | Eşleşme |
|-------------------------------|-----------|-----|---------|
| `id` | `id` | TEXT | ✅ |
| `name` | `name` | TEXT | ✅ |
| `description` | `description` | TEXT | ✅ |
| `category` | `category` | TEXT | ✅ |
| `icon_key` | `icon_key` | TEXT | ✅ |
| `condition_type` | `condition_type` | TEXT | ✅ |
| `condition_value` | `condition_value` | NUMERIC | ✅ |
| `reward_gold` | `reward_gold` | INTEGER | ✅ |
| `is_active` | `is_active` | BOOLEAN | ✅ |

---

## 🔓 player_achievements Tablosu

| Frontend | DB Column | Tip | Eşleşme |
|----------|-----------|-----|---------|
| `player_id` | `player_id` | UUID | ✅ |
| `achievement_id` | `achievement_id` | TEXT | ✅ |
| `unlocked_at` | `unlocked_at` | TIMESTAMPTZ | ✅ |
| `session_id` | `session_id` | UUID | ✅ |

---

## 🛒 shop_items Tablosu

| Frontend (ShopService) | DB Column | Tip | Eşleşme |
|------------------------|-----------|-----|---------|
| `id` | `id` | TEXT | ✅ |
| `name` | `name` | TEXT | ✅ |
| `description` | `description` | TEXT | ✅ |
| `category` | `category` | TEXT | ✅ |
| `cost_gold` | `cost_gold` | INTEGER | ✅ |
| `effect_type` | `effect_type` | TEXT | ✅ |
| `effect_value` | `effect_value` | NUMERIC | ✅ |
| `max_purchases` | `max_purchases` | INTEGER | ✅ |
| `icon_key` | `icon_key` | TEXT | ✅ |
| `is_active` | `is_active` | BOOLEAN | ✅ |

---

## 📦 player_inventory Tablosu

| Frontend (ShopService) | DB Column | Tip | Eşleşme |
|------------------------|-----------|-----|---------|
| `player_id` | `player_id` | UUID | ✅ |
| `item_id` | `item_id` | TEXT | ✅ |
| `purchased_at` | `purchased_at` | TIMESTAMPTZ | ✅ |
| `is_equipped` | `is_equipped` | BOOLEAN | ✅ |

---

## 💰 coin_transactions Tablosu

| Frontend (WalletService) | DB Column | Tip | Eşleşme |
|--------------------------|-----------|-----|---------|
| `player_id` | `player_id` | UUID | ✅ |
| `amount` | `amount` | INTEGER | ✅ |
| `type` | `type` | TEXT | ✅ |
| `reference_id` | `reference_id` | UUID | ✅ |
| `balance_before` | `balance_before` | INTEGER | ✅ |
| `balance_after` | `balance_after` | INTEGER | ✅ |
| `description` | `description` | TEXT | ✅ |

---

## 🛡️ cheat_attempts Tablosu

| Frontend (AntiCheatService) | DB Column | Tip | Eşleşme |
|-----------------------------|-----------|-----|---------|
| `player_id` | `player_id` | UUID | ✅ |
| `cheat_type` | `cheat_type` | TEXT | ✅ |
| `details` | `details` | TEXT | ✅ |
| `fingerprint` | `fingerprint` | TEXT | ✅ |
| `severity` | `severity` | INTEGER | ✅ |
| `user_agent` | `user_agent` | TEXT | ✅ |
| `ip_address` | `ip_address` | TEXT | ✅ |
| `timestamp` | `timestamp` | TIMESTAMPTZ | ✅ |

---

## 📊 performance_metrics Tablosu

| Frontend (MetricsStorage) | DB Column | Tip | Eşleşme |
|---------------------------|-----------|-----|---------|
| `gameSession.id` | `session_id` | UUID | ✅ |
| `session.performance.avgFps` | `avg_fps` | NUMERIC | ✅ |
| `session.performance.minFps` | `min_fps` | NUMERIC | ✅ |
| `session.performance.maxFps` | `max_fps` | NUMERIC | ✅ |
| `session.performance.fpsSamples` | `fps_samples` | INTEGER | ✅ |
| `session.performance.frameDrops` | `frame_drops` | INTEGER | ✅ |
| `session.performance.memoryUsedMb` | `memory_used_mb` | NUMERIC | ✅ |
| `session.performance.memoryPeakMb` | `memory_peak_mb` | NUMERIC | ✅ |
| `session.performance.enemyCountMax` | `enemy_count_max` | INTEGER | ✅ |
| `session.performance.fps_1_percentile` | `fps_1_percentile` | NUMERIC | ✅ |
| `session.performance.avg_frame_time_ms` | `avg_frame_time_ms` | NUMERIC | ✅ |
| `session.performance.max_frame_time_ms` | `max_frame_time_ms` | NUMERIC | ✅ |
| `session.performance.enemy_count_avg` | `enemy_count_avg` | NUMERIC | ✅ |
| `session.performance.bullet_count_avg` | `bullet_count_avg` | NUMERIC | ✅ |
| `session.performance.particle_count_avg` | `particle_count_avg` | NUMERIC | ✅ |
| `session.performance.optimizationProfile` | `optimization_profile` | TEXT | ✅ |
| `session.performance.deviceFingerprint` | `device_fingerprint` | TEXT | ✅ |

---

## 🔌 Supabase Functions

| Frontend Call | Edge Function | Durum |
|---------------|---------------|-------|
| `MetricsService.startSession()` | `start-session` | ✅ UUID döndürüyor |
| `VerificationQueue.verify()` | `verify-game` | ✅ Çalışıyor |
| `ShopService.purchaseItem()` | `purchase_item` (RPC) | ✅ Çalışıyor |
| `WalletService.addGold()` | `add_gold` (RPC) | ✅ Çalışıyor |

---

## 📋 Özet

| Kategori | Toplam Alan | Eşleşen | Durum |
|----------|-------------|---------|-------|
| game_sessions | 21 | 21 | ✅ %100 |
| players | 8 | 8 | ✅ %100 |
| achievements | 9 | 9 | ✅ %100 |
| player_achievements | 4 | 4 | ✅ %100 |
| shop_items | 10 | 10 | ✅ %100 |
| player_inventory | 4 | 4 | ✅ %100 |
| coin_transactions | 7 | 7 | ✅ %100 |
| cheat_attempts | 8 | 8 | ✅ %100 |
| performance_metrics | 17 | 17 | ✅ %100 |
| **TOPLAM** | **88** | **88** | ✅ **%100** |

---

## ✅ Sonuç

**Tüm frontend servisleri ile Supabase tabloları arasındaki veri eşleştirmesi %100 doğru!**

Kritik düzeltmeler öncesinde sorun olan alanlar:
- ~~`position` → `position_chosen`~~ ✅ Düzeltildi
- ~~`session.session_id` → `id` (UUID)~~ ✅ Düzeltildi
- ~~Missing `gold_balance` column~~ ✅ Migration ile eklendi
