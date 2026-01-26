---
name: railway-logs
description: View and analyze Railway deployment logs for debugging
---

# Railway Logs Skill

Railway deployment loglarını görüntüle ve analiz et.

## Usage

```
/railway-logs [service] [log-type]
```

**Services:**
- (default) - Ana frontend
- `railway-market-server` - Price logger backend

**Log Types:**
- `build` - Build logları
- `deploy` - Deployment/runtime logları

## Quick Commands

### Son Build Loglarını Gör

```
mcp_railway_get-logs
workspacePath: d:\crypto-cyber-survivors
logType: build
```

### Son Deploy Loglarını Gör

```
mcp_railway_get-logs
workspacePath: d:\crypto-cyber-survivors
logType: deploy
lines: 100
```

### Hata Loglarını Filtrele

```
mcp_railway_get-logs
workspacePath: d:\crypto-cyber-survivors
logType: deploy
filter: @level:error
lines: 50
```

## Market Server Logları

```
mcp_railway_get-logs
workspacePath: d:\crypto-cyber-survivors\railway-market-server
logType: deploy
```

## Common Filters

| Filter | Açıklama |
|--------|----------|
| `@level:error` | Sadece error logları |
| `@level:warn` | Warning logları |
| `WebSocket` | WebSocket ile ilgili loglar |
| `Binance` | Binance bağlantı logları |
| `price` | Fiyat güncelleme logları |

## Deployment Listesi

Son deployment'ları görüntüle:

```
mcp_railway_list-deployments
workspacePath: d:\crypto-cyber-survivors
json: true
limit: 10
```

## Common Issues

### Build Failed
1. Build loglarını kontrol et
2. Local'de `npm run build` çalıştır
3. TypeScript hatalarını düzelt
4. Dependency version'larını kontrol et

### Deployment Crashed
1. Deploy loglarında error ara
2. Memory limit aşımı kontrol et
3. Environment variable'ları doğrula

### WebSocket Connection Failed
1. Binance API status kontrol et
2. Fallback (Coinbase) loglarını kontrol et
3. Network timeout'ları incele

## Environment Variables

Railway'deki env var'ları kontrol et:

```
mcp_railway_list-variables
workspacePath: d:\crypto-cyber-survivors
```

## Rollback

Önceki deployment'a dönmek için:
1. `mcp_railway_list-deployments` ile deployment ID'leri al
2. Railway dashboard'dan manuel rollback yap

## Integration

Bu skill aşağıdaki workflow'larla kullanılır:
- `/deploy` - Deployment sonrası log kontrolü
- `/debug-supabase-railway` - Full stack debug
