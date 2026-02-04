# 🔐 Supabase OAuth Migration Roadmap

## Professional Authentication System - Nickname'den OAuth'a Geçiş

**Tarih:** 3 Şubat 2026  
**Versiyon:** 1.1.0  
**Tahmini Süre:** 16-24 saat  
**Supabase Auth Providers:** 20+ Native OAuth, Email/Password, Magic Link, Phone OTP, SAML 2.0

---

## 📊 Mevcut Sistem Analizi

### Şu Anki Durum (Nickname-Based Auth)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEVCUT ARKİTEKTÜR                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User → NicknameEntryScreen → UserContext.login()               │
│                ↓                                                │
│         NicknameValidator (3-16 karakter)                       │
│                ↓                                                │
│         Supabase profiles tablosu (display_name)                │
│                ↓                                                │
│         localStorage persistence (UserPersistenceService)       │
│                ↓                                                │
│         Device fingerprint (identity_hash in metadata)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mevcut Dosyalar

| Dosya | Görev | Değişiklik |
|-------|-------|------------|
| `services/auth/UserSessionService.ts` | Session yönetimi | 🔄 Genişletilecek |
| `services/auth/UserPersistenceService.ts` | LocalStorage | 🔄 Auth token eklenecek |
| `services/auth/TwitterAuthService.ts` | Twitter OAuth | ✅ Var (tamamlanacak) |
| `services/auth/types.ts` | Auth tipleri | 🔄 Genişletilecek |
| `services/auth/NicknameValidator.ts` | Validasyon | 🔄 Username validator olacak |
| `services/core/Supabase.ts` | Supabase client | 🔄 Auth session eklenmeli |
| `contexts/UserContext.tsx` | React context | 🔄 OAuth entegrasyonu |
| `components/screens/NicknameEntryScreen.tsx` | Giriş UI | ❌ Kaldırılacak/Değişecek |
| `components/screens/TwitterCallback.tsx` | OAuth callback | ✅ Var |
| `components/ui/TwitterLoginButton.tsx` | Twitter butonu | ✅ Var |

### Supabase Tabloları

```sql
-- profiles tablosu (Mevcut)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    display_name TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    level INTEGER DEFAULT 1,
    xp BIGINT DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    is_tester BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);

-- identities tablosu (Mevcut - OAuth için hazır)
CREATE TABLE public.identities (
    id UUID PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id),
    provider TEXT NOT NULL,        -- 'email', 'twitter', 'google'
    provider_id TEXT NOT NULL,     -- Provider'dan gelen ID
    identity_data JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    UNIQUE(provider, provider_id)
);
```

---

## 🎯 Hedef Sistem

### OAuth Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      YENİ AUTH MİMARİSİ                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   Email/    │    │   Twitter   │    │   Google    │                 │
│  │  Password   │    │    OAuth    │    │   OAuth     │                 │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                  │                  │                         │
│         └────────────┬─────┴─────────────────┘                         │
│                      ▼                                                  │
│         ┌─────────────────────────┐                                    │
│         │  SupabaseAuthService    │                                    │
│         │  (Unified Auth Layer)   │                                    │
│         └───────────┬─────────────┘                                    │
│                     ▼                                                  │
│         ┌─────────────────────────┐                                    │
│         │   Supabase Auth         │                                    │
│         │   (auth.users)          │                                    │
│         └───────────┬─────────────┘                                    │
│                     ▼                                                  │
│         ┌─────────────────────────┐                                    │
│         │   profiles + identities │                                    │
│         │   (Custom tables)       │                                    │
│         └───────────┬─────────────┘                                    │
│                     ▼                                                  │
│         ┌─────────────────────────┐                                    │
│         │   UserContext           │                                    │
│         │   (Session Management)  │                                    │
│         └─────────────────────────┘                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Desteklenecek Auth Metodları

Supabase, 20'den fazla OAuth sağlayıcısını yerel olarak destekler. Aşağıda proje için önceliklendirilmiş provider listesi yer almaktadır:

#### 🔴 Tier 1 - Birincil Öncelik (Lansman için Gerekli)

| Metod | Durum | Notlar | Supabase Desteği |
|-------|-------|--------|------------------|
| **Email/Password** | ⬜ Yapılacak | Klasik email + şifre girişi | ✅ Native |
| **Twitter/X OAuth 2.0** | 🔶 Kısmi | PKCE flow var, profile linking eksik | ✅ Native |
| **Google OAuth** | ⬜ Yapılacak | En yaygın OAuth provider | ✅ Native |
| **Discord OAuth** | ⬜ Yapılacak | Gamer kitlesi için ideal | ✅ Native |

#### 🟡 Tier 2 - Orta Öncelik (Post-Launch)

| Metod | Durum | Notlar | Supabase Desteği |
|-------|-------|--------|------------------|
| **Apple Sign In** | ⬜ Yapılacak | iOS kullanıcıları için zorunlu | ✅ Native |
| **GitHub OAuth** | ⬜ Yapılacak | Geliştirici kitlesi için | ✅ Native |
| **Twitch OAuth** | ⬜ Yapılacak | Yayıncı entegrasyonu | ✅ Native |
| **Magic Link** | ⬜ Opsiyonel | Şifresiz email linki ile giriş | ✅ Native |
| **Phone/SMS OTP** | ⬜ Opsiyonel | Twilio/MessageBird entegrasyonu | ✅ Native |

#### 🟢 Tier 3 - Düşük Öncelik (Gelecek Fazlar)

| Metod | Durum | Notlar | Supabase Desteği |
|-------|-------|--------|------------------|
| **Facebook OAuth** | ⬜ Gelecek | Geniş kullanıcı tabanı | ✅ Native |
| **Microsoft/Azure AD** | ⬜ Gelecek | Kurumsal kullanıcılar | ✅ Native |
| **Spotify OAuth** | ⬜ Gelecek | Müzik entegrasyonu | ✅ Native |
| **LinkedIn OAuth** | ⬜ Gelecek | Profesyonel ağ | ✅ Native |
| **Slack OAuth** | ⬜ Gelecek | Workspace entegrasyonu | ✅ Native |
| **Notion OAuth** | ⬜ Gelecek | Prodüktivite entegrasyonu | ✅ Native |
| **Figma OAuth** | ⬜ Gelecek | Tasarımcı kitlesi | ✅ Native |
| **Bitbucket OAuth** | ⬜ Gelecek | Atlassian ekosistemi | ✅ Native |
| **GitLab OAuth** | ⬜ Gelecek | DevOps kitlesi | ✅ Native |
| **Zoom OAuth** | ⬜ Gelecek | Video konferans entegrasyonu | ✅ Native |
| **Keycloak OIDC** | ⬜ Gelecek | Self-hosted identity provider | ✅ Native |
| **WorkOS SSO** | ⬜ Gelecek | Enterprise SSO (SAML) | ✅ Native |
| **Kakao OAuth** | ⬜ Gelecek | Kore pazarı | ✅ Native |
| **Wallet Connect** | ⬜ Phase 2 | Web3 cüzdan girişi | 🔧 Custom |

#### 📊 Supabase Auth Desteklenen Tüm Provider'lar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE NATIVE AUTH PROVIDERS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📧 EMAIL-BASED           🔐 OAUTH 2.0 SOCIAL           🏢 ENTERPRISE      │
│  ─────────────            ──────────────────            ─────────────       │
│  • Email/Password         • Google                      • Azure AD          │
│  • Magic Link             • Twitter/X (OAuth 2.0)       • Keycloak          │
│  • Phone/SMS OTP          • Discord                     • WorkOS            │
│                           • Apple                       • SAML 2.0          │
│                           • GitHub                                          │
│                           • Facebook                    🎮 GAMING           │
│                           • Twitch                      ─────────────       │
│                           • Spotify                     • Twitch            │
│                           • Slack                       • Discord           │
│                           • Notion                                          │
│                           • Figma                       🌏 REGIONAL         │
│                           • LinkedIn                    ─────────────       │
│                           • Bitbucket                   • Kakao (Korea)     │
│                           • GitLab                      • LINE (Japan)      │
│                           • Zoom                        • Fly.io            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Referans:** [Supabase Auth Providers Documentation](https://supabase.com/docs/guides/auth/social-login)

---

## 📋 Migration Phases

### Phase 0: Hazırlık (2 saat)

#### 0.1 Supabase Dashboard Konfigürasyonu

```yaml
# Supabase Dashboard → Authentication → Providers

# ============================================
# TIER 1: LANSMAN İÇİN GEREKLİ
# ============================================

# Email Provider (Native)
Email:
  enabled: true
  confirm_email: true
  double_confirm_email_changes: true
  secure_password_change: true
  minimum_password_length: 8
  
# Twitter/X Provider (OAuth 2.0 - Önerilen)
Twitter:
  enabled: true
  client_id: ${VITE_TWITTER_CLIENT_ID}
  client_secret: ${TWITTER_CLIENT_SECRET}
  # Callback URL: https://<project-ref>.supabase.co/auth/v1/callback

# Google Provider
Google:
  enabled: true
  client_id: ${GOOGLE_CLIENT_ID}
  client_secret: ${GOOGLE_CLIENT_SECRET}
  # Callback URL: https://<project-ref>.supabase.co/auth/v1/callback
  # Google Cloud Console → APIs & Services → Credentials

# Discord Provider (Gamer Kitlesi)
Discord:
  enabled: true
  client_id: ${DISCORD_CLIENT_ID}
  client_secret: ${DISCORD_CLIENT_SECRET}
  # Discord Developer Portal: https://discord.com/developers/applications
  # Scopes: identify, email

# ============================================
# TIER 2: POST-LAUNCH
# ============================================

# Apple Sign In (iOS için zorunlu)
Apple:
  enabled: false  # iOS app yayınlanınca aktif edilecek
  client_id: ${APPLE_CLIENT_ID}  # Services ID
  secret_key: ${APPLE_SECRET_KEY}  # .p8 key içeriği
  # Apple Developer → Certificates, Identifiers & Profiles

# GitHub Provider (Geliştirici Kitlesi)
GitHub:
  enabled: true
  client_id: ${GITHUB_CLIENT_ID}
  client_secret: ${GITHUB_CLIENT_SECRET}
  # GitHub Settings → Developer Settings → OAuth Apps

# Twitch Provider (Yayıncı Entegrasyonu)
Twitch:
  enabled: false  # Gerektiğinde aktif edilecek
  client_id: ${TWITCH_CLIENT_ID}
  client_secret: ${TWITCH_CLIENT_SECRET}
  # Twitch Developer Console: https://dev.twitch.tv/console
```

#### 0.2 Environment Variables

```env
# .env güncelleme

# ============================================
# SUPABASE CORE (Mevcut)
# ============================================
VITE_SUPABASE_URL=https://dnhfsmvwqjxoextwbebj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx

# ============================================
# TIER 1: LANSMAN İÇİN GEREKLİ
# ============================================

# Twitter/X OAuth 2.0 (Mevcut)
VITE_TWITTER_CLIENT_ID=QmNfbF9pQzF5bF9XVWJYMTlnOVc6MTpjaQ
TWITTER_CLIENT_SECRET=MgNdVpZBQFI3dtkHyPCnrf2zrSQ7dAkdBqZe8JMYA_vbOCSqlm

# Google OAuth (Google Cloud Console)
# https://console.cloud.google.com/apis/credentials
VITE_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Discord OAuth (Discord Developer Portal)
# https://discord.com/developers/applications
VITE_DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# ============================================
# TIER 2: POST-LAUNCH
# ============================================

# GitHub OAuth (GitHub Settings → Developer Settings)
# https://github.com/settings/developers
VITE_GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Apple Sign In (Apple Developer Console)
# https://developer.apple.com/account/resources/identifiers
APPLE_CLIENT_ID=        # Services ID (e.g., com.example.app.service)
APPLE_SECRET_KEY=       # Contents of .p8 key file
APPLE_TEAM_ID=          # Apple Developer Team ID
APPLE_KEY_ID=           # Key ID from Apple Developer

# Twitch OAuth (Twitch Developer Console)
# https://dev.twitch.tv/console/apps
VITE_TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

# ============================================
# EMAIL / SMTP (Mevcut - Zoho)
# ============================================
ZOHO_SMTP_HOST=smtp.zoho.eu
ZOHO_SMTP_PORT=465
ZOHO_SMTP_USER=info@crypto-survivors.com
ZOHO_SMTP_PASS=your_password
```

#### 0.3 Supabase SMTP Konfigürasyonu

Supabase Dashboard → Project Settings → Authentication → SMTP Settings:

```yaml
SMTP Host: smtp.zoho.eu
SMTP Port: 465
SMTP User: info@crypto-survivors.com
SMTP Pass: ****
Sender Name: Crypto Survivors
Sender Email: info@crypto-survivors.com
```

**Checklist Phase 0:**
- [ ] Supabase Dashboard'da Email auth aktive et
- [ ] Supabase Dashboard'da Twitter/X provider ekle
- [ ] Supabase Dashboard'da Google provider ekle
- [ ] Supabase Dashboard'da Discord provider ekle
- [ ] Supabase Dashboard'da GitHub provider ekle
- [ ] (Opsiyonel) Apple Sign In provider ekle (iOS için)
- [ ] (Opsiyonel) Twitch provider ekle (yayıncı entegrasyonu için)
- [ ] SMTP ayarlarını konfigüre et (Zoho)
- [ ] Email templates özelleştir (Supabase Dashboard → Email Templates)
- [ ] Redirect URLs whitelist ekle:
  - `https://crypto-survivors.com/auth/callback`
  - `https://crypto-survivors.com/auth/twitter/callback`
  - `http://localhost:3000/auth/callback` (development)
- [ ] Environment variables kontrol et (.env + Supabase Secrets)
- [ ] OAuth app callback URL'lerini doğrula (her provider için)

---

### Phase 1: Database Migration (3 saat) ✅ COMPLETED

> **Implementation:** `supabase/migrations/20260203235500_auth_system_migration.sql`

#### 1.1 Yeni Migration Dosyası

```sql
-- supabase/migrations/20260203_auth_system_migration.sql

-- ============================================
-- AUTH SYSTEM MIGRATION: Nickname → OAuth
-- ============================================

-- 1. Profiles tablosuna auth_user_id ekle (Supabase Auth bağlantısı)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Email alanı ekle (username olarak kullanılabilir)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Email verification durumu
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 4. Auth provider bilgisi
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS primary_auth_provider TEXT DEFAULT 'email';

-- 5. Username (display_name yerine opsiyonel unique username)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 6. Trigger: Supabase Auth → profiles sync
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_user_id,
    email,
    email_verified,
    display_name,
    primary_auth_provider,
    created_at,
    last_seen_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    last_seen_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. identities tablosu için RLS güncelle
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own identities"
  ON public.identities FOR SELECT
  USING (profile_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own identities"
  ON public.identities FOR ALL
  USING (profile_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  ));

-- 8. profiles RLS güncelle
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Auth trigger can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);
```

#### 1.2 Mevcut Kullanıcıları Migrate Etme (Opsiyonel)

```sql
-- Eski nickname kullanıcıları için migration script
-- Bu kullanıcılar email ile kaydolduğunda nickname'leri korunacak

-- Mevcut nickname'leri username alanına kopyala (unique olanlar)
UPDATE public.profiles
SET username = display_name
WHERE username IS NULL
  AND display_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.username = profiles.display_name
  );
```

**Checklist Phase 1:**
- [ ] Migration SQL'i test et (staging)
- [ ] Mevcut verilerin backup'ını al
- [ ] Migration'ı production'a uygula
- [ ] Trigger'ların çalıştığını doğrula
- [ ] RLS policy'lerini test et

---

### Phase 2: SupabaseAuthService (4 saat) ✅ COMPLETED

> **Implementation Files:**
> - `services/auth/SupabaseAuthService.ts` - Unified auth service
> - `services/auth/types.ts` - Complete auth type definitions
> - `components/auth/LoginScreen.tsx` - Modern login UI
> - `components/auth/AuthCallback.tsx` - OAuth callback handler
> - `components/auth/index.ts` - Auth components barrel export

#### 2.1 Yeni Auth Service

```typescript
// services/auth/SupabaseAuthService.ts

import { supabase, isSupabaseConfigured } from '../core/Supabase';
import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import type { AuthUser, AuthSession, Provider } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export interface ProfileData {
  id: string;
  authUserId: string;
  email: string | null;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xp: number;
  isTester: boolean;
  primaryAuthProvider: string;
  createdAt: string;
  lastSeenAt: string;
}

export type AuthProvider = 'email' | 'twitter' | 'google';

// ============================================
// Service Class
// ============================================

class SupabaseAuthServiceClass {
  private static instance: SupabaseAuthServiceClass | null = null;

  static getInstance(): SupabaseAuthServiceClass {
    return (SupabaseAuthServiceClass.instance ??= new SupabaseAuthServiceClass());
  }

  // ============================================
  // Email/Password Auth
  // ============================================

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<AuthResult> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: displayName || email.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        Logger.error('[SupabaseAuth] SignUp error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return {
          success: true,
          user: data.user,
          needsEmailConfirmation: true,
        };
      }

      if (data.session && data.user) {
        EventBus.emit('authStateChanged', {
          type: 'signUp',
          user: data.user,
        });

        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      return { success: false, error: 'Unknown error during signup' };
    } catch (err) {
      Logger.error('[SupabaseAuth] SignUp exception:', err);
      return { success: false, error: 'Connection error' };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Logger.error('[SupabaseAuth] SignIn error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      if (data.session && data.user) {
        EventBus.emit('authStateChanged', {
          type: 'signIn',
          user: data.user,
        });

        // Update last seen
        await this.updateLastSeen(data.user.id);

        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      return { success: false, error: 'Invalid credentials' };
    } catch (err) {
      Logger.error('[SupabaseAuth] SignIn exception:', err);
      return { success: false, error: 'Connection error' };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Logger.error('[SupabaseAuth] SignOut error:', error);
        return { success: false, error: error.message };
      }

      EventBus.emit('authStateChanged', {
        type: 'signOut',
        user: null,
      });

      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] SignOut exception:', err);
      return { success: false, error: 'Failed to sign out' };
    }
  }

  // ============================================
  // OAuth (Twitter, Google)
  // ============================================

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: AuthProvider): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: provider === 'twitter' ? 'tweet.read users.read' : undefined,
        },
      });

      if (error) {
        Logger.error(`[SupabaseAuth] ${provider} OAuth error:`, error);
        return { success: false, error: error.message };
      }

      // OAuth redirects, so we won't reach here normally
      return { success: true };
    } catch (err) {
      Logger.error(`[SupabaseAuth] ${provider} OAuth exception:`, err);
      return { success: false, error: 'OAuth failed' };
    }
  }

  // ============================================
  // Password Reset
  // ============================================

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        Logger.error('[SupabaseAuth] Reset password error:', error);
        return { success: false, error: this.mapAuthError(error.message) };
      }

      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] Reset password exception:', err);
      return { success: false, error: 'Failed to send reset email' };
    }
  }

  /**
   * Update password (after reset)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: this.mapAuthError(error.message) };
      }

      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] Update password exception:', err);
      return { success: false, error: 'Failed to update password' };
    }
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Get current session
   */
  async getSession(): Promise<AuthSession | null> {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  }

  /**
   * Get current user
   */
  async getUser(): Promise<AuthUser | null> {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Get user profile from profiles table
   */
  async getProfile(): Promise<ProfileData | null> {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const user = await this.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        authUserId: data.auth_user_id,
        email: data.email,
        displayName: data.display_name,
        username: data.username,
        avatarUrl: data.avatar_url,
        level: data.level,
        xp: data.xp,
        isTester: data.is_tester,
        primaryAuthProvider: data.primary_auth_provider,
        createdAt: data.created_at,
        lastSeenAt: data.last_seen_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<{
    displayName: string;
    username: string;
    avatarUrl: string;
  }>): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const user = await this.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...(updates.displayName && { display_name: updates.displayName }),
          ...(updates.username && { username: updates.username }),
          ...(updates.avatarUrl && { avatar_url: updates.avatarUrl }),
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', user.id);

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Username already taken' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      Logger.error('[SupabaseAuth] Update profile exception:', err);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  // ============================================
  // Auth State Listener
  // ============================================

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    if (!isSupabaseConfigured() || !supabase) {
      Logger.warn('[SupabaseAuth] Cannot listen - not configured');
      return () => {};
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      Logger.info(`[SupabaseAuth] Auth state changed: ${event}`);
      callback(event, session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async updateLastSeen(authUserId: string): Promise<void> {
    if (!supabase) return;

    try {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('auth_user_id', authUserId);
    } catch {
      // Silent fail
    }
  }

  private mapAuthError(message: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Email veya şifre hatalı',
      'Email not confirmed': 'Lütfen email adresinizi doğrulayın',
      'User already registered': 'Bu email zaten kayıtlı',
      'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı',
      'Unable to validate email address: invalid format': 'Geçersiz email formatı',
    };

    return errorMap[message] || message;
  }

  /**
   * Reset for testing
   */
  reset(): void {
    // No state to reset in singleton
  }
}

export const SupabaseAuthService = SupabaseAuthServiceClass.getInstance();
```

**Checklist Phase 2:**
- [ ] SupabaseAuthService.ts oluştur
- [ ] Email/password sign up implement et
- [ ] Email/password sign in implement et
- [ ] OAuth provider support ekle
- [ ] Password reset flow implement et
- [ ] Session management implement et
- [ ] Auth state listener ekle
- [ ] Unit testler yaz

---

### Phase 3: UI Components (4 saat)

#### 3.1 Yeni Auth Screens

```
components/
├── auth/
│   ├── AuthScreen.tsx          # Ana auth container
│   ├── LoginForm.tsx           # Email/password login
│   ├── SignUpForm.tsx          # Email/password kayıt
│   ├── ForgotPasswordForm.tsx  # Şifre sıfırlama
│   ├── OAuthButtons.tsx        # Twitter/Google butonları
│   ├── AuthCallback.tsx        # OAuth callback handler
│   └── EmailVerification.tsx   # Email doğrulama ekranı
```

#### 3.2 AuthScreen Component

```typescript
// components/auth/AuthScreen.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { OAuthButtons } from './OAuthButtons';
import { ThemedPanel } from '../themed/ThemedPanel';
import { useLanguage } from '../../contexts/LanguageContext';

type AuthView = 'login' | 'signup' | 'forgot-password';

interface AuthScreenProps {
  onSuccess: () => void;
  initialView?: AuthView;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  initialView = 'login',
}) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950 px-4">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.15),transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <ThemedPanel className="p-6 sm:p-8">
          {/* Header */}
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {view === 'login' && t('auth.login.title')}
              {view === 'signup' && t('auth.signup.title')}
              {view === 'forgot-password' && t('auth.forgot.title')}
            </h1>
            <p className="text-slate-400 text-sm">
              {view === 'login' && t('auth.login.subtitle')}
              {view === 'signup' && t('auth.signup.subtitle')}
              {view === 'forgot-password' && t('auth.forgot.subtitle')}
            </p>
          </header>

          {/* OAuth Buttons (Login & Signup only) */}
          {view !== 'forgot-password' && (
            <>
              <OAuthButtons onSuccess={onSuccess} />
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-900 text-slate-500">
                    {t('auth.or_continue_with')}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Forms */}
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <LoginForm
                key="login"
                onSuccess={onSuccess}
                onForgotPassword={() => setView('forgot-password')}
                defaultEmail={email}
                onEmailChange={setEmail}
              />
            )}
            {view === 'signup' && (
              <SignUpForm
                key="signup"
                onSuccess={onSuccess}
                defaultEmail={email}
                onEmailChange={setEmail}
              />
            )}
            {view === 'forgot-password' && (
              <ForgotPasswordForm
                key="forgot"
                onBack={() => setView('login')}
                defaultEmail={email}
              />
            )}
          </AnimatePresence>

          {/* View Toggle */}
          <footer className="mt-6 text-center text-sm">
            {view === 'login' && (
              <p className="text-slate-400">
                {t('auth.no_account')}{' '}
                <button
                  onClick={() => setView('signup')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  {t('auth.signup.action')}
                </button>
              </p>
            )}
            {view === 'signup' && (
              <p className="text-slate-400">
                {t('auth.have_account')}{' '}
                <button
                  onClick={() => setView('login')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  {t('auth.login.action')}
                </button>
              </p>
            )}
          </footer>
        </ThemedPanel>
      </motion.div>
    </div>
  );
};
```

#### 3.3 OAuthButtons Component

```typescript
// components/auth/OAuthButtons.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SupabaseAuthService } from '../../services/auth/SupabaseAuthService';
import { Twitter } from 'lucide-react';

interface OAuthButtonsProps {
  onSuccess: () => void;
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (provider: 'twitter' | 'google') => {
    setLoading(provider);
    setError(null);

    const result = await SupabaseAuthService.signInWithOAuth(provider);
    
    if (!result.success) {
      setError(result.error || 'OAuth failed');
      setLoading(null);
    }
    // Success = redirect to OAuth provider
  };

  return (
    <div className="space-y-3">
      {/* Twitter Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleOAuth('twitter')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
      >
        {loading === 'twitter' ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Twitter className="w-5 h-5 text-[#1DA1F2]" />
        )}
        Continue with Twitter
      </motion.button>

      {/* Google Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleOAuth('google')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
      >
        {loading === 'google' ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <GoogleIcon className="w-5 h-5" />
        )}
        Continue with Google
      </motion.button>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}
    </div>
  );
};

// Google SVG Icon
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);
```

**Checklist Phase 3:**
- [ ] AuthScreen.tsx oluştur
- [ ] LoginForm.tsx oluştur
- [ ] SignUpForm.tsx oluştur
- [ ] ForgotPasswordForm.tsx oluştur
- [ ] OAuthButtons.tsx oluştur
- [ ] AuthCallback.tsx (OAuth redirect handler) oluştur
- [ ] EmailVerification.tsx oluştur
- [ ] NicknameEntryScreen → AuthScreen geçişi yap
- [ ] Responsive tasarım test et

---

### Phase 4: UserContext Refactor (3 saat)

#### 4.1 Updated Types

```typescript
// services/auth/types.ts

export interface StoredUser {
  profileId: string;          // UUID from profiles table
  authUserId: string | null;  // Supabase Auth user ID (YENİ)
  email: string | null;       // User email (YENİ)
  displayName: string;        // Display name (nickname yerine)
  username: string | null;    // Unique username (opsiyonel)
  avatarUrl: string | null;   // Profile picture (YENİ)
  authProvider: string;       // 'email' | 'twitter' | 'google' (YENİ)
  createdAt: number;
  lastSeenAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: StoredUser | null;
  error: string | null;
}
```

#### 4.2 Updated UserContext

```typescript
// contexts/UserContext.tsx (Güncellenmiş versiyon)

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseAuthService, type ProfileData } from '../services/auth/SupabaseAuthService';
import { UserPersistenceService } from '../services/auth/UserPersistenceService';
import { Logger } from '../services/system/Logger';
import type { StoredUser } from '../services/auth/types';

export interface UserContextType {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Email auth
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  
  // OAuth
  signInWithTwitter: () => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  
  // Profile
  updateProfile: (updates: { displayName?: string; username?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  
  // Password
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  
  // Legacy (backward compat)
  profileId: string;
  nickname: string | null;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize: Check for existing session
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check Supabase session first
        const session = await SupabaseAuthService.getSession();
        
        if (session?.user) {
          const profile = await SupabaseAuthService.getProfile();
          if (profile) {
            const storedUser = mapProfileToStoredUser(profile);
            setUser(storedUser);
            UserPersistenceService.saveUser(storedUser);
          }
        } else {
          // Fallback: Check localStorage (for migration period)
          const stored = UserPersistenceService.getStoredUser();
          if (stored) {
            setUser(stored);
          }
        }
      } catch (err) {
        Logger.error('[UserContext] Init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();

    // Listen for auth state changes
    const unsubscribe = SupabaseAuthService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await SupabaseAuthService.getProfile();
        if (profile) {
          const storedUser = mapProfileToStoredUser(profile);
          setUser(storedUser);
          UserPersistenceService.saveUser(storedUser);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        UserPersistenceService.clear();
      }
    });

    return unsubscribe;
  }, []);

  // Auth methods
  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    setError(null);
    const result = await SupabaseAuthService.signUp(email, password, displayName);
    if (!result.success) {
      setError(result.error || 'Sign up failed');
    }
    return result;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const result = await SupabaseAuthService.signIn(email, password);
    if (!result.success) {
      setError(result.error || 'Sign in failed');
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await SupabaseAuthService.signOut();
    setUser(null);
    UserPersistenceService.clear();
  }, []);

  const signInWithTwitter = useCallback(async () => {
    return SupabaseAuthService.signInWithOAuth('twitter');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return SupabaseAuthService.signInWithOAuth('google');
  }, []);

  const updateProfile = useCallback(async (updates: { displayName?: string; username?: string; avatarUrl?: string }) => {
    return SupabaseAuthService.updateProfile(updates);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return SupabaseAuthService.resetPassword(email);
  }, []);

  // Context value
  const value = useMemo<UserContextType>(() => ({
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    signUp,
    signIn,
    signOut,
    signInWithTwitter,
    signInWithGoogle,
    updateProfile,
    resetPassword,
    // Legacy compat
    profileId: user?.profileId || 'anon',
    nickname: user?.displayName || null,
  }), [user, isLoading, error, signUp, signIn, signOut, signInWithTwitter, signInWithGoogle, updateProfile, resetPassword]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Helper: Map ProfileData to StoredUser
function mapProfileToStoredUser(profile: ProfileData): StoredUser {
  return {
    profileId: profile.id,
    authUserId: profile.authUserId,
    email: profile.email,
    displayName: profile.displayName,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    authProvider: profile.primaryAuthProvider,
    createdAt: new Date(profile.createdAt).getTime(),
    lastSeenAt: new Date(profile.lastSeenAt).getTime(),
  };
}
```

**Checklist Phase 4:**
- [ ] types.ts güncelle (StoredUser genişlet)
- [ ] UserContext.tsx OAuth metodları ekle
- [ ] Auth state listener entegre et
- [ ] Legacy backward compatibility koru
- [ ] useUser hook güncelle
- [ ] Test coverage ekle

---

### Phase 5: App.tsx Integration (2 saat)

#### 5.1 Auth Flow Entegrasyonu

```typescript
// App.tsx değişiklikleri

// Imports
import { AuthScreen } from './components/auth/AuthScreen';
import { AuthCallback } from './components/auth/AuthCallback';

// Route handling (basit versiyon)
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useUser();
  const [showAuth, setShowAuth] = useState(false);
  
  // Handle OAuth callback
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/auth/callback') {
      // OAuth callback - AuthCallback component handle edecek
      return;
    }
  }, []);

  // Auth loading
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated || showAuth) {
    return <AuthScreen onSuccess={() => setShowAuth(false)} />;
  }

  // Rest of the app...
  return <MainApp />;
};
```

#### 5.2 Routing Güncellemesi

```typescript
// Basit hash-based routing ekle (veya react-router kullan)

const routes = {
  '/': 'home',
  '/auth/callback': 'auth-callback',
  '/auth/reset-password': 'reset-password',
} as const;
```

**Checklist Phase 5:**
- [ ] App.tsx'de auth state kontrol et
- [ ] OAuth callback route ekle
- [ ] Password reset route ekle
- [ ] Loading states handle et
- [ ] Error boundary güncelle

---

### Phase 6: Translations & Polish (2 saat)

#### 6.1 i18n Translations

```typescript
// contexts/LanguageConstants.ts - Auth çevirileri ekle

export const translations = {
  tr: {
    auth: {
      login: {
        title: 'Giriş Yap',
        subtitle: 'Hesabına giriş yap',
        action: 'Giriş Yap',
        email: 'Email',
        password: 'Şifre',
        forgot_password: 'Şifremi Unuttum',
      },
      signup: {
        title: 'Kayıt Ol',
        subtitle: 'Yeni hesap oluştur',
        action: 'Kayıt Ol',
        email: 'Email',
        password: 'Şifre',
        display_name: 'Kullanıcı Adı',
        confirm_password: 'Şifre Tekrar',
      },
      forgot: {
        title: 'Şifre Sıfırla',
        subtitle: 'Email adresine sıfırlama linki gönderilecek',
        action: 'Link Gönder',
        back: 'Giriş ekranına dön',
      },
      email_verification: {
        title: 'Email Doğrulama',
        message: 'Email adresinize doğrulama linki gönderdik. Lütfen kontrol edin.',
        resend: 'Tekrar Gönder',
      },
      or_continue_with: 'veya şununla devam et',
      no_account: 'Hesabın yok mu?',
      have_account: 'Zaten hesabın var mı?',
      errors: {
        invalid_email: 'Geçersiz email adresi',
        weak_password: 'Şifre en az 6 karakter olmalı',
        passwords_not_match: 'Şifreler eşleşmiyor',
        email_taken: 'Bu email zaten kayıtlı',
        invalid_credentials: 'Email veya şifre hatalı',
        network_error: 'Bağlantı hatası. Tekrar deneyin.',
      },
    },
  },
  en: {
    auth: {
      login: {
        title: 'Sign In',
        subtitle: 'Welcome back, survivor',
        action: 'Sign In',
        email: 'Email',
        password: 'Password',
        forgot_password: 'Forgot Password?',
      },
      signup: {
        title: 'Sign Up',
        subtitle: 'Create your account',
        action: 'Create Account',
        email: 'Email',
        password: 'Password',
        display_name: 'Display Name',
        confirm_password: 'Confirm Password',
      },
      forgot: {
        title: 'Reset Password',
        subtitle: "We'll send you a reset link",
        action: 'Send Reset Link',
        back: 'Back to sign in',
      },
      email_verification: {
        title: 'Verify Your Email',
        message: "We've sent a verification link to your email. Please check your inbox.",
        resend: 'Resend Email',
      },
      or_continue_with: 'or continue with',
      no_account: "Don't have an account?",
      have_account: 'Already have an account?',
      errors: {
        invalid_email: 'Invalid email address',
        weak_password: 'Password must be at least 6 characters',
        passwords_not_match: 'Passwords do not match',
        email_taken: 'Email already registered',
        invalid_credentials: 'Invalid email or password',
        network_error: 'Connection error. Please try again.',
      },
    },
  },
};
```

**Checklist Phase 6:**
- [ ] Türkçe çeviriler ekle
- [ ] İngilizce çeviriler ekle
- [ ] Form validation mesajları
- [ ] Error mesajları
- [ ] Success toast mesajları

---

## ✅ Final Checklist

### Pre-Deployment

- [ ] **Database**: Migration script test edildi
- [ ] **Supabase Dashboard**: Email auth aktif
- [ ] **Supabase Dashboard**: Twitter OAuth konfigüre
- [ ] **Supabase Dashboard**: SMTP ayarları yapıldı
- [ ] **Supabase Dashboard**: Email templates özelleştirildi
- [ ] **Environment**: Tüm env variables set edildi
- [ ] **Code**: SupabaseAuthService implement edildi
- [ ] **Code**: UI components oluşturuldu
- [ ] **Code**: UserContext güncellendi
- [ ] **Code**: App.tsx entegrasyonu yapıldı
- [ ] **Tests**: Auth flow E2E testleri geçiyor
- [ ] **Tests**: Unit testler geçiyor

### Post-Deployment

- [ ] **Staging**: Full auth flow test edildi
- [ ] **Staging**: Email gönderimi çalışıyor
- [ ] **Staging**: Twitter OAuth çalışıyor
- [ ] **Production**: Migration uygulandı
- [ ] **Production**: Smoke test yapıldı
- [ ] **Monitoring**: Error tracking aktif

---

## 🚨 Rollback Plan

Eğer kritik bir hata oluşursa:

### Database Rollback

```sql
-- Eski sisteme dönüş (sadece kritik durumda)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_user_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verified;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS primary_auth_provider;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```

### Code Rollback

```bash
# Git ile kod rollback
git revert <commit-hash>
git push origin main
```

---

## 📊 Success Metrics

| Metrik | Hedef | Ölçüm |
|--------|-------|-------|
| Sign up conversion | >60% | Analytics |
| Login success rate | >95% | Supabase logs |
| Email verify rate | >40% | Supabase dashboard |
| OAuth link rate | >20% | identities tablo |
| Auth error rate | <5% | Error tracking |

---

## 🗓 Timeline

| Phase | Süre | Başlangıç | Bitiş |
|-------|------|-----------|-------|
| Phase 0: Hazırlık | 2h | Day 1 | Day 1 |
| Phase 1: Database | 3h | Day 1 | Day 1 |
| Phase 2: AuthService | 4h | Day 1-2 | Day 2 |
| Phase 3: UI | 4h | Day 2 | Day 2 |
| Phase 4: UserContext | 3h | Day 2-3 | Day 3 |
| Phase 5: Integration | 2h | Day 3 | Day 3 |
| Phase 6: Polish | 2h | Day 3 | Day 3 |
| **TOPLAM** | **20h** | - | - |

---

## 📝 Notes

### Önemli Noktalar

1. **Backward Compatibility**: Mevcut nickname kullanıcıları etkilenmemeli
2. **Session Migration**: localStorage'daki eski session'lar valid kalmalı (geçiş döneminde)
3. **RLS Policies**: Yeni auth sistemiyle uyumlu olmalı
4. **Error Handling**: Tüm auth hataları user-friendly mesajlarla gösterilmeli

### Gelecek İyileştirmeler

- [ ] Magic Link desteği
- [ ] Multi-factor authentication (MFA)
- [ ] Social account linking (merge accounts)
- [ ] Wallet Connect entegrasyonu
- [ ] Session management UI (aktif cihazlar)

---

**Doküman Sahibi**: Crypto Survivors Dev Team  
**Son Güncelleme**: 3 Şubat 2026
