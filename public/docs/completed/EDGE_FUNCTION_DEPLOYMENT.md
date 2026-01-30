# 🚀 Edge Function Deployment Guide

> **Son Güncelleme:** 2025-12-25  
> **Durum:** ACTIVE ✅

---

## 📋 Mevcut Edge Functions

| Function | Slug | Version | Status | JWT Required |
|----------|------|---------|--------|--------------|
| verify-game | `verify-game` | v4 | `ACTIVE` | ✅ Yes |

---

## 🔧 Deployment Yöntemleri

### Yöntem 1: Supabase MCP (Önerilen)

Claude/Agent ile doğrudan deploy:

```
# MCP üzerinden deploy
mcp_supabase-mcp-server_deploy_edge_function({
  project_id: "xvvxipcrltzkoijxnwqg",
  name: "verify-game",
  files: [{ name: "index.ts", content: "..." }],
  verify_jwt: true
})
```

### Yöntem 2: Supabase CLI

```bash
# CLI kurulumu (eğer yoksa)
npm install -g supabase

# Login
supabase login

# Proje bağlantısı
supabase link --project-ref xvvxipcrltzkoijxnwqg

# Deploy
supabase functions deploy verify-game

# Lokal test
supabase functions serve verify-game --env-file .env.local
```

### Yöntem 3: Dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard/project/xvvxipcrltzkoijxnwqg/functions) açın
2. Functions → verify-game → Edit
3. Kodu yapıştır → Deploy

---

## 📁 Dosya Yapısı

```
supabase/
└── functions/
    └── verify-game/
        ├── index.ts      # Ana function kodu
        └── deno.json     # Deno config (import map)
```

---

## 🔐 Environment Variables

Edge function otomatik olarak şu env'lere erişir:

| Variable | Açıklama | Kaynak |
|----------|----------|--------|
| `SUPABASE_URL` | Proje URL'i | Otomatik |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Otomatik |
| `SUPABASE_ANON_KEY` | Anon key | Otomatik |

> ⚠️ Service role key sadece server-side'da kullanılmalı!

---

## 🧪 Test Etme

### cURL ile Test

```bash
curl -X POST https://xvvxipcrltzkoijxnwqg.supabase.co/functions/v1/verify-game \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "startTime": 1735100000000,
    "endTime": 1735100060000,
    "pair": "BTC",
    "position": "long",
    "leverage": 10,
    "claimedEntryPrice": 98000,
    "claimedExitPrice": 98500,
    "claimedPnL": 5.1,
    "kills": 25,
    "level": 5,
    "goldCollected": 150
  }'
```

### Beklenen Response

```json
{
  "verified": true,
  "reward": 125,
  "verifiedPnL": 5.1,
  "method": "verified"
}
```

---

## 📊 Verification Methods

| Method | Açıklama |
|--------|----------|
| `verified` | Tam doğrulama - Fiyatlar eşleşti |
| `price_adjusted` | Fiyat farkı tolerans içinde düzeltildi |
| `pnl_adjusted` | PnL tolerans içinde düzeltildi |
| `trusted` | Server verisi yok, client'a güvenildi |

---

## ⚙️ Tolerance Ayarları

```typescript
const TOLERANCE = {
  PRICE: 0.02,    // %2 - Fiyat farkı toleransı
  PNL: 0.05,      // %5 - PnL farkı toleransı  
  TIME: 60000,    // 60 saniye - Zaman kayması toleransı
  MAX_PNL: 1.0,   // %100 - Maksimum kabul edilebilir PnL
};
```

> 📝 **Not:** MVP için toleranslar geniş tutuldu. Production'da sıkılaştırılacak.

---

## 🔄 Güncelleme Prosedürü

1. `supabase/functions/verify-game/index.ts` dosyasını güncelle
2. Test et (lokal veya staging)
3. MCP veya CLI ile deploy et
4. Dashboard'dan version'ı kontrol et

---

## 🐛 Troubleshooting

### "Function not found" hatası
```bash
# Function'ın deploy olduğunu kontrol et
supabase functions list
```

### "JWT required" hatası
```bash
# Header'a Authorization ekle
-H "Authorization: Bearer YOUR_ANON_KEY"
```

### CORS hatası
Function otomatik olarak CORS header'larını ekler:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 📈 Monitoring

- **Logs:** [Supabase Dashboard → Functions → Logs](https://supabase.com/dashboard/project/xvvxipcrltzkoijxnwqg/functions/verify-game/logs)
- **Invocations:** Dashboard'da günlük çağrı sayısı görülebilir
- **Errors:** Logs'ta `console.error` çıktıları

---

**Proje ID:** `xvvxipcrltzkoijxnwqg`  
**Function URL:** `https://xvvxipcrltzkoijxnwqg.supabase.co/functions/v1/verify-game`
