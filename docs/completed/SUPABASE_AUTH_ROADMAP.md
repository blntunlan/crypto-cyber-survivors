# Supabase Auth Entegrasyonu Roadmap

Bu döküman, Supabase Authentication entegrasyonu için detaylı bir yol haritası sunar.

## 📋 Mevcut Durum

### Şu Anda Kullanılan Sistem
- **Nickname-based auth** (`UserSessionService.ts`)
- Local storage'da tutulan session
- Anonymous player ID generation
- Supabase ile senkronizasyon (opsiyonel)

### Mevcut Akış
```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ Nickname Entry  │ ──▶ │ Generate PlayerId│ ──▶ │ Create Player  │
└─────────────────┘     └──────────────────┘     └────────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │ Game Session│
                                                  └─────────────┘
```

## 🎯 Hedef Sistem

### Planlanan Auth Metodları
1. **Nickname (Mevcut)** - Hızlı başlangıç için
2. **Email/Password** - Hesap bağlama
3. **Twitter/X** - Sosyal giriş
4. **Wallet Connect** - Web3 entegrasyonu

### Hedef Akış
```
┌────────────────┐
│ Auth Options   │
├────────────────┤
│ • Play as Guest│──▶ Nickname flow (mevcut)
│ • Sign Up/In   │──▶ Email/password
│ • Twitter      │──▶ OAuth
│ • Connect Wallet│──▶ Web3
└────────────────┘
         │
         ▼
  ┌─────────────────────┐
  │ Unified Player ID   │
  │ (Supabase Auth UID) │
  └─────────────────────┘
         │
         ▼
  ┌─────────────────────┐
  │ • Game Sessions     │
  │ • Leaderboard       │
  │ • Rewards/Wallet    │
  └─────────────────────┘
```

## 🔧 Implementation Plan

### Phase 1: Email/Password Auth (4 saat)

```typescript
// services/auth/SupabaseAuthService.ts


export class SupabaseAuthService {
  async signUp(email: string, password: string, nickname: string): Promise<AuthResult>;
  async signIn(email: string, password: string): Promise<AuthResult>;
  async signOut(): Promise<void>;
  async resetPassword(email: string): Promise<void>;
  async updateProfile(updates: ProfileUpdate): Promise<void>;
}
```

**Görevler:**
- [ ] SupabaseAuthService class oluştur
- [ ] SignUp form component
- [ ] SignIn form component
- [ ] Password reset flow
- [ ] UserSessionService entegrasyonu

### Phase 2: Account Linking (2 saat)

Mevcut nickname hesaplarını email hesabına bağlama:

```typescript
async linkNicknameToAccount(email: string, password: string): Promise<void> {
  // 1. Mevcut player_id'yi al
  // 2. Yeni auth user oluştur
  // 3. Player kaydını güncelle
  // 4. Session'ı yenile
}
```

**Görevler:**
- [ ] Link account UI
- [ ] Migration logic
- [ ] Data consistency check

### Phase 3: RLS Policies (2 saat)

Row Level Security politikaları:

```sql
-- Players tablosu
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Oyuncu sadece kendi kaydını okuyabilir/güncelleyebilir
CREATE POLICY "Players can view own record"
  ON players FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Players can update own record"
  ON players FOR UPDATE
  USING (auth.uid() = id);

-- Game sessions
CREATE POLICY "Players can view own sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Players can insert own sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = player_id);
```

**Görevler:**
- [ ] players tablosu RLS
- [ ] game_sessions tablosu RLS
- [ ] performance_metrics RLS
- [ ] Service role key bypass kontrolü

### Phase 4: Wallet Security (Gelecek Sprint)

Bu phase, gerçek para/token transferleri için gerekli:

```typescript
interface WalletWithdrawal {
  playerId: string;
  amount: number;
  targetWallet: string;
  signature: string; // İmza doğrulama
}
```

**Gereksinimler:**
- Multi-signature approval
- Rate limiting
- Withdrawal cooldown
- Email verification for withdrawals

## 📁 Dosya Yapısı Değişiklikleri

```
services/
├── auth/
│   ├── UserSessionService.ts    # Mevcut
│   ├── SupabaseAuthService.ts   # YENİ
│   ├── AuthProvider.ts          # YENİ - React context
│   └── types.ts                 # YENİ

components/
├── auth/
│   ├── SignUpForm.tsx           # YENİ
│   ├── SignInForm.tsx           # YENİ
│   ├── PasswordReset.tsx        # YENİ
│   ├── AccountLinking.tsx       # YENİ
│   └── AuthModal.tsx            # YENİ

supabase/
├── migrations/
│   └── XXX_enable_rls.sql       # YENİ
```

## 🔐 Güvenlik Kontrolleri

### Yapılması Gerekenler
- [ ] Service role key client'ta kullanılmıyor
- [ ] Anon key sadece gerekli işlemler için
- [ ] JWT token expiry handling
- [ ] Refresh token rotation
- [ ] CSRF protection

### Mevcut Güvenlik ✅
- RLS price_logs'da aktif
- Service role key sadece Railway server'da
- Replay attack protection (session_id unique)

## 📊 Database Schema Güncellemeleri

```sql
-- Players tablosuna auth_id alanı ekle (eğer yoksa)
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- Email ve password hash Supabase tarafından yönetilecek
-- players tablosunda sadece profile bilgileri tutulacak
```

## 🚀 Deployment Checklist

- [ ] Supabase Dashboard'da email auth aktive et
- [ ] SMTP ayarlarını konfigüre et (email gönderimi için)
- [ ] OAuth providers ayarla (Twitter, etc.)
- [ ] Redirect URLs konfigüre et
- [ ] RLS policies test et
- [ ] Migration'ları production'a uygula

## ⏱ Tahmini Zaman

| Phase | Süre | Öncelik |
|-------|------|---------|
| Email/Password | 4 saat | Yüksek |
| Account Linking | 2 saat | Orta |
| RLS Policies | 2 saat | Yüksek |
| Wallet Security | 8+ saat | Gelecek |
| **TOPLAM** | **8-16 saat** | - |

## 📝 Notlar

- Mevcut nickname sistemi paralel olarak çalışmaya devam edecek
- Kullanıcılar istedikleri zaman hesap bağlayabilecek
- Guest modunda oynama her zaman mümkün
- Leaderboard sadece verified hesaplar için gösterilebilir (opsiyonel)
