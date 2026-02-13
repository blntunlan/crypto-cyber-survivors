# Specification: Auth System Upgrade & Supabase Integration

## Overview
Bu track, oyunun giriş sistemini en güncel güvenlik ve kullanıcı deneyimi standartlarına (özellikle iOS PWA kısıtlamalarını aşacak şekilde) taşımayı amaçlar. Supabase Auth kullanılarak Email/Şifre, OTP (6 haneli kod), Sosyal Giriş (OAuth) ve Passkeys (WebAuthn) sistemleri entegre edilecektir.

## Track Type
- Feature (Geliştirme)

## Functional Requirements
1.  **Multi-Method Auth:**
    -   Email & Password (Geleneksel).
    -   OTP via Email: iOS PWA'larda Safari'ye yönlendirme sorununu aşmak için 6 haneli doğrulama kodu.
    -   Social OAuth: Google ve Discord entegrasyonu.
    -   Passkeys (WebAuthn): Biyometrik (FaceID/TouchID) giriş desteği.
2.  **Auth Flow Logic:**
    -   Kullanıcı Landing Page'den "Enter Game" butonuna bastığında Auth ekranına yönlendirilir.
    -   Giriş başarılı olduktan sonra kullanıcının veritabanında bir `nickname` değeri olup olmadığı kontrol edilir.
    -   Eğer `nickname` yoksa, kullanıcı Hub'a girmeden önce bir nickname belirleme ekranına alınır.
3.  **Session Management:**
    -   "Aggressive Persistence": Kullanıcı oturumları, tarayıcı/PWA kapatılsa dahi uzun süre kalıcı olacak şekilde yapılandırılacaktır (Supabase local storage persistence).
4.  **Database Integration:**
    -   Supabase `profiles` tablosu ile `auth.users` tablosu senkronize çalışacaktır.
    -   Nickname eşsiz (unique) olmalıdır.

## Non-Functional Requirements
- **UI/UX Consistency:** Auth ekranı tasarımı, **Main Menu ve Hub estetiği ile %100 uyumlu** olacaktır. Renk paleti, font tercihleri ve neon-cyber stil rehberi birebir uygulanacaktır.
- **Animations:** Giriş ekranı geçişleri ve form elementleri Framer Motion ile hareketlendirilecek, ancak bu hareketler oyunun genel akıcılığına ve ciddiyetine uygun olacaktır.
- **Mobile Friendly:** Giriş formları ve butonlar iOS/Android dokunmatik hedeflerine (min 44x44px) uygun olmalıdır.

## Acceptance Criteria
- [ ] Kullanıcı OTP kodu ile PWA içerisinden çıkmadan giriş yapabiliyor.
- [ ] Yeni kullanıcılar nickname belirlemeden Hub'a erişemiyor.
- [ ] Auth UI, Hub ve Main Menu ile görsel olarak ayırt edilemez bir bütünlük içinde.
- [ ] Mevcut kullanıcılar giriş yaptıklarında doğrudan Hub'a yönlendiriliyor.
- [ ] Oturumlar cihaz kapatılıp açıldığında (mümkün olan durumlarda) korunuyor.

## Out of Scope
- Şifre sıfırlama maillerinin custom tasarımı (şimdilik standart Supabase şablonu).
- Telefon numarası (SMS) ile giriş.
