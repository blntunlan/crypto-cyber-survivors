# 🔐 Crypto Survivors — Authentication System Architecture

> **Versiyon:** 3.0  
> **Tarih:** 2026-02-11  
> **Durum:** Implementation Plan  
> **Yazar:** Architecture Team

---

## 📋 İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Desteklenen Auth Metodları](#2-desteklenen-auth-metodları)
3. [Kullanıcı Akış Diyagramı](#3-kullanıcı-akış-diyagramı)
4. [State Machine Mimarisi](#4-state-machine-mimarisi)
5. [Supabase Auth Entegrasyonu](#5-supabase-auth-entegrasyonu)
6. [Database Şeması](#6-database-şeması)
7. [Servis Katmanı Mimarisi](#7-servis-katmanı-mimarisi)
8. [Component Mimarisi (Frontend)](#8-component-mimarisi-frontend)
9. [OAuth Callback Akışı](#9-oauth-callback-akışı)
10. [Phantom Wallet Entegrasyonu](#10-phantom-wallet-entegrasyonu)
11. [Nickname Sistemi](#11-nickname-sistemi)
12. [Session Yönetimi](#12-session-yönetimi)
13. [Güvenlik Katmanları](#13-güvenlik-katmanları)
14. [Environment Stratejisi (DEV vs PROD)](#14-environment-stratejisi)
15. [Hata Yönetimi](#15-hata-yönetimi)
16. [Implementation Fazları](#16-implementation-fazları)
17. [Dosya Yapısı](#17-dosya-yapısı)
18. [Test Stratejisi](#18-test-stratejisi)
19. [Supabase Dashboard Konfigürasyonu](#19-supabase-dashboard-konfigürasyonu)
20. [Deployment Checklist](#20-deployment-checklist)

---

## 1. Genel Bakış

### 1.1 Amaç

Crypto Survivors oyununa multi-provider authentication sistemi entegre etmek. Sistem şu gereksinimleri karşılar:

- **Çoklu giriş yöntemi**: Email/Password, Magic Link (OTP), Google OAuth, Twitter/X OAuth, Phantom Wallet (Web3)
- **Zorunlu nickname**: İlk girişte her kullanıcı benzersiz bir nickname seçmeli
- **Akıcı UX**: Landing Page → Auth → Nickname (ilk giriş) → Hub akışı
- **Supabase-native**: Tüm auth operasyonları Supabase Auth üzerinden yönetilir
- **Geriye uyumlu**: Mevcut nickname-based legacy sistem paralel çalışmaya devam eder

### 1.2 Mevcut Sistem Durumu

| Bileşen | Durum | Dosya |
|---------|-------|-------|
| `SupabaseAuthService` | ✅ Mevcut (912 satır) | `services/auth/SupabaseAuthService.ts` |
| `PhantomAuthService` | ✅ Mevcut (357 satır) | `services/auth/PhantomAuthService.ts` |
| `TwitterAuthService` | ✅ Mevcut (427 satır) | `services/auth/TwitterAuthService.ts` |
| `ProfileService` | ✅ Mevcut (476 satır) | `services/auth/ProfileService.ts` |
| `NicknameValidator` | ✅ Mevcut (48 satır) | `services/auth/NicknameValidator.ts` |
| `UserSessionService` | ✅ Mevcut (195 satır) | `services/auth/UserSessionService.ts` |
| `AuthScreenV2` | ✅ Mevcut (268 satır) | `components/auth/v2/AuthScreenV2.tsx` |
| `AuthCallback` | ✅ Mevcut (353 satır) | `components/auth/AuthCallback.tsx` |
| `useAuthFlow` | ✅ Mevcut (152 satır) | `components/auth/v2/useAuthFlow.ts` |
| `useAppInitialization` | ✅ Mevcut (142 satır) | `hooks/useAppInitialization.ts` |
| Supabase Client | ✅ Mevcut (68 satır) | `services/supabase/client.ts` |

### 1.3 Supabase Projesi

- **Proje ID:** `dnhfsmvwqjxoextwbebj`
- **Bölge:** `eu-central-1`
- **DB Versiyonu:** PostgreSQL 17.6
- **RLS:** Tüm tablolarda aktif

---

## 2. Desteklenen Auth Metodları

### 2.1 Email / Password

| Özellik | Detay |
|---------|-------|
| **Provider** | Supabase Native (email) |
| **Akış** | `supabase.auth.signUp()` / `supabase.auth.signInWithPassword()` |
| **Email Doğrulama** | Opsiyonel (Supabase Dashboard'dan ayarlanır) |
| **Password Kuralları** | Min 8 karakter, bir büyük harf, bir rakam |
| **Mevcut Servis** | `SupabaseAuthService.signUp()` / `SupabaseAuthService.signIn()` |

```typescript
// Kayıt
const result = await SupabaseAuthService.signUp({
  email: 'user@example.com',
  password: 'SecureP@ss1',
  displayName: 'CryptoWarrior',
});

// Giriş
const result = await SupabaseAuthService.signIn({
  email: 'user@example.com',
  password: 'SecureP@ss1',
});
```

### 2.2 Magic Link (OTP)

| Özellik | Detay |
|---------|-------|
| **Provider** | Supabase Native (email OTP) |
| **Akış** | Email gönder → 6 haneli kodu gir → Doğrula |
| **Süre** | Kod 10 dakika geçerli |
| **Mevcut Servis** | `SupabaseAuthService.sendOtpCode()` / `SupabaseAuthService.verifyOtpCode()` |

```typescript
// OTP Gönder
await SupabaseAuthService.sendOtpCode('user@example.com');

// OTP Doğrula
const result = await SupabaseAuthService.verifyOtpCode('user@example.com', '123456');
```

### 2.3 Google OAuth

| Özellik | Detay |
|---------|-------|
| **Provider** | Supabase OAuth (google) |
| **Akış** | Redirect → Google Login → Callback → Profile Check |
| **Scopes** | `email`, `profile` |
| **Callback URL** | `https://yourdomain.com/auth/callback` |
| **Mevcut Servis** | `SupabaseAuthService.signInWithOAuth({ provider: 'google' })` |

```typescript
await SupabaseAuthService.signInWithOAuth({
  provider: 'google',
  redirectTo: `${window.location.origin}/auth/callback`,
  scopes: 'email profile',
});
```

### 2.4 Twitter/X OAuth

| Özellik | Detay |
|---------|-------|
| **Provider** | Supabase OAuth (twitter) |
| **Akış** | Redirect → Twitter Login → Callback → Profile Check |
| **API Version** | Twitter API v2 with PKCE |
| **Mevcut Servis** | `SupabaseAuthService.signInWithOAuth({ provider: 'twitter' })` |
| **Ek Servis** | `TwitterAuthService` (PKCE flow, profile fetch, identity linking) |

```typescript
// Supabase üzerinden (önerilen)
await SupabaseAuthService.signInWithOAuth({
  provider: 'twitter',
  redirectTo: `${window.location.origin}/auth/callback`,
});

// Veya doğrudan Twitter API (advanced)
await TwitterAuthService.startAuthFlow();
```

### 2.5 Phantom Wallet (Web3)

| Özellik | Detay |
|---------|-------|
| **Provider** | Custom (Phantom Solana Wallet) |
| **Akış** | Connect Wallet → Sign Message → Backend Verify → Supabase Session |
| **Chain** | Solana |
| **Mevcut Servis** | `PhantomAuthService` |
| **Tablo** | `wallets` (address, chain, wallet_type, is_primary) |

```typescript
// 1. Bağlan
const connectResult = await PhantomAuthService.connect();

// 2. Mesaj imzalat (sahiplik kanıtı)
const authResult = await PhantomAuthService.authenticate();

// 3. Profile'a bağla
if (authResult.success) {
  await PhantomAuthService.linkWalletToProfile(
    authResult.walletAddress!,
    authResult.signature!
  );
}
```

**Phantom Yüklü Değilse:**
```typescript
if (!PhantomAuthService.isPhantomInstalled()) {
  PhantomAuthService.openPhantomDownload();
  // veya QR kod göster (mobil için)
}
```

---

## 3. Kullanıcı Akış Diyagramı

### 3.1 Ana Akış (Happy Path)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        UYGULAMA BAŞLANGIÇ                                │
│                    useAppInitialization()                                │
└──────────────────────┬───────────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Supabase       │
              │ Session Check  │
              │ getSession()   │
              └───────┬────────┘
                      │
            ┌─────────┴──────────┐
            │                    │
     Session VAR           Session YOK
            │                    │
            ▼                    ▼
   ┌────────────────┐   ┌────────────────┐
   │ ProfileService │   │ has_seen_       │
   │ .initialize()  │   │ landing check  │
   └───────┬────────┘   └───────┬────────┘
           │                    │
     ┌─────┴─────┐       ┌─────┴─────┐
     │           │       │           │
  Profile    Profile   İlk Kez   Daha Önce
  Mevcut     YOK      Gelen     Gelmiş
     │           │       │           │
     ▼           ▼       ▼           ▼
  ┌──────┐  ┌───────┐ ┌──────┐  ┌──────────┐
  │ HUB  │  │NICKNAME│ │LANDING│ │AUTH SCREEN│
  │SCREEN│  │ SCREEN │ │ PAGE  │ │  (V2)    │
  └──────┘  └───┬───┘ └──┬───┘  └────┬─────┘
                │        │           │
                │        ▼           │
                │   ┌──────────┐     │
                │   │ "PLAY"   │     │
                │   │ Butonuna │     │
                │   │ Tıklama  │     │
                │   └────┬─────┘     │
                │        │           │
                │        ▼           │
                │   ┌──────────┐     │
                │   │AUTH SCREEN│◄───┘
                │   │  (V2)    │
                │   └────┬─────┘
                │        │
                │   ┌────┴────────────────────────┐
                │   │                             │
                │   ▼                             ▼
                │ ┌──────────────┐     ┌───────────────────┐
                │ │ Magic Link   │     │ Social / Wallet   │
                │ │ (Email+OTP)  │     │ (Google/Twitter/   │
                │ │              │     │  Phantom)          │
                │ └──────┬───────┘     └────────┬──────────┘
                │        │                      │
                │        ▼                      ▼
                │ ┌──────────────┐     ┌────────────────┐
                │ │ OTP Doğrula  │     │ OAuth Redirect │
                │ │ (6 digit)    │     │ /auth/callback │
                │ └──────┬───────┘     └────────┬───────┘
                │        │                      │
                │        └──────────┬───────────┘
                │                   │
                │                   ▼
                │          ┌────────────────┐
                │          │ Profile Check  │
                │          │ (nickname var?)│
                │          └───────┬────────┘
                │                  │
                │        ┌────────┴────────┐
                │        │                 │
                │     Nickname          Nickname
                │      YOK               VAR
                │        │                 │
                │        ▼                 │
                │   ┌──────────┐           │
                └──►│ NICKNAME │           │
                    │ SCREEN   │           │
                    └────┬─────┘           │
                         │                 │
                         ▼                 │
                    ┌──────────┐           │
                    │  HUB     │◄──────────┘
                    │  SCREEN  │
                    └──────────┘
```

### 3.2 Email/Password Detay Akışı

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  ENTRY   │────▶│ Email Input  │────▶│ Password     │────▶│ Profile      │
│  Screen  │     │ (sign in/up) │     │ Input        │     │ Check        │
└──────────┘     └─────────────┘     └──────────────┘     └──────┬───────┘
                                                                  │
                                                          ┌──────┴──────┐
                                                          │             │
                                                    Has Profile    No Profile
                                                          │             │
                                                          ▼             ▼
                                                       ┌─────┐    ┌──────────┐
                                                       │ HUB │    │ NICKNAME │
                                                       └─────┘    └──────────┘
```

---

## 4. State Machine Mimarisi

### 4.1 Auth Stages

```typescript
// components/auth/v2/types.ts — GÜNCEL HALİ
export type AuthStage =
  | 'ENTRY'           // Ana giriş ekranı (Social butonları + Email input)
  | 'EMAIL_PASSWORD'  // Email/Password sign-in/sign-up formu
  | 'AWAITING_OTP'    // Magic Link gönderildi, OTP bekleniyor
  | 'VERIFYING'       // OTP doğrulanıyor (pulse/loading)
  | 'WALLET_CONNECT'  // Phantom Wallet bağlantı ekranı
  | 'PROFILE_SETUP'   // Authenticated ama nickname yok
  | 'SUCCESS'         // Tamamen giriş yapıldı, Hub'a geçiş
  | 'ERROR';          // Kritik hata durumu

export interface AuthFlowState {
  stage: AuthStage;
  email: string;
  loading: boolean;
  error: string | null;
  message: string | null;
  authMethod: AuthMethod | null;    // Hangi yöntemle giriş yapıldığını takip
  walletAddress: string | null;     // Phantom wallet adresi
}

export type AuthMethod =
  | 'email_password'
  | 'magic_link'
  | 'google'
  | 'twitter'
  | 'phantom_wallet';
```

### 4.2 Stage Geçiş Matrisi

```
┌───────────────┬──────────────────────────────────────────────────────┐
│   Mevcut      │                  Geçiş Yapabilir                    │
│   Stage       │                                                      │
├───────────────┼──────────────────────────────────────────────────────┤
│ ENTRY         │ → EMAIL_PASSWORD, AWAITING_OTP, WALLET_CONNECT,     │
│               │   SUCCESS (OAuth redirect), ERROR                    │
├───────────────┼──────────────────────────────────────────────────────┤
│ EMAIL_PASSWORD│ → PROFILE_SETUP, SUCCESS, ENTRY (geri), ERROR       │
├───────────────┼──────────────────────────────────────────────────────┤
│ AWAITING_OTP  │ → VERIFYING, ENTRY (geri), ERROR                    │
├───────────────┼──────────────────────────────────────────────────────┤
│ VERIFYING     │ → PROFILE_SETUP, SUCCESS, AWAITING_OTP (retry),     │
│               │   ERROR                                              │
├───────────────┼──────────────────────────────────────────────────────┤
│ WALLET_CONNECT│ → PROFILE_SETUP, SUCCESS, ENTRY (geri), ERROR       │
├───────────────┼──────────────────────────────────────────────────────┤
│ PROFILE_SETUP │ → SUCCESS, ERROR                                     │
├───────────────┼──────────────────────────────────────────────────────┤
│ SUCCESS       │ → (terminal — Hub'a geçiş yapılır)                  │
├───────────────┼──────────────────────────────────────────────────────┤
│ ERROR         │ → ENTRY (tekrar dene)                                │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 5. Supabase Auth Entegrasyonu

### 5.1 Client Konfigürasyonu

```typescript
// services/supabase/client.ts (MEVCUT)
const clientInstance = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,         // PWA desteği için zorunlu
    autoRefreshToken: true,       // Token otomatik yenileme
    detectSessionInUrl: true,     // OAuth callback URL'den token okuma
    storage: window.localStorage, // iOS/Android PWA uyumu
    storageKey: 'crypto-survivors-auth-token',
  },
});
```

### 5.2 Auth State Listener

```typescript
// SupabaseAuthService.initialize() — MEVCUT
supabase.auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      EventBus.emit('auth:signedIn', { user: session?.user, session });
      break;
    case 'SIGNED_OUT':
      EventBus.emit('auth:signedOut', {});
      break;
    case 'TOKEN_REFRESHED':
      EventBus.emit('auth:tokenRefreshed', { session });
      break;
    case 'USER_UPDATED':
      EventBus.emit('auth:userUpdated', { user: session?.user });
      break;
  }
});
```

### 5.3 OAuth Provider Konfigürasyonu (Supabase Dashboard)

| Provider | Client ID Kaynağı | Callback URL | Scopes |
|----------|--------------------|--------------|--------|
| Google | Google Cloud Console | `https://dnhfsmvwqjxoextwbebj.supabase.co/auth/v1/callback` | `email, profile` |
| Twitter | Twitter Developer Portal | `https://dnhfsmvwqjxoextwbebj.supabase.co/auth/v1/callback` | `tweet.read, users.read` |

> **NOT:** Supabase OAuth callback, Supabase sunucusuna yönlendirir. Supabase sonra uygulamanızın `Site URL` + redirect path'ine yönlendirir.

### 5.4 Redirect Konfigürasyonu

```
Supabase Dashboard → Authentication → URL Configuration:

  Site URL:           https://cryptosurvivors.io
  Redirect URLs:
    - https://cryptosurvivors.io/auth/callback
    - http://localhost:3000/auth/callback     (DEV)
    - http://localhost:4173/auth/callback     (Preview)
```

---

## 6. Database Şeması

### 6.1 Profiles Tablosu (MEVCUT)

```sql
-- 8 kayıt mevcut, RLS aktif
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  auth_user_id          UUID REFERENCES auth.users(id),    -- Supabase Auth bağlantısı
  display_name          TEXT NOT NULL UNIQUE,               -- Nickname (3-16 char)
  username              TEXT,                               -- Opsiyonel username
  email                 TEXT,                               -- Email (OAuth'dan gelir)
  email_verified        BOOLEAN DEFAULT FALSE,
  avatar_url            TEXT,                               -- Profil resmi
  level                 INTEGER DEFAULT 1,
  xp                    BIGINT DEFAULT 0,
  high_score            BIGINT DEFAULT 0,
  total_sessions        INTEGER DEFAULT 0,
  is_banned             BOOLEAN DEFAULT FALSE,
  is_tester             BOOLEAN DEFAULT TRUE,
  primary_auth_provider TEXT DEFAULT 'nickname',            -- 'email'|'google'|'twitter'|'phantom'
  wallet_address        TEXT UNIQUE,                        -- Solana wallet adresi
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  last_seen_at          TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 Identities Tablosu (MEVCUT)

```sql
-- Çoklu OAuth provider bağlantıları
CREATE TABLE public.identities (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  profile_id    UUID REFERENCES profiles(id),
  provider      TEXT NOT NULL,          -- 'google'|'twitter'|'phantom'|'email'
  provider_id   TEXT NOT NULL,          -- Provider'dan gelen unique ID
  identity_data JSONB DEFAULT '{}',     -- Provider-spesifik data (avatar, username, vb.)
  last_login_at TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(provider, provider_id)         -- Aynı provider+ID çifti tekrar edilemez
);
```

### 6.3 Wallets Tablosu (MEVCUT)

```sql
-- Phantom/Web3 wallet bağlantıları
CREATE TABLE public.wallets (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  profile_id  UUID REFERENCES profiles(id),
  address     TEXT NOT NULL UNIQUE,     -- Solana cüzdan adresi
  chain       TEXT DEFAULT 'solana',    -- Blockchain (solana, ethereum, vb.)
  wallet_type TEXT DEFAULT 'phantom',   -- Cüzdan tipi
  is_primary  BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 6.4 RLS Politikaları

```sql
-- Profiles: Kullanıcı kendi profilini okuyabilir/güncelleyebilir
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Profiles: Herkes display_name'e göre arayabilir (leaderboard)
CREATE POLICY "Public display_name read"
  ON profiles FOR SELECT
  USING (TRUE);

-- Identities: Sadece kendi bağlantıları
CREATE POLICY "Own identities only"
  ON identities FOR ALL
  USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Wallets: Sadece kendi cüzdanları
CREATE POLICY "Own wallets only"
  ON wallets FOR ALL
  USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
```

### 6.5 Database Trigger — Otomatik Profil Oluşturma

```sql
-- Yeni Supabase auth kullanıcısı oluşturulduğunda otomatik profil oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, display_name, email, email_verified, primary_auth_provider, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player_' || LEFT(NEW.id::text, 8)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, FALSE),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    last_seen_at = now(),
    email = EXCLUDED.email;
    
  -- virtual_accounts da otomatik oluştur
  INSERT INTO public.virtual_accounts (profile_id)
  VALUES ((SELECT id FROM profiles WHERE auth_user_id = NEW.id))
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 7. Servis Katmanı Mimarisi

### 7.1 Singleton Service Yapısı

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTH SERVICE LAYER                             │
│                                                                  │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │SupabaseAuthService│  │PhantomAuthService │  │TwitterAuth   │ │
│  │  (Orchestrator)   │  │  (Web3 Wallet)    │  │Service       │ │
│  │                   │  │                   │  │(PKCE Flow)   │ │
│  │ • signUp          │  │ • connect         │  │ • startAuth  │ │
│  │ • signIn          │  │ • authenticate    │  │ • handleCb   │ │
│  │ • signInWithOAuth │  │ • linkWallet      │  │ • linkIdent  │ │
│  │ • sendOtpCode     │  │ • disconnect      │  │ • fetchProf  │ │
│  │ • verifyOtpCode   │  │                   │  │              │ │
│  │ • sendMagicLink   │  └───────┬───────────┘  └──────┬───────┘ │
│  │ • resetPassword   │          │                      │         │
│  │ • updatePassword  │          │                      │         │
│  │ • getSession      │          │                      │         │
│  │ • getUser         │          │                      │         │
│  │ • getProfile      │          │                      │         │
│  └────────┬──────────┘          │                      │         │
│           │                     │                      │         │
│           ▼                     ▼                      ▼         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ProfileService (Singleton)                   │   │
│  │  • initialize()        - Session validate + profile load  │   │
│  │  • createProfile()     - Yeni profil oluşturma            │   │
│  │  • validateSession()   - Session + profil kontrolü        │   │
│  │  • updateDisplayName() - Nickname güncelleme              │   │
│  │  • linkLegacyProfile() - Eski nickname profili bağlama    │   │
│  └──────────────────────────────┬───────────────────────────┘   │
│                                 │                                │
│                                 ▼                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            UserSessionService (Singleton)                 │   │
│  │  • saveUser()          - localStorage'a kaydet            │   │
│  │  • getLegacyStoredUser() - Legacy format okuma             │   │
│  │  • registerNickname()  - Supabase'e kayıt + local save    │   │
│  │  • updateLastSeen()    - Son görülme güncelle              │   │
│  │  • clearUser()         - Logout temizliği                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              NicknameValidator (Static)                    │   │
│  │  • validate(nickname)  - 3-16 char, alphanumeric+_        │   │
│  │  • isValid(nickname)   - Boolean check                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           PlayerIdentityService (Static)                  │   │
│  │  • generatePlayerHash() - Device fingerprint + nickname   │   │
│  │  • validateIdentity()   - Hash doğrulama                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 EventBus Auth Events

```typescript
// Tüm auth olayları EventBus üzerinden yayınlanır
type AuthEvents = {
  'auth:signedIn':       { user: User; session: Session };
  'auth:signedOut':      {};
  'auth:tokenRefreshed': { session: Session };
  'auth:userUpdated':    { user: User };
  'auth:profileCreated': { profile: PlayerProfile };
  'auth:nicknameSet':    { nickname: string; profileId: string };
  'auth:walletLinked':   { address: string; chain: string };
  'auth:providerLinked': { provider: AuthProvider };
  'auth:error':          { code: string; message: string };
};
```

---

## 8. Component Mimarisi (Frontend)

### 8.1 Component Hiyerarşisi

```
App.tsx
├── FallbackLoader            (isInitialized === false)
├── LandingPage               (showLanding === true)
│   └── "PLAY" butonu → handleLaunchGame()
├── AuthCallback              (pathname === '/auth/callback')
│   └── OAuth redirect sonrası token işleme
├── AuthScreenV2              (needsNickname === true)
│   ├── [ENTRY Stage]
│   │   ├── EmailInput        (Magic Link / OTP)
│   │   ├── EmailPasswordForm (Email/Password sign-in/up) ← YENİ
│   │   ├── SocialButtons     (Google, Twitter)
│   │   └── WalletButton      (Phantom) ← YENİ
│   ├── [AWAITING_OTP Stage]
│   │   └── OtpInput          (6 haneli kod girişi)
│   ├── [EMAIL_PASSWORD Stage] ← YENİ
│   │   ├── EmailInput
│   │   ├── PasswordInput
│   │   └── Sign In / Sign Up toggle
│   ├── [WALLET_CONNECT Stage] ← YENİ
│   │   ├── WalletStatus
│   │   └── ConnectButton / InstallPrompt
│   ├── [PROFILE_SETUP Stage]
│   │   ├── NicknameInput
│   │   └── "INITIALIZE PROFILE" butonu
│   └── [ERROR Stage]
│       └── ErrorDisplay + Retry butonu
└── HubMenu / GameEngine      (needsNickname === false)
```

### 8.2 useAuthFlow Hook — Güncellenmiş API

```typescript
// components/auth/v2/useAuthFlow.ts — HEDEF API
export function useAuthFlow(onComplete: (nickname: string) => void) {
  return {
    // State
    stage: AuthStage,
    email: string,
    loading: boolean,
    error: string | null,
    message: string | null,
    walletAddress: string | null,

    // Stage Setters
    setStage: (stage: AuthStage) => void,

    // Email/Password Actions
    signUp: (email: string, password: string) => Promise<void>,
    signIn: (email: string, password: string) => Promise<void>,

    // Magic Link Actions
    requestOtp: (email: string) => Promise<void>,
    verifyOtp: (code: string) => Promise<void>,

    // OAuth Actions
    startOAuth: (method: AuthMethod) => Promise<void>,

    // Wallet Actions
    connectWallet: () => Promise<void>,
    authenticateWallet: () => Promise<void>,

    // Profile Actions
    completeProfile: (nickname: string) => Promise<void>,

    // Reset
    reset: () => void,
  };
}
```

---

## 9. OAuth Callback Akışı

### 9.1 URL Akışı

```
1. Kullanıcı "Google ile Giriş Yap" butonuna tıklar
2. → Supabase OAuth endpoint'ine redirect:
     https://dnhfsmvwqjxoextwbebj.supabase.co/auth/v1/authorize?provider=google
3. → Google Login sayfası açılır
4. → Kullanıcı izin verir
5. → Google, Supabase callback'ine redirect:
     https://dnhfsmvwqjxoextwbebj.supabase.co/auth/v1/callback
6. → Supabase token'ları oluşturur ve uygulamaya redirect:
     https://cryptosurvivors.io/auth/callback#access_token=xxx&refresh_token=yyy
7. → AuthCallback component token'ları yakalar
8. → Profile check yapılır
9. → Nickname varsa → Hub | Yoksa → PROFILE_SETUP
```

### 9.2 AuthCallback Component Mantığı (MEVCUT)

```typescript
// components/auth/AuthCallback.tsx — Özet
const handleCallback = async () => {
  // 1. URL'den hash fragment oku
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  // 2. Supabase session'ı kontrol et
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // 3. Profile kontrol et
    const profile = await ProfileService.getInstance().initialize();
    
    if (profile.isValid && profile.profile?.displayName) {
      // Nickname var → HUB
      onSuccess?.(false);
    } else {
      // Nickname yok → NICKNAME SCREEN
      onSuccess?.(true);
    }
  } else {
    onError?.('Authentication failed');
  }
};
```

---

## 10. Phantom Wallet Entegrasyonu

### 10.1 Bağlantı Akışı

```
┌──────────┐     ┌───────────────┐     ┌───────────────┐     ┌──────────────┐
│  ENTRY   │────▶│ Phantom       │────▶│ Sign Message  │────▶│ Backend      │
│  SCREEN  │     │ Extension     │     │ (CSRF Nonce)  │     │ Verify Sig   │
│          │     │ Detect        │     │               │     │              │
└──────────┘     └───────┬───────┘     └───────┬───────┘     └──────┬───────┘
                         │                     │                     │
                   ┌─────┴─────┐               │                     │
                   │           │               │                     │
              Installed   Not Found            │                     │
                   │           │               │                     │
                   ▼           ▼               │                     ▼
             ┌──────────┐ ┌───────────┐        │              ┌──────────────┐
             │ Connect  │ │ Download  │        │              │ Create/Link  │
             │ Prompt   │ │ Page Link │        │              │ Supabase     │
             └────┬─────┘ └───────────┘        │              │ Session      │
                  │                            │              └──────┬───────┘
                  ▼                            │                     │
            ┌──────────┐                       │                     ▼
            │ Approve  │───────────────────────┘              ┌──────────────┐
            │ in Wallet│                                      │ Profile      │
            └──────────┘                                      │ Check →      │
                                                              │ Nickname/Hub │
                                                              └──────────────┘
```

### 10.2 İmza Mesajı Formatı

```typescript
// PhantomAuthService.authenticate() — MEVCUT
const message = `Crypto Survivors Authentication\n\n` +
  `Wallet: ${address}\n` +
  `Timestamp: ${Date.now()}\n` +
  `Nonce: ${crypto.randomUUID()}`;

const encodedMessage = new TextEncoder().encode(message);
const { signature } = await provider.signMessage(encodedMessage, 'utf8');
const signatureBase58 = bs58.encode(signature);
```

---

## 11. Nickname Sistemi

### 11.1 Validation Kuralları

| Kural | Değer | Kaynak |
|-------|-------|--------|
| Min Uzunluk | 3 karakter | `NicknameValidator.MIN_LENGTH` |
| Max Uzunluk | 16 karakter | `NicknameValidator.MAX_LENGTH` |
| İzin Verilen Karakterler | `[a-zA-Z0-9_]` | `NICKNAME_REGEX` |
| Benzersizlik | `profiles.display_name UNIQUE` | Database constraint |

### 11.2 Nickname Seçim Akışı

```typescript
// useAuthFlow.completeProfile()
async function completeProfile(nickname: string) {
  // 1. Client-side validation
  const validationError = NicknameValidator.validate(nickname);
  if (validationError) { setError(validationError); return; }

  // 2. Supabase session kontrolü
  const session = await SupabaseAuthService.getSession();
  if (!session?.user) throw new Error('No session');

  // 3. ProfileService ile profil oluştur/güncelle
  const result = await ProfileService.getInstance().createProfile({
    userId: session.user.id,
    displayName: nickname,
    email: session.user.email,
    authProvider: session.user.app_metadata.provider ?? 'email',
    avatarUrl: session.user.user_metadata.avatar_url,
  });

  // 4. UserSessionService'e kaydet (localStorage)
  if (result.isValid && result.profile) {
    UserSessionService.saveUser(result.profile.id, nickname);
    setStage('SUCCESS');
    onComplete(nickname);
  }
}
```

### 11.3 Nickname Benzersizlik Kontrolü (Backend)

```sql
-- Realtime nickname check (RPC fonksiyonu önerisi)
CREATE OR REPLACE FUNCTION check_nickname_available(p_nickname TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(display_name) = LOWER(p_nickname)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 12. Session Yönetimi

### 12.1 Session Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│ Active   │────▶│ Expired  │────▶│  Refresh │
│          │     │ Session  │     │ Token    │     │  Token   │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                                                  ┌─────┴─────┐
                                                  │           │
                                              Success     Failed
                                                  │           │
                                                  ▼           ▼
                                            ┌──────────┐ ┌──────────┐
                                            │ New      │ │ Force    │
                                            │ Session  │ │ Logout   │
                                            └──────────┘ └──────────┘
```

### 12.2 Token Storage

```typescript
// Supabase Client Config (MEVCUT)
{
  auth: {
    storage: window.localStorage,
    storageKey: 'crypto-survivors-auth-token',
    persistSession: true,
    autoRefreshToken: true,
  }
}

// localStorage Keys:
// 'crypto-survivors-auth-token'  → Supabase session (JWT + refresh token)
// 'crypto_survivors_user'        → Legacy user data (LegacyStoredUser)
// 'has_seen_landing'             → Landing page görüldü mü?
```

---

## 13. Güvenlik Katmanları

### 13.1 Auth Güvenlik Matrisi

| Katman | Yöntem | Detay |
|--------|--------|-------|
| **Transport** | HTTPS | Tüm API çağrıları TLS üzerinden |
| **Token** | JWT (HS256) | Supabase tarafından imzalanır |
| **Session** | HttpOnly Cookies | Supabase auto-manage |
| **CSRF** | PKCE | OAuth flow'larında code_verifier |
| **RLS** | Row Level Security | Tüm tablolarda aktif |
| **Password** | bcrypt | Supabase tarafından hashlenır |
| **Rate Limit** | Supabase Built-in | Login attempt sınırı |
| **Wallet** | ed25519 Signature | Phantom wallet doğrulama |
| **Device** | Fingerprint Hash | SHA-256 / SubtleCrypto |

### 13.2 Anti-Abuse Önlemleri

```typescript
// 1. Login Rate Limiting (Supabase Dashboard)
// Authentication → Rate Limits → Email: 5/min, SMS: 3/min

// 2. Nickname Abuse Prevention
// - Profanity filter (client + server)
// - Case-insensitive unique check
// - 24 saat cooldown nickname değişikliği

// 3. Wallet Spoofing Prevention
// - Mesaj imzası server-side doğrulama
// - Nonce + timestamp ile replay attack engelleme
// - Bir wallet = bir profil kuralı (UNIQUE constraint)
```

---

## 14. Environment Stratejisi

### 14.1 DEV vs PROD Davranış Farkları

```typescript
// hooks/useAppInitialization.ts — MEVCUT MANTIK

if (import.meta.env.DEV) {
  // DEV: Mevcut kullanıcı varsa geç, yoksa nickname sor
  const user = await UserPersistenceService.initialize();
  setNeedsNickname(!user);
} else {
  // PROD: Supabase session zorunlu
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // Profile kontrolü → nickname var mı?
    const profileResult = await ProfileService.getInstance().initialize();
    setNeedsNickname(!profileResult.isValid || !profileResult.profile);
  } else {
    // Auth screen göster
    setNeedsNickname(true);
  }
}
```

| Özellik | DEV | PROD |
|---------|-----|------|
| Auth Zorunlu | ❌ Hayır | ✅ Evet |
| Supabase Session | Opsiyonel | Zorunlu |
| OAuth Redirect | localhost:3000 | cryptosurvivors.io |
| Mock Profile | ✅ Desteklenir | ❌ Gerçek profil zorunlu |
| Cheat Manager | ✅ F1 ile aktif | ❌ Devre dışı |

---

## 15. Hata Yönetimi

### 15.1 Auth Error Kodları

```typescript
// SupabaseAuthService.mapAuthError() — MEVCUT
const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials':     'Yanlış email veya şifre.',
  'Email not confirmed':           'E-posta doğrulanmamış. Spam klasörünü kontrol edin.',
  'User already registered':       'Bu email ile zaten kayıt olunmuş.',
  'Password should be at least 6': 'Şifre en az 6 karakter olmalı.',
  'Email rate limit exceeded':     'Çok fazla deneme. 1 dakika bekleyin.',
  'invalid_grant':                 'Oturum süresi dolmuş. Tekrar giriş yapın.',
  'Token expired':                 'Token süresi doldu, yenileniyor...',
};
```

### 15.2 Hata Recovery Stratejisi

```
Auth Error → Kullanıcı bilgilendir
           → 3 deneme sonrası cooldown (30sn)
           → Network error → retry with exponential backoff
           → Token expired → auto-refresh token
           → Refresh failed → force re-login
```

---

## 16. Implementation Fazları

### Phase 1: Core Auth Refactor (4-6 saat)

- [ ] `AuthStage` type'a `EMAIL_PASSWORD` ve `WALLET_CONNECT` stage'leri ekle
- [ ] `useAuthFlow` hook'una `signUp`, `signIn`, `connectWallet`, `authenticateWallet` ekle
- [ ] `AuthScreenV2`'ye Email/Password formu ekle (sign-in / sign-up toggle)
- [ ] `AuthScreenV2`'ye Phantom Wallet butonu ve bağlantı UI'ı ekle
- [ ] Tüm auth stage geçişlerini test et

### Phase 2: OAuth Providers (2-3 saat)

- [ ] Supabase Dashboard'da Google OAuth konfigüre et
- [ ] Supabase Dashboard'da Twitter OAuth konfigüre et
- [ ] `AuthCallback` component'ini test et (Google + Twitter)
- [ ] OAuth → Profile check → Nickname akışını doğrula
- [ ] Redirect URL'leri production için ayarla

### Phase 3: Phantom Wallet (2-3 saat)

- [ ] `PhantomAuthService.authenticate()` → Supabase session oluşturma entegrasyonu
- [ ] Wallet bağlantı UI ekranı oluştur (installed / not-installed durumları)
- [ ] Mobile deep link desteği (Phantom mobile app açma)
- [ ] Wallet → Profile linking akışını test et
- [ ] `wallets` tablosuna kayıt işlemini doğrula

### Phase 4: Nickname Flow Polish (2 saat)

- [ ] Nickname benzersizlik kontrolü (realtime check, debounced)
- [ ] `check_nickname_available` RPC fonksiyonu oluştur
- [ ] Profanity filter entegrasyonu (client-side kelime listesi)
- [ ] Nickname değişim cooldown mekanizması
- [ ] Error mesajlarını kullanıcı dostu hale getir

### Phase 5: Security & Polish (2-3 saat)

- [ ] RLS politikalarını tüm auth senaryoları için test et
- [ ] Rate limiting konfigürasyonu doğrula
- [ ] Token refresh akışını edge case'ler ile test et
- [ ] Session timeout davranışını doğrula
- [ ] E2E test senaryoları oluştur (Playwright)

### Phase 6: Legacy Migration (1-2 saat)

- [ ] Mevcut nickname-only kullanıcıları OAuth'a bağlama UI'ı
- [ ] `ProfileService.linkLegacyProfile()` akışını test et
- [ ] Migration success notification
- [ ] Rollback mekanizması

**Toplam Tahmini Süre: 13-19 saat**

---

## 17. Dosya Yapısı

### 17.1 Mevcut + Yeni Dosyalar

```
services/auth/
├── SupabaseAuthService.ts       ✅ Mevcut (güncelle: wallet session)
├── PhantomAuthService.ts        ✅ Mevcut (güncelle: Supabase entegrasyonu)
├── TwitterAuthService.ts        ✅ Mevcut (değişiklik yok)
├── ProfileService.ts            ✅ Mevcut (güncelle: nickname availability)
├── NicknameValidator.ts         ✅ Mevcut (güncelle: profanity filter)
├── UserSessionService.ts        ✅ Mevcut (değişiklik yok)
├── UserPersistenceService.ts    ✅ Mevcut (değişiklik yok)
├── PlayerIdentityService.ts     ✅ Mevcut (değişiklik yok)
├── SecurityUtils.ts             ✅ Mevcut (değişiklik yok)
├── GameSessionService.ts        ✅ Mevcut (değişiklik yok)
├── ProfileStatsService.ts       ✅ Mevcut (değişiklik yok)
└── types.ts                     ✅ Mevcut (güncelle: phantom provider)

components/auth/
├── AuthCallback.tsx             ✅ Mevcut (değişiklik yok)
├── index.ts                     ✅ Mevcut
└── v2/
    ├── AuthScreenV2.tsx         ✅ Mevcut (güncelle: yeni stage'ler)
    ├── AuthInputs.tsx           ✅ Mevcut (güncelle: password input)
    ├── useAuthFlow.ts           ✅ Mevcut (güncelle: wallet + email/pass)
    ├── types.ts                 ✅ Mevcut (güncelle: yeni stage'ler)
    ├── WalletConnect.tsx        🆕 YENİ — Phantom wallet bağlantı UI
    ├── PasswordForm.tsx         🆕 YENİ — Email/Password giriş formu
    └── index.ts                 ✅ Mevcut

hooks/
├── useAppInitialization.ts      ✅ Mevcut (değişiklik yok)
└── useAuthState.ts              🆕 YENİ — Global auth state hook (opsiyonel)

services/supabase/
└── client.ts                    ✅ Mevcut (değişiklik yok)
```

---

## 18. Test Stratejisi

### 18.1 Unit Tests

```typescript
// tests/services/SupabaseAuthService.test.ts
describe('SupabaseAuthService', () => {
  it('should sign up with email/password', async () => { ... });
  it('should sign in with email/password', async () => { ... });
  it('should send OTP code', async () => { ... });
  it('should verify OTP code', async () => { ... });
  it('should initiate OAuth flow', async () => { ... });
  it('should handle auth state changes', () => { ... });
  it('should map auth errors to user-friendly messages', () => { ... });
});

// tests/services/PhantomAuthService.test.ts
describe('PhantomAuthService', () => {
  it('should detect Phantom installation', () => { ... });
  it('should connect to wallet', async () => { ... });
  it('should authenticate via message signing', async () => { ... });
  it('should link wallet to profile', async () => { ... });
});

// tests/components/auth/useAuthFlow.test.ts
describe('useAuthFlow', () => {
  it('should transition ENTRY → AWAITING_OTP on requestOtp', () => { ... });
  it('should transition AWAITING_OTP → PROFILE_SETUP when no nickname', () => { ... });
  it('should transition PROFILE_SETUP → SUCCESS on completeProfile', () => { ... });
  it('should handle wallet connect flow', () => { ... });
  it('should handle email/password flow', () => { ... });
});
```

### 18.2 E2E Tests (Playwright)

```typescript
// tests/e2e/auth-flow.spec.ts
test('Magic Link flow', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="play-button"]');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.click('[data-testid="send-otp-button"]');
  // OTP doğrulama (test environment'da bypass)
  await page.fill('[data-testid="otp-input"]', '123456');
  await page.click('[data-testid="verify-button"]');
  // Nickname ekranı
  await page.fill('[data-testid="nickname-input"]', 'TestPlayer');
  await page.click('[data-testid="initialize-profile-button"]');
  // Hub'a yönlendirildi mi?
  await expect(page.locator('[data-testid="hub-screen"]')).toBeVisible();
});
```

---

## 19. Supabase Dashboard Konfigürasyonu

### 19.1 Authentication → Providers

| Provider | Konfigürasyon |
|----------|---------------|
| **Email** | ✅ Enabled, Confirm Email: OFF (beta), Min Password: 8 |
| **Google** | Client ID + Secret from Google Cloud Console |
| **Twitter** | Client ID + Secret from developer.twitter.com |

### 19.2 Authentication → Email Templates

```
- Confirmation: "Welcome to Crypto Survivors! Click to verify."
- Magic Link: "Your Crypto Survivors login code: {{ .Token }}"
- Password Reset: "Reset your Crypto Survivors password"
- Invite: Disabled
```

### 19.3 Authentication → URL Configuration

```
Site URL:          https://cryptosurvivors.io
Redirect URLs:
  - https://cryptosurvivors.io/auth/callback
  - http://localhost:3000/auth/callback
  - http://localhost:4173/auth/callback
```

### 19.4 Authentication → Rate Limits

```
Email OTP:      5 per minute
Magic Link:     3 per minute  
Sign Up:        10 per hour per IP
Sign In:        30 per hour per IP
Token Refresh:  150 per 5 minutes
```

---

## 20. Deployment Checklist

### Pre-Deployment

- [ ] Supabase Dashboard'da Google OAuth provider ekle
- [ ] Supabase Dashboard'da Twitter OAuth provider ekle
- [ ] Redirect URL'leri production domain'e ayarla
- [ ] Email template'leri özelleştir (branding)
- [ ] `handle_new_user()` trigger'ını production'a deploy et
- [ ] `check_nickname_available()` RPC fonksiyonunu oluştur
- [ ] RLS politikalarını test et (anon, authenticated, service_role)

### Environment Variables

```env
# .env.production
VITE_SUPABASE_URL=https://dnhfsmvwqjxoextwbebj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Google OAuth (Dashboard'da ayarlanır, env'de değil)
# Twitter OAuth (Dashboard'da ayarlanır, env'de değil)
```

### Post-Deployment

- [ ] Google OAuth ile giriş test et
- [ ] Twitter OAuth ile giriş test et
- [ ] Magic Link (OTP) ile giriş test et
- [ ] Email/Password ile kayıt ve giriş test et
- [ ] Phantom Wallet ile giriş test et (wallet extension yüklü)
- [ ] Phantom Wallet yüklü değilse indirme linki göründüğünü doğrula
- [ ] Nickname benzersizlik kontrolünü test et
- [ ] Token refresh otomatik çalışıyor mu kontrol et
- [ ] 24 saat sonra session persistence doğrula (PWA)

---

> **Son Güncelleme:** 2026-02-11 | **Sorumlu:** Architecture Team
