---
name: edge-function-dev
description: Develop, test, and deploy Supabase Edge Functions (Deno/TypeScript)
---

# Edge Function Development Skill

Supabase Edge Function'larını (verify-game, submit-score vb.) geliştir ve yönet.

## Usage

```
/edge-function-dev [function-name] [action]
```

**Actions**: `create`, `test`, `deploy`, `logs`.

## Workflow

### 1. Local Development
Edge function'lar `supabase/functions/` altında saklanır.
Deno runtime kullanır.

### 2. Testing
Local server başlat:
```bash
# turbo
supabase functions serve --no-verify-jwt
```

Test isteği gönder:
```bash
curl -i --request POST http://localhost:54321/functions/v1/function-name \
  --header "Authorization: Bearer YOUR_ANON_KEY" \
  --header "Content-Type: application/json" \
  --data '{ "name": "test" }'
```

### 3. Deployment
```bash
# turbo
supabase functions deploy [function-name]
```

## Security (Production)
- **JWT Verification**: `verify_jwt: true` (default). Sadece yetkili client'lar çağırabilir.
- **Input Validation**: `zod` veya basic checkler ile inputu doğrula.
- **Rate Limiting**: Firebase/Supabase limitlerini kontrol et.

## Common Functions

- `submit-score`: Oyun sonu skorunu veritabanına yazar. İmza kontrolü yapar.
- `verify-game`: Oyun oturumunun geçerliliğini doğrular.

## Troubleshooting

- **CORS Errors**: Response header'larda `Access-Control-Allow-Origin` kontrol et.
- **Dependency Issues**: `import_map.json` dosyasını ve `deno.json`'ı kontrol et.
- **Memory/Timeout**: Edge function'ların 2-5s timeout ve 150MB~ RAM limiti vardır.

## Code Reference Example

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { name } = await req.json()
  const data = { message: `Hello ${name}!` }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
```

## MCP Integration
`mcp_supabase-mcp-server_deploy_edge_function` aracını kullanarak otomatik deploy yapabilirsin.
