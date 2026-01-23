# 🗄️ Crypto Survivors Database Guidelines

Bu dosya veritabanı standartlarımızı belirler. Tüm yeni migration'lar bu kurallara uymalıdır.

## 📏 İsimlendirme Standartları

- **Tablolar**: `snake_case` ve çoğul (`players`, `game_sessions`).
- **Kolonlar**: `snake_case` (`player_id`, `created_at`).
- **View'lar**: `v_` prefix ile başlar (`v_leaderboard`).
- **Trigger'lar**: `trg_` prefix ile başlar (`trg_players_updated_at`).
- **Foreign Keys**: Her zaman `_id` ile biter ve ilişkili tablo ismini içerir (`player_id`).

## 🕒 Zaman Damgaları (Atomic Timestamps)

Her tabloda istisnasız şu iki kolon bulunmalıdır:
- `created_at`: `TIMESTAMPTZ DEFAULT NOW()` (Asla değişmez).
- `updated_at`: `TIMESTAMPTZ DEFAULT NOW()` (Her güncellemede tetiklenir).

**Trigger Örneği:**
```sql
CREATE TRIGGER trg_table_name_updated_at 
BEFORE UPDATE ON public.table_name 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

## 🆔 Kimlik Yönetimi

- Birincil anahtarlar (Primary Keys) her zaman `UUID` olmalı ve `gen_random_uuid()` kullanmalıdır.
- Oyuncu referansları her zaman `player_id` olarak isimlendirilmelidir (Legacy `user_id` kullanılmamalıdır).

## 📊 View Katmanı (Governance Layer)

Uygulama kodunda (Frontend/Edge Functions) doğrudan tablolar yerine `v_` prefixli view'lar kullanılması teşvik edilir. Bu, tablo yapısı değiştiğinde (Breaking Change) uygulamayı korur.

## 🛡️ Güvenlik (RLS)

- Hiçbir tablo `Row Level Security` (RLS) kapalı olarak bırakılamaz.
- **Deny by Default**: Önce tüm yetkileri kapat (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), sonra sadece gereken yetkileri ekle.
- Hassas işlemler (`wallet_balance` güncelleme vb.) için `SECURITY DEFINER` olan ve yetki kontrolü yapan özel fonksiyonlar kullanılmalıdır.

## 💰 Cüzdan ve İşlem Mantığı (Ledger)

- Bakiyeler asla doğrudan `UPDATE` ile değiştirilmemelidir.
- Her bakiye değişimi `coin_transactions` tablosuna bir kayıt olarak girilmelidir.
- Güncel bakiye, trigger ile `player_wallets` tablosunda güncellenebilir veya transaction tablosundan hesaplanmalıdır.

## 🚀 Performans ve İndeksleme

- **BRIN İndeksleri**: Log tabloları (`price_logs`, `cheat_attempts`) gibi sadece sona ekleme yapılan büyük tablolar için `BRIN` (Block Range Index) kullanılmalıdır.
- **FK İndeksleri**: Her foreign key kolonu için mutlaka bir index tanımlanmalıdır.
- **JSONB Querying**: JSONB kolonları sorgulanacaksa `GIN` indeksi eklenmelidir.

## 🧹 Migration Yönetimi

- Migration dosyaları `XXX_description.sql` formatında olmalı.
- Her migration mutlaka `BEGIN;` ve `COMMIT;` blokları arasında olmalıdır.
- Her migration dosyası **Idempotent** olmalıdır (`IF NOT EXISTS`, `DROP IF EXISTS`).

---
*Bu rehber `supabase-architect` skilli tarafından yönetilmektedir.*
