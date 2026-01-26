---
description: How to maintain and standardize our Supabase database
---

# 🛠️ Database Maintenance & Standardization Workflow

Bu workflow, veritabanındaki karmaşayı gidermek ve `docs/DATABASE_GUIDELINES.md` standartlarını korumak için tasarlanmıştır.

## 1. Standartların Kontrolü (DB Linter)

Mevcut şemadaki uyumsuzlukları görmek için şu sorguyu çalıştırın:
```sql
SELECT * FROM public.v_db_standards_violations;
```

## 2. Master Alignment Uygulama

Tüm tabloları otomatik olarak standartlara çekmek (kolon ekleme, trigger kurma, view oluşturma) için:
1. `supabase/migrations/030_master_schema_alignment.sql` dosyasını kontrol edin.
2. Migration'ı pushlayın:
```bash
npx supabase db push
```

## 3. Yeni Tablo Oluşturma Kuralları

Yeni bir tablo eklerken **MUTLAKA** `030` ve `031` numaralı migration'lardaki mantığı takip edin:
- UUID kullanın.
- `created_at` ve `updated_at` ekleyin.
- `trg_..._updated_at` trigger'ını kurun.
- View katmanına (`v_...`) ekleyin.

## 4. Migration Temizliği (Squash)

Migration sayısı 50'yi geçerse veya çok fazla çelişkili dosya varsa:
1. `npx supabase db pull` ile mevcut remote şemayı çekin.
2. Tüm migration dosyalarını silip `000_baseline_consolidated.sql` olarak tek bir dosyada birleştirin.
3. Local DB'yi resetleyip (`supabase db reset`) doğruluğunu kontrol edin.
