---
description: Master Data Pipeline & Integrity Workflow
---

# 🛡️ Data Integrity & Pipeline Workflow (100% Accuracy)

Bu workflow, oyun verilerinin (skorlar, performans, finans) oyun motorundan veritabanına sıfır kayıpla ve %100 doğrulukla iletilmesini sağlar.

## 🏁 Phase 1: Database Hardening (DDL & Triggers)
// turbo
1. `supabase/migrations/026_db_optimization_and_fixes.sql` dosyasının uygulandığından emin ol.
2. `public.players` ve `public.game_sessions` arasındaki ilişkiyi "Late-Update" modeline geçir.
3. `public.coin_transactions` için kısıtlamaları (constraints) doğrula.

## 🌉 Phase 2: The Service Bridge (Implementation)
1. **GameSessionService.ts Update:** `submitSession(results)` metodunu ekle.
2. **MetricsService.ts Update:** Yerel depolama (LocalBuffer) desteği ekle.
3. **App.tsx Integration:** `handleGameOver` callback'ini `await GameSessionService.submitSession()` ile mühürle.

## 🔍 Phase 3: Integrity Validation (Audit)
1. `docs/DATABASE_SCHEMA.md` dokümanını güncel kolonlarla doğrula.
2. `verify-game` Edge Function loglarını kontrol et.
3. `drift_detection` view'ını sorgula.

## 🧪 Phase 4: Reliability Test
1. Oyunu başlat.
2. İnterneti simüle olarak kes (F12 -> Network -> Offline).
3. Oyunu bitir.
4. İnterneti geri aç.
5. Verilerin Database'e "Backfill" yapıldığını doğrula.
