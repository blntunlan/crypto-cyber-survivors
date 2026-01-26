---
description: Supabase Auth & Phantom Wallet Entegrasyon Workflow'u
---

# 🔐 Auth & Web3 Entegrasyon Workflow'u

Bu workflow, oyuna Email/Şifre, Magic Link, Sosyal Girişler ve Phantom Wallet (Solana) desteği eklemek için takip edilecek adımları tanımlar.

## Faz 1: Keşif ve Ön Hazırlık (Explore)

1. **Mevcut Yapıyı Analiz Et**
   - `services/auth/UserSessionService.ts` dosyasındaki "nickname" mantığını incele.
   - `supabase/migrations` içindeki `players` tablosunu ve RLS kurallarını kontrol et.

2. **Bağımlılıkları Yükle**
   // turbo
   - `npm install @solana/web3.js @solana/wallet-adapter-phantom bs58`

## Faz 2: Mimari ve Planlama (Plan)

3. **Veritabanı Migration Hazırla**
   - `players` tablosuna `user_id` (uuid, auth.users ref) ve `wallet_address` (text, unique) kolonları ekle.
   - `verification_nonce` tablosu oluştur (Cüzdan imzası doğrulamak için).

4. **Auth Akışını Belirle**
   - **Web2:** Email -> Magic Link / Password -> Supabase JWT.
   - **Web3:** Connect Wallet -> Get Nonce -> Sign Message -> Verify on Edge Function -> Supabase JWT.

## Faz 3: Temel Katman (Core Layer)

5. **Type Tanımlarını Oluştur**
   - `types/auth.ts` dosyasında `UserRole`, `AuthStatus` ve `WalletProfile` interfacelerini tanımla.

6. **Solana Wallet Service Yaz**
   - `services/auth/SolanaWalletService.ts` oluştur.
   - `connect()`, `disconnect()` ve `signMessage()` metodlarını implement et.

## Faz 4: Backend ve Güvenlik (Backend & Security)

7. **Supabase Edge Function (verify-wallet)**
   - `supabase/functions/verify-wallet/` klasörünü oluştur.
   - EdDSA (Solana) imza doğrulama mantığını (`tweetnacl` veya `web3.js`) ekle.
   - Başarılı doğrulamada kullanıcıyı `players` tablosuyla eşleştir ve Supabase JWT dön.

8. **RLS Politikalarını Sertleştir**
   - Tüm tablolarda `auth.uid()` bazlı politikaları SQL migration olarak yaz.

## Faz 5: Arayüz Geliştirme (UI/UX)

9. **Auth Ekranı (AuthScreen)**
   - `components/screens/AuthScreen.tsx` oluştur.
   - Email/Magic Link formu ve Sosyal/Phantom butonlarını ekle.

10. **Zustand Store Güncelle**
    - `useGameStore` içinde `auth` state'ini yönet (user, status, session).

## Faz 6: Doğrulama ve Test (Verify)

11. **Unit Testler**
    // turbo
    - `npm run test tests/auth/SolanaWalletService.test.ts`

12. **E2E Testleri**
    - Playwright ile giriş akışlarını doğrula. Phantom mocklama için ilgili araçları hazırla.

## Faz 7: Yayına Alma (Finalize)

13. **Dashboard Ayarları**
    - Supabase Dashboard üzerinde OAuth (Google, Discord, X) sağlayıcılarını aktif et.

14. **Dokümantasyon Güncelle**
    - `docs/AUTH_ENYEGASYONU.md` dosyasını oluştur.
    - `GEMINI.md` kurallarını yeni auth akışına göre güncelle.

15. **Commit ve Push**
    - `feat: implement multi-provider auth and phantom wallet support`
