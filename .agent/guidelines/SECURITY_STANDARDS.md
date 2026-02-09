# Security & Data Integrity Standards

To prevent 403 (RLS), 406 (Not Acceptable), and CSP block errors, all developers (and agents) must follow these standards.

## 1. Content Security Policy (CSP) Standard
The CSP must be kept in sync across three locations. The agent is the primary tool for this synchronization.

### Source of Truth
- **Vite/Local:** `index.html` (meta tag)
- **Production (Cloudflare):** `public/_headers`
- **Production (Node/Railway):** `server.js` (headers middleware)

### Required Sources (Audit Checklist)
- **Market Data:** `wss://stream.binance.com:9443`, `wss://ws-feed.exchange.coinbase.com`
- **Supabase:** `https://*.supabase.co`, `wss://*.supabase.co`
- **Analytics:** `https://static.cloudflareinsights.com`, `https://cloudflareinsights.com`
- **Avatars:** `https://lh3.googleusercontent.com`, `https://avatars.githubusercontent.com`, `https://cdn.discordapp.com`
- **UI Assets:** `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, `https://cdn.jsdelivr.net`

---

## 2. Row Level Security (RLS) Discipline
RLS policies must allow for "Progressive Onboarding."

- **Device Tracking:** Must allow `INSERT` for anonymous users (`fingerprint` only).
- **Public Profiles:** Must allow `SELECT` for everyone to support leaderboards.
- **Private Data:** Must be restricted to `auth.uid() = profile_id`.
- **Initialization:** Every `INSERT` on `profiles` should ideally be handled by a Trigger or a verified Service call to ensure dependent tables (like `virtual_accounts`) are also initialized.

---

## 3. Data Integrity & Error Handling (Supabase)
Never use `.single()` directly on the client if there's any chance the data is missing.

### Pattern: Safe Single Search
```typescript
// BAD: Throws 406 if not found
const { data } = await supabase.from('profiles').select().eq('id', id).single();

// GOOD: Use maybeSingle and handle null
const { data, error } = await supabase.from('profiles').select().eq('id', id).maybeSingle();
if (!data) {
  // Trigger recovery: Clear local storage, redirect to registration, etc.
}
```

### Pattern: Automatic Recovery
If a service detects a 406 error or a missing profile that should exist:
1.  Log the detailed error to `error_reports`.
2.  Clear the stale `profileId` from `localStorage` if the DB says it doesn't exist.
3.  Fail gracefully to the "Registration/Nickname" screen instead of a white screen.
