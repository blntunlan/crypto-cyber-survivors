---
name: security-check
description: Audit Supabase RLS policies, edge functions, and project secrets.
---

# Security Check Skill

Bu skill, projenin güvenlik duruşunu analiz eder. Özellikle Supabase RLS politikaları, Edge Function güvenliği ve hassas verilerin korunmasına odaklanır.

## Usage

```
/security-check [module]
```

**Modules:**
- `rls`: Veritabanı erişim politikaları.
- `functions`: Edge function JWT ve injection koruması.
- `secrets`: Env değişkenleri ve API anahtarları.

## Workflow

### 1. Supabase RLS Audit

Veritabanı tablolarının güvenliğini kontrol et.

**Kontrol Listesi:**
- [ ] **Tabloların tamamında RLS (Row Level Security) aktif mi?**
- [ ] **Players Tablosu**:
    - `SELECT`: Herkes (public) veya authenticated? (Liderlik tablosu için public olabilir).
    - `UPDATE`: Sadece `auth.uid() = id` olan kullanıcı kendi verisini güncelleyebilir mi?
    - `INSERT`: Service role veya authenticated user?
- [ ] **Game Sessions**: Kayıtlar değiştirilemez olmalı (veya sadece server-side).

### 2. Edge Function Security

`supabase/functions` altındaki kodları incele.

**Kontrol Listesi:**
- [ ] **JWT Verification**: Fonksiyonlar `Authorization` header'ını kontrol ediyor mu?
- [ ] **Input Validation**: Gelen JSON body parse edilmeden önce veya sonra doğrulanıyor mu?
- [ ] **SQL Injection**: Direkt string birleştirme yerine parametreli sorgular (RPC veya client methods) kullanılıyor mu?

```typescript
// Good
supabase.from('table').select().eq('id', inputId)

// Bad
supabase.rpc('execute_sql', { query: `SELECT * FROM table WHERE id = ${inputId}` })
```

### 3. Secrets Scanning

Kod içinde unutulmuş hassas verileri ara.

```bash
# Env variable referanslarını bul
grep -r "process.env" src/ services/

# Olası hardcoded key'leri ara (örn: "sk-...", "ey...", "AIza...")
grep -r "sk-\|eyJ" src/
```

### 4. Client-Side Security

- **XSS**: `dangerouslySetInnerHTML` kullanımı var mı? Varsa sanitize ediliyor mu?
- **Sensitive Data**: Kullanıcının cüzdan private key'i asla client'ta saklanmamalı veya loglanmamalı.

## Reporting template

```markdown
## 🔒 Security Audit Report

### RLS Status
- [x] Players (Secure)
- [ ] Leaderboard (Check policies)

### Edge Functions
- `verify-game`: Inputs validated? [Yes/No]

### Secrets Key Scan
- Found 0 potential leaks.

### Recommendations
1. Enable RLS on `new_table`
2. Remove console.log in auth service
```
