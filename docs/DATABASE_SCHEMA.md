# 🗄️ Crypto Survivors - Database Schema Guide

Bu doküman, projenin Supabase üzerindeki veritabanı yapısını, tabloları, kolonları ve aralarındaki ilişkileri tanımlar.

---

## 📊 Core Tables (Çekirdek Tablolar)

### 1. `players`
Oyuncuların temel bilgileri, hesap durumları ve kümülatif istatistikleri.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Benzersiz oyuncu ID |
| `display_name` | TEXT (Unique) | Ekran adı |
| `gold_balance` | INTEGER | Mevcut altın miktarı (Spending) |
| `is_banned` | BOOLEAN | Genel ban durumu |
| `is_shadow_banned`| BOOLEAN | Anti-cheat korumalı ban (Liderlik tablosunda görünmez) |
| `total_kills` | INTEGER | Toplam öldürülen düşman sayısı |
| `high_score` | INTEGER | En yüksek skor (Survival time ms) |
| `auth_provider` | TEXT | 'nickname', 'twitter', 'wallet' vb. |
| `created_at` | TIMESTAMPTZ | Kayıt tarihi |

### 2. `game_sessions`
Her bir oyun oturumunun verileri ve anti-cheat doğrulama sonuçları.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Session ID |
| `player_id` | UUID (FK) | `players.id` referansı |
| `crypto_pair` | TEXT | Seçilen parite (BTC, ETH vb.) |
| `position_chosen` | TEXT | 'long' veya 'short' |
| `entry_price` | NUMERIC | Oyun başındaki market fiyatı |
| `exit_price` | NUMERIC | Oyun sonundaki market fiyatı |
| `pnl_percent` | NUMERIC | Elde edilen kâr/zarar yüzdesi |
| `survival_time_ms`| INTEGER | Hayatta kalma süresi |
| `total_kills` | INTEGER | Bu oturumdaki öldürme sayısı |
| `is_verified` | BOOLEAN | Server-side doğrulamadan geçti mi? |
| `shadow_ban_reason`| TEXT | Neden banlandığına dair açıklama |
| `session_secret` | TEXT | Replay doğrulaması için gizli anahtar |

### 3. `market_state`
Real-time market göstergeleri ve oyun dinamiklerini etkileyen veriler.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `pair` | VARCHAR (PK) | Parite adı (BTC) |
| `price` | NUMERIC | Güncel fiyat |
| `rsi` | NUMERIC | Göreceli Güç Endeksi (Enemy difficultıy etkiler) |
| `atr_percent` | NUMERIC | Volatilite oranı |
| `whale_tier` | INTEGER | Balina aktiviteleri (0-3) |
| `spawn_rate_multiplier`| NUMERIC | Fiyata göre düşman üretim hızı |

---

## 🏆 Achievement & Shop System (Başarım ve Mağaza)

### 4. `achievements`
Sistemdeki tüm tanımlı başarımlar.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Örn: 'KILLER_1' |
| `name` | TEXT | Başarım adı |
| `condition_type` | TEXT | 'total_kills', 'survival_seconds' vb. |
| `condition_value` | NUMERIC | Gereken hedef değer |
| `reward_gold` | INTEGER | Ödül altın miktarı |

### 5. `shop_items`
Mağazada satılan kalıcı yükseltmeler/eşyalar.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Örn: 'SPEED_1' |
| `cost_gold` | INTEGER | Altın maliyeti |
| `effect_type` | TEXT | 'speed_mult', 'max_hp_flat' vb. |
| `effect_value` | NUMERIC | Etki miktarı |

---

## � Financial System (Finansal Sistem)

### 6. `player_wallets`
Oyuncuların onaylanmış ve bekleyen bakiye bilgileri.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `player_id` | UUID (PK) | `players.id` referansı |
| `confirmed_balance`| NUMERIC | Sunucu tarafından onaylı bakiye |
| `pending_balance` | NUMERIC | Doğrulama bekleyen (aktif oyun) bakiyesi |
| `total_earned` | NUMERIC | Tüm zamanlar kazanç |
| `total_withdrawn` | NUMERIC | Tüm zamanlar çekilen miktar |

### 7. `coin_transactions`
Cüzdan hareketlerinin detaylı denetim kaydı (Audit Trail).
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | İşlem ID |
| `amount` | NUMERIC | Miktar (+/-) |
| `type` | TEXT | 'game_reward', 'withdrawal', 'shop_purchase' vb. |
| `balance_before` | NUMERIC | İşlem öncesi bakiye |
| `balance_after` | NUMERIC | İşlem sonrası bakiye |

### 8. `withdrawal_requests`
Para çekme talepleri ve durumları.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Talep ID |
| `amount` | NUMERIC | Çekilmek istenen miktar |
| `status` | TEXT | 'pending', 'completed', 'rejected' vb. |
| `wallet_address` | TEXT | Hedef cüzdan adresi |
| `tx_hash` | TEXT | Blockchain işlem hash'i |

---

## �🛡️ Security & Performance (Güvenlik ve Performans)

### 9. `cheat_attempts`
Hile girişimlerinin detaylı kaydı.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Log ID |
| `cheat_type` | TEXT | 'speed_hack', 'memory_edit' vb. |
| `details` | JSONB | Hile ile ilgili teknik veriler (koordinatlar, IP vb.) |
| `fingerprint` | TEXT | Cihazın benzersiz imzası |
| `severity` | INTEGER | Ciddiyet seviyesi (1-10) |

### 10. `performance_metrics`
Oyunun teknik performansı (FPS, Bellek vb.) verileri.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `session_id` | UUID (FK) | `game_sessions.id` referansı |
| `avg_fps` | NUMERIC | Ortalama FPS (BRIN index'li) |
| `frame_drops` | INTEGER | Kaybolan kare sayısı |
| `memory_used_mb` | INTEGER | Kullanılan RAM miktarı |

### 11. `price_logs`
Market doğrulaması için kullanılan geçmiş fiyat verileri (24 saatlik tutulur).
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `timestamp` | TIMESTAMPTZ | Fiyatın alındığı an (BRIN Index) |
| `pair` | VARCHAR | Parite adı |
| `price` | NUMERIC | Kayıtlı fiyat |

---

## 🚀 Performance Optimizations (Performans)

-   **BRIN Indexes:** `price_logs.timestamp` ve `performance_metrics` tablolarında zaman bazlı sorgular için kullanıldı.
-   **Filtered Indexes:** `game_sessions` üzerinde `is_verified = true` olanlar için özel index eklendi (Liderlik tablosu hızı için).
-   **Partial Indexes:** Banlanmamış kullanıcılar için hızlı lookup sağlandı.

---

## 📈 Views (Görünümler)

| View Adı | Amacı |
| :--- | :--- |
| `leaderboard` | Genel skor sıralaması (Verified & Non-banned players) |
| `weekly_leaderboard` | Haftalık sıfırlanan rekabet tablosu |
| `daily_leaderboard` | Günlük sıfırlanan rekabet tablosu |
| `analytics_sessions` | Günlük session sayıları ve oyuncu metrikleri |

---

## ⚙️ Stored Procedures & Functions

-   **`add_gold(player_id, amount, type)`**: Oyuncuya güvenli şekilde altın ekler/çıkarır ve `coin_transactions` tablosuna log yazar.
-   **`purchase_item(player_id, item_id)`**: Bakiye kontrolü yapar, altını düşer ve envantere ekler (Atomic Transaction).
-   **`trigger_achievement_reward()`**: `player_achievements` tablosuna yeni kayıt girildiğinde otomatik altın ödülünü tetikler.

---
*Son Güncelleme: 2026-01-23*
