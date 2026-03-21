# 🔧 Supabase Veri Akışı Düzeltme Raporu

**Tarih**: 2026-01-17  
**Durum**: ✅ TAMAMLANDI

---

## 🐛 Problem Tanımı

### Belirti
- Database'de `game_sessions` tablosundaki kayıtların çoğu boş
- `session_id`, `survival_time_ms`, `total_kills`, `entry_price`, `exit_price` değerleri NULL/0
- Oyun bittiğinde toplanan veriler Supabase'e yazılmıyor

### Kök Neden Analizi

**İki ayrı INSERT sorunu tespit edildi:**

1. **start-session Edge Function** (Oyun başladığında)
   - Yeni bir `game_sessions` kaydı oluşturuyordu
   - Sadece basic veriler: `position`, `pair`, `leverage`
   - `session_id` (TEXT) döndürüyordu ama bu alan NULL'dı!

2. **MetricsStorage.syncToSupabase** (Oyun bittiğinde)
   - AYRI bir INSERT yapıyordu (UPDATE DEĞİL!)
   - `unique_player_session` constraint'e takılıp sessizce atlanıyordu
   - Veya farklı timestamp ile 2. kayıt oluşturuyordu

**Sonuç**: Başlangıç kaydı boş kalıyor, bitiş verileri hiç yazılmıyor!

---

## ✅ Uygulanan Düzeltmeler

### 1. `MetricsStorage.syncToSupabase` → UPSERT Pattern

**Dosya**: `services/metrics/MetricsStorage.ts`

**Değişiklik**: 
- INSERT yerine UPSERT mantığı eklendi
- `serverSessionId` varsa → mevcut kaydı UPDATE et
- `serverSessionId` yoksa → yeni INSERT yap

```typescript
// Eski kod (INSERT only)
const { data: gameSession } = await supabase
  .from('game_sessions')
  .insert(sessionData)
  .select('id')
  .single();

// Yeni kod (UPSERT pattern)
if (session.serverSessionId) {
  // UPDATE existing record
  const { data } = await supabase
    .from('game_sessions')
    .update(sessionData)
    .eq('id', session.serverSessionId)
    .select('id')
    .single();
    
  gameSession = data;
}

if (!gameSession) {
  // INSERT new record
  const { data } = await supabase
    .from('game_sessions')
    .insert(sessionData)
    .select('id')
    .single();
    
  gameSession = data;
}
```

### 2. `start-session` Edge Function → UUID Döndür

**Dosya**: `supabase/functions/start-session/index.ts`

**Değişiklik**:
- `session_id` (TEXT) yerine `id` (UUID) döndürülüyor
- `session_timestamp` de `start_time` ile aynı ayarlandı (consistency)

```typescript
// Eski kod
.select('session_id, start_time')
// ...
sessionId: session.session_id  // NULL oluyordu!

// Yeni kod
.select('id, start_time')  // UUID 'id'
// ...
sessionId: session.id  // Gerçek UUID döner
```

### 3. Field Name Düzeltmesi

`position` → `position_chosen` olarak düzeltildi (DB şemasıyla uyumlu)

---

## 📊 Veri Akışı (Düzeltilmiş)

```
┌──────────────────────────────────────────────────────────────────┐
│                         OYUN BAŞLADI                              │
├──────────────────────────────────────────────────────────────────┤
│ 1. MetricsService.startSession()                                 │
│    ↓                                                             │
│ 2. Edge Function: start-session                                  │
│    - INSERT game_sessions (position, pair, leverage)             │
│    - RETURNS: id (UUID) ← Bu serverSessionId olarak saklanır     │
│    ↓                                                             │
│ 3. Client state.serverSessionId = response.sessionId (UUID)      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         OYUN BİTTİ                               │
├──────────────────────────────────────────────────────────────────┤
│ 1. MetricsService.endSession()                                   │
│    ↓                                                             │
│ 2. MetricsStorage.addSession(session)                           │
│    ↓                                                             │
│ 3. MetricsStorage.syncToSupabase(session)                       │
│    - serverSessionId VAR → UPDATE (kills, survival, price, etc)  │
│    - serverSessionId YOK → INSERT (fallback for anonymous)       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Test Kontrol Listesi

Uygulamayı test ederken şunları kontrol edin:

- [ ] Oyun başladığında console'da `[Metrics] Server session established: <UUID>` görünmeli
- [ ] Oyun bittiğinde console'da `[MetricsStorage] Updating existing server session` görünmeli
- [ ] Supabase'de `game_sessions` tablosunda:
  - [ ] `survival_time_ms > 0`
  - [ ] `total_kills > 0` (en az bir düşman öldürüldüyse)
  - [ ] `entry_price` ve `exit_price` dolu
  - [ ] `pnl_percent` hesaplanmış

---

## 📁 Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `services/metrics/MetricsStorage.ts` | UPSERT pattern, field name fixes |
| `supabase/functions/start-session/index.ts` | UUID döndür, timestamp sync |

---

## ✅ Ek İyileştirmeler (Eklendi)

### 1. Retry Logic (Exponential Backoff)

Sync başarısız olursa otomatik retry mekanizması eklendi:

```typescript
// Retry configuration
const MAX_SYNC_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_MULTIPLIER = 2;

// Delay pattern: 1s → 2s → 4s
```

**Davranış:**
- İlk denemede hata olursa 1 saniye bekle ve tekrar dene
- İkinci hata: 2 saniye bekle
- Üçüncü hata: 4 saniye bekle
- Maksimum 3 deneme sonrası `sessionSyncFailed` event'i emit edilir

### 2. VerificationQueue Entegrasyonu

Session sync başarılı olduktan sonra `VerificationQueue.enqueue()` çağrılır:
- Server-side doğrulama için kuyruğa eklenir
- Ödüller doğrulama sonucuna göre verilir
- Anti-cheat kontrolü yapılır

### 3. EventBus Entegrasyonu

Yeni event'ler eklendi:
- `sessionSynced`: Başarılı sync bildirimi
- `sessionSyncFailed`: Başarısız sync bildirimi (max retry sonrası)

---

## 🔒 Offline Resilience Notu

**Kasıtlı olarak EKLENMEDİ!**

Nedeni:
- Oyun zaten internet yoksa çalışmıyor (market verisi gerekli)
- Offline localStorage retry mekanizması **cheat riski** oluşturur
- Oyuncu verileri manipüle edip sonra sync edebilir

---

## 📁 Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `services/metrics/MetricsStorage.ts` | UPSERT pattern, retry logic, EventBus integration |
| `supabase/functions/start-session/index.ts` | UUID döndür, timestamp sync |
| `types/events.ts` | sessionSynced, sessionSyncFailed event'leri |

---

## 📝 Notlar

- Edge function deploy edildi (version 2)
- Client tarafı değişiklikleri uygulama restart'ı gerektiriyor
- Eski boş kayıtlar DB'de kalacak (manual temizlik gerekebilir)
