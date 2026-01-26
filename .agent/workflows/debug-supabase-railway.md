---
description: Supabase ve Railway arasındaki hata kontrolü, data tutarlılığı ve bug araştırması için kapsamlı debug workflow'u
---

# 🔍 Supabase ↔ Railway Debug Workflow

Bu workflow, Supabase ve Railway servisleri arasındaki veri akışını, hataları ve tutarlılık sorunlarını tespit etmek için sistematik bir yaklaşım sunar.

---

## 📋 Ön Kontroller

### 1. Servis Durumu Kontrolü
```bash
# Railway CLI durumu
railway status

# Supabase proje durumu
# MCP tool: mcp_supabase-mcp-server_get_project
```

// turbo
### 2. Environment Variables Kontrolü
```bash
# Lokal .env dosyasını kontrol et
cat .env | Select-String "SUPABASE|RAILWAY"
```

---

## 🔴 Hata Logları Analizi

### 3. Supabase Edge Function Logları
```
# MCP tool kullan:
mcp_supabase-mcp-server_get_logs
  - project_id: dqaggcizordsijpnfteo
  - service: edge-function

# Alternatif servisler:
  - service: postgres (DB hataları)
  - service: auth (auth hataları)
  - service: api (REST API hataları)
```

### 4. Railway Deployment Logları
```
# MCP tool kullan:
mcp_railway_get-logs
  - workspacePath: d:\crypto-cyber-survivors\railway-market-server
  - logType: deploy
  - lines: 100
  - filter: "error OR Error OR ERROR"

# Build logları için:
  - logType: build
```

### 5. Supabase Postgres Logları (DB Hataları)
```
# MCP tool kullan:
mcp_supabase-mcp-server_get_logs
  - project_id: dqaggcizordsijpnfteo
  - service: postgres
```

---

## 📊 Data Tutarlılık Kontrolleri

### 6. Price Logs Kontrolü (Railway → Supabase)
```sql
-- Son 10 dakikadaki price logları
SELECT 
  pair,
  COUNT(*) as count,
  MIN(timestamp) as oldest,
  MAX(timestamp) as newest,
  MAX(timestamp) - MIN(timestamp) as time_span
FROM price_logs
WHERE timestamp > NOW() - INTERVAL '10 minutes'
GROUP BY pair
ORDER BY newest DESC;
```

### 7. Market State Güncelliği
```sql
-- Market state son güncelleme zamanları
SELECT 
  pair,
  price,
  updated_at,
  NOW() - updated_at as staleness
FROM market_state
ORDER BY updated_at DESC;

-- Stale data kontrolü (15 saniyeden eski)
SELECT * FROM market_state 
WHERE updated_at < NOW() - INTERVAL '15 seconds';
```

### 8. Game Sessions Tutarlılık
```sql
-- Bekleyen (pending) verification'lar
SELECT 
  id,
  player_id,
  reward_status,
  is_verified,
  created_at,
  NOW() - created_at as age
FROM game_sessions
WHERE reward_status = 'pending' 
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;

-- Rejected session'lar ve nedenleri
SELECT 
  id,
  player_id,
  rejection_reason,
  verification_method,
  created_at
FROM game_sessions
WHERE reward_status = 'rejected'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

### 9. Wallet Transactions Audit
```sql
-- Son wallet işlemleri
SELECT 
  ct.id,
  ct.player_id,
  ct.amount,
  ct.type,
  ct.reference_type,
  ct.created_at,
  pw.confirmed_balance
FROM coin_transactions ct
LEFT JOIN player_wallets pw ON ct.player_id = pw.player_id
ORDER BY ct.created_at DESC
LIMIT 20;

-- Balance tutarsızlıkları
SELECT 
  p.id,
  p.display_name,
  p.gold_balance as player_gold,
  pw.confirmed_balance as wallet_balance,
  p.gold_balance - COALESCE(pw.confirmed_balance, 0) as discrepancy
FROM players p
LEFT JOIN player_wallets pw ON p.id = pw.player_id
WHERE p.gold_balance != COALESCE(pw.confirmed_balance, 0);
```

---

## 🔒 Security & RLS Kontrolleri

### 10. RLS Policy Advisor
```
# MCP tool kullan:
mcp_supabase-mcp-server_get_advisors
  - project_id: dqaggcizordsijpnfteo
  - type: security
```

### 11. Performance Advisor
```
# MCP tool kullan:
mcp_supabase-mcp-server_get_advisors
  - project_id: dqaggcizordsijpnfteo
  - type: performance
```

---

## 🐛 Yaygın Bug Senaryoları

### Senaryo A: Price Data Gelmiyor
```
1. Railway loglarını kontrol et (market-server)
2. WebSocket bağlantı durumu:
   - Binance: wss://stream.binance.com:9443/ws/btcusdt@trade
   - Coinbase: wss://ws-feed.exchange.coinbase.com
3. Supabase service role key geçerliliği
4. price_logs tablosuna insert izni
```

### Senaryo B: Game Verification Başarısız
```
1. verify-game edge function logları
2. Session ID ile game_sessions tablosunu sorgula
3. price_logs'da o zaman diliminde veri var mı?
4. rejection_reason alanını kontrol et
```

### Senaryo C: Wallet Balance Tutarsız
```
1. coin_transactions audit trail
2. Trigger çalışıyor mu? (trg_game_reward, trg_achievement_reward)
3. player_wallets vs players.gold_balance karşılaştır
4. audit_pnl_discrepancies view'ını kontrol et
```

### Senaryo D: Realtime Updates Çalışmıyor
```
1. Supabase Realtime logları
2. market_state tablosu güncel mi?
3. Client-side MarketStateService subscription aktif mi?
4. CORS ayarları doğru mu?
```

---

## 🔧 Hızlı Düzeltmeler

### Railway Restart
```bash
cd railway-market-server
railway up --detach
```

### Edge Function Redeploy
```
# MCP tool kullan:
mcp_supabase-mcp-server_deploy_edge_function
  - project_id: dqaggcizordsijpnfteo
  - name: verify-game
  - [mevcut dosyaları oku ve deploy et]
```

### Stale Price Logs Temizliği
```sql
-- 24 saatten eski price loglarını sil (cron job bunu yapıyor ama manuel gerekirse)
DELETE FROM price_logs 
WHERE timestamp < NOW() - INTERVAL '24 hours';
```

---

## 📈 Monitoring Query'leri

### Son 1 Saatlik Özet
```sql
SELECT 
  'price_logs' as table_name,
  COUNT(*) as row_count,
  MAX(timestamp) as last_entry
FROM price_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'game_sessions',
  COUNT(*),
  MAX(created_at)
FROM game_sessions
WHERE created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'error_reports',
  COUNT(*),
  MAX(reported_at)
FROM error_reports
WHERE reported_at > NOW() - INTERVAL '1 hour';
```

### Error Rate Analizi
```sql
SELECT 
  error_type,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM error_reports
WHERE reported_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY count DESC
LIMIT 10;
```

---

## ✅ Checklist

Debugging tamamlandığında kontrol et:

- [ ] Railway servisi çalışıyor (status: healthy)
- [ ] Supabase projesi aktif
- [ ] price_logs son 1 dakikada güncellendi
- [ ] market_state 15 saniyeden taze
- [ ] Pending verification sayısı makul (<10)
- [ ] Error rate normal seviyede
- [ ] RLS security advisor temiz
- [ ] Wallet balance'lar tutarlı

---

## 🔗 Faydalı Linkler

- Supabase Dashboard: https://supabase.com/dashboard/project/dqaggcizordsijpnfteo
- Railway Dashboard: https://railway.app/project/crypto-cyber-survivors
- Binance WebSocket Docs: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
