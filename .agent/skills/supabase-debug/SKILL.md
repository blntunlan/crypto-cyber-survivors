---
name: supabase-debug
description: Debug Supabase connections, RLS policies, and database issues
---

# Supabase Debug Skill

Supabase bağlantı ve veritabanı sorunlarını debug et.

## Usage

```
/supabase-debug [issue-type]
```

**Issue Types:**
- `connection` - Bağlantı sorunları
- `rls` - Row Level Security sorunları
- `query` - Query hataları
- `function` - Edge Function sorunları
- `realtime` - Realtime subscription sorunları

## Project Info

- **Project ID**: `dqaggcizordsijpnfteo`
- **Tables**: `players`, `game_sessions`, `player_wallets`
- **View**: `leaderboard`
- **Edge Functions**: `verify-game`, `submit-score`

## Debug Steps

### 1. Bağlantı Kontrolü

```typescript
// Supabase client status
const { data, error } = await supabase.from('players').select('count');
console.log('Connection test:', { data, error });
```

### 2. RLS Policy Kontrolü

```sql
-- Aktif RLS politikalarını görüntüle
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 3. Query Debug

MCP aracını kullan:
```
mcp_supabase-mcp-server_execute_sql
```

### 4. Logs Kontrolü

```
mcp_supabase-mcp-server_get_logs
```

Service options:
- `api` - API istekleri
- `postgres` - Database sorguları
- `edge-function` - Edge function logları
- `auth` - Authentication logları
- `realtime` - Realtime subscription logları

### 5. Edge Function Debug

```
mcp_supabase-mcp-server_get_edge_function
```

## Common Issues

### Auth Token Expired
```typescript
// Supabase client'ı yeniden başlat
await supabase.auth.signOut();
// veya token refresh et
```

### RLS Violation
```sql
-- Geçici olarak RLS kapat (sadece debug için!)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- Debug sonrası tekrar aç
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Realtime Not Working
1. RLS policy'nin SELECT izni olduğunu kontrol et
2. Publication configuration kontrol et
3. Client subscription syntax'ını doğrula

## MCP Tools

Kullanılacak MCP araçları:
- `mcp_supabase-mcp-server_execute_sql` - SQL çalıştır
- `mcp_supabase-mcp-server_get_logs` - Logları al
- `mcp_supabase-mcp-server_list_tables` - Tabloları listele
- `mcp_supabase-mcp-server_get_advisors` - Güvenlik/performans önerileri

## Security Notes

⚠️ Production'da:
- RLS'yi kapatma
- Sensitive data loglamadan commit etme
- Hardcoded credentials kullanma
