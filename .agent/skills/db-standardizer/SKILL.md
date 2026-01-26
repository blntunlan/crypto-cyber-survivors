---
name: db-standardizer
description: Industry-standard database architecture, naming, and integrity rules for PostgreSQL/Supabase.
---

# 🏗️ DB Standardizer Skill

Bu skill, veritabanı mimarisini modernize etmek, isimlendirme karmaşasını gidermek ve veri bütünlüğünü %100'e çıkarmak için gerekli standartları tanımlar.

## 📏 1. Naming Conventions (İsimlendirme Standartları)

| Tip | Standart | Örnek |
| :--- | :--- | :--- |
| **Tables** | `plural`, `snake_case` | `game_sessions`, `player_wallets` |
| **Primary Keys** | `id` (Always UUID) | `id` |
| **Foreign Keys** | `singular_table_name_id` | `player_id`, `session_id` |
| **Timestamps** | `_at` suffix | `created_at`, `verified_at` |
| **Booleans** | `is_` or `has_` prefix | `is_verified`, `has_reward` |
| **Views** | `v_` or `vw_` prefix (optional) | `vw_leaderboard` |

## 🛡️ 2. Structural Standards (Yapısal Kurallar)

1.  **Atomic Timestamps**: Tüm tablolarda `created_at` ve `updated_at` (TIMESTAMPTZ) bulunmalıdır.
2.  **No Duplicate Logic**: Aynı veriyi tutan birden fazla kolon (örn: `user_id` vs `player_id`) yasaktır. Aliasing gerekiyorsa `VIEW` katmanında yapılmalıdır.
3.  **Derived Columns**: Hesaplanan veriler fiziksel kolon yerine `GENERATED ALWAYS AS` veya `VIEW` üzerinden sunulmalıdır.
4.  **Schema Versioning**: Her değişiklik `supabase/migrations/` altında sıralı ve tek amaçlı (atomic) dosyalarla yapılmalıdır.

## 🛠️ 3. Audit & Health Checks

Veritabanı sağlığını kontrol etmek için `scripts/health_check.sql` sorgusunu çalıştırın. Bu sorgu şunları kontrol eder:
- Eksik indexler.
- `snake_case` dışı isimlendirmeler.
- FK isim tutarsızlıkları.
- NULL oranı tehlikeli derecede yüksek kolonlar.

## 🚀 4. How to Apply

1.  Yeni bir tablo oluştururken `scripts/table_template.sql` dosyasını temel alın.
2.  Mevcut bir tabloyu modernize ederken "Aliasing before Dropping" stratejisini izleyin:
    - Yeni kolonu ekle.
    - Veriyi taşı.
    - Uygulamayı güncelle.
    - Eski kolonu sil.
