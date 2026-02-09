---
description: Production-ready authentication system refactoring - database, services, UI consolidation
---
# 🔐 Auth System Refactor Workflow

## Overview
Bu workflow, authentication sistemini production-ready hale getirir. Mevcut legacy nickname sistemi korunurken, modern OAuth ve email/password desteği eklenir.

---

## 📊 Current State Analysis

### Database (Supabase)
| Table | Status | Notes |
|-------|--------|-------|
| `profiles` | ✅ Ready | auth_user_id, email, username, avatar_url, primary_auth_provider eklendi |
| `sessions` | ⚠️ Review | profile_id nullable - auth user'a bağlanmalı |
| `identities` | ✅ Ready | Provider identity tracking |
| `device_profiles` | ✅ Ready | Cihaz fingerprint tracking |
| `virtual_accounts` | ⚠️ Review | profile_id bağlantısı |

### Services
| Service | Status | Notes |
|---------|--------|-------|
| `SupabaseAuthService` | ✅ Ready | Email, OAuth, Magic Link desteği |
| `ProfileService` | ⚠️ Review | auth_user_id kullanımı güncellenecek |
| `UserSessionService` | ⚠️ Legacy | Nickname-based, modernize edilecek |
| `UserContext` | ⚠️ Mixed | Legacy + modern karışık |
| `PhantomAuthService` | ✅ Ready | Solana wallet auth |
| `TwitterAuthService` | 🗑️ Deprecated | SupabaseAuthService kullanılacak |

### Components
| Component | Status | Notes |
|-----------|--------|-------|
| `LoginScreen` | ✅ Ready | Email, OAuth, Magic Link UI |
| `AuthCallback` | ✅ Ready | OAuth callback handler |
| `UserAvatar` | ✅ New | OAuth avatar desteği |
| Profile Settings | ❌ Missing | Profil düzenleme sayfası yok |

---

## 🎯 Implementation Plan

### Phase 1: Database Finalization (Completed)
- [x] profiles tablosuna auth kolonları eklendi
- [x] Trigger'lar oluşturuldu (on_auth_user_created, on_auth_user_updated)
- [x] RLS policies güncellendi
- [x] v_leaderboard view'a avatar/provider eklendi
- [x] TypeScript types güncellendi

### Phase 2: Service Layer Consolidation (✅ Completed)

#### 2.1 ProfileService Güncellemesi ✅
**Dosya:** `services/auth/ProfileService.ts`
**Değişiklikler:**
- ✅ `initialize()`: auth_user_id ile profile lookup
- ✅ `createProfile()`: auth_user_id, email, authProvider parametreleri eklendi
- ✅ `mapToPlayerProfile()`: Yeni alanları map et (avatar, provider, email, username)
- ✅ `linkLegacyProfile()` - legacy profili auth'a bağla (NEW METHOD)

#### 2.2 SupabaseAuthService Updates ✅
**Dosya:** `services/auth/SupabaseAuthService.ts`
**Değişiklikler:**
- ✅ `getCurrentProfile()` - Alias for getProfile
- ✅ `getLinkedProviders()` - Get OAuth providers linked to user
- ✅ `unlinkProvider()` - Unlink OAuth provider (stub)
- ✅ `updateProfileWithAuth()` - Update profile with linked data

### Phase 3: UI Components (✅ Completed)

#### 3.1 Profile Settings Modal
**Yeni Dosya:** `components/settings/ProfileSettings.tsx`
**Özellikler:**
- Display name değiştirme
- Username değiştirme
- Avatar yükleme
- Linked providers görüntüleme/bağlama
- Password değiştirme (email auth için)

#### 3.2 UserAvatar Integration
**Dosyalar:**
- `components/hud/LeaderboardPanel.tsx` ✅
- `components/GameUI.tsx` - User info area
- `components/screens/GameOverScreen.tsx` - Final stats
- `components/hub/ProfileCard.tsx` (NEW)

#### 3.3 Auth State Indicator
**Yeni Dosya:** `components/ui/AuthStatus.tsx`
**Özellikler:**
- Login status badge
- Provider icon
- Quick menu (profile, logout)

### Phase 4: Security & Anti-Cheat
// turbo

#### 4.1 Session Verification
**Değişiklikler:**
- Game session'ları auth_user_id ile link et
- Verified user bonus/badge sistemi
- Leaderboard: Verified vs Anonymous filter

#### 4.2 RLS Policy Review
**Kontrol edilecek tablolar:**
- sessions: Authenticated user check
- virtual_accounts: Balance manipulation protection
- profile_achievements: Verified unlock

### Phase 5: Migration & Testing

#### 5.1 Legacy User Migration
**Strateji:**
1. Mevcut nickname profillerini koru (primary_auth_provider = 'nickname')
2. OAuth ile giriş yaparken: existing profile? → link : create new
3. Nickname kullanıcı OAuth ile bağlanırsa → upgrade

#### 5.2 E2E Tests
**Test Senaryoları:**
- [ ] Email signup → game → leaderboard
- [ ] Google OAuth → profile display
- [ ] Twitter OAuth → avatar display
- [ ] Nickname → OAuth upgrade
- [ ] Password reset flow
- [ ] Session persistence

---

## 🔧 Execution Commands

### Step 1: Update ProfileService
```powershell
# Dosyayı görüntüle ve güncelle
```

### Step 2: Update UserContext
```powershell
# AuthProvider context ile entegre et
```

### Step 3: Create Profile Settings
```powershell
# Yeni component oluştur
```

### Step 4: Run Tests
// turbo
```powershell
npm run test -- --coverage
```

### Step 5: Build & Verify
// turbo
```powershell
npm run build
```

---

## 📋 Files to Modify

### Priority 1 (Core)
1. `services/auth/ProfileService.ts` - auth_user_id integration
2. `contexts/UserContext.tsx` - Modern auth state
3. `components/auth/LoginScreen.tsx` - Profile creation flow

### Priority 2 (UI)
4. `components/settings/ProfileSettings.tsx` (NEW)
5. `components/ui/AuthStatus.tsx` (NEW)
6. `components/hub/ProfileCard.tsx` (NEW)
7. `components/GameUI.tsx` - Auth status display

### Priority 3 (Integration)
8. `components/screens/GameOverScreen.tsx` - Verified badge
9. `components/hud/LeaderboardPanel.tsx` ✅ - Avatar done
10. `services/auth/UserSessionService.ts` - Simplify

### Priority 4 (Cleanup)
11. `services/auth/TwitterAuthService.ts` - Deprecate
12. `hooks/useAppInitialization.ts` - Auth check fix

---

## 🗃️ Database Migrations Applied

| Migration | Status |
|-----------|--------|
| `fix_auth_schema_sync` | ✅ Applied |
| `fix_auth_triggers_and_policies` | ✅ Applied |
| `fix_auth_rls_policies` | ✅ Applied |
| `fix_auth_helper_functions` | ✅ Applied |
| `clean_user_data_for_production` | ✅ Applied |
| `add_oauth_avatar_support` | ✅ Applied |
| `recreate_leaderboard_view` | ✅ Applied |

---

## 🚀 Deployment Checklist

- [ ] All migrations applied
- [ ] Supabase OAuth providers configured (Dashboard > Auth > Providers)
- [ ] Redirect URLs set for OAuth (cryptosurvivors.app/auth/callback)
- [ ] Email templates customized (verification, reset)
- [ ] Tests passing
- [ ] Build successful
- [ ] E2E tests passing

---

*Last Updated: 2026-02-04T23:20:00+03:00*
