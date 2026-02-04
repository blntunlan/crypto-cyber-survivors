# 📧 Crypto Survivors Email Templates

Profesyonel görünümlü email template'leri Supabase Auth için hazırlandı.

## 🎨 Template Dosyaları

| Template | Dosya | Kullanım |
|----------|-------|----------|
| Magic Link / OTP | `magic_link.html` | Şifresiz giriş & 6 haneli kod |
| Email Doğrulama | `confirmation.html` | Yeni kayıt doğrulama |
| Şifre Sıfırlama | `recovery.html` | Şifre yenileme |
| Davet | `invite.html` | Kullanıcı davet etme |
| Email Değişikliği | `email_change.html` | Email güncelleme |

## 🚀 Supabase Dashboard'a Yükleme

### Adım 1: Dashboard'a Git
https://supabase.com/dashboard/project/YOUR_PROJECT/auth/templates

### Adım 2: Her Template İçin
1. İlgili `.html` dosyasını aç
2. İçeriği kopyala
3. Dashboard'da ilgili template'i seç
4. "Source" moduna geç
5. İçeriği yapıştır
6. "Save" tıkla

### Adım 3: Subject (Konu) Ayarları
- **Magic Link:** `🎮 Crypto Survivors - Giriş Kodunuz`
- **Confirmation:** `🎉 Crypto Survivors'a Hoş Geldiniz!`
- **Recovery:** `🔑 Crypto Survivors - Şifre Sıfırlama`
- **Invite:** `🚀 Crypto Survivors'a Davetlisiniz!`
- **Email Change:** `📧 Crypto Survivors - Email Değişikliği`

## 📝 Template Değişkenleri

Supabase tarafından otomatik doldurulur:

| Değişken | Açıklama |
|----------|----------|
| `{{ .Token }}` | 6 haneli OTP kodu |
| `{{ .ConfirmationURL }}` | Doğrulama linki |
| `{{ .SiteURL }}` | Site URL'i |
| `{{ .Email }}` | Kullanıcı email'i |
| `{{ .NewEmail }}` | Yeni email (değişiklik için) |

## 🎯 Özellikler

- ✅ **Responsive Design** - Mobil ve desktop uyumlu
- ✅ **Dark Theme** - Oyun temasıyla uyumlu
- ✅ **Bitcoin Branding** - ₿ logosu ve turuncu renk paleti
- ✅ **Email Client Uyumu** - Outlook, Gmail, Apple Mail destekli
- ✅ **OTP + Magic Link** - Tek template'de iki seçenek

## 🔧 Yerel Geliştirme

```bash
# Supabase CLI ile yerel test
supabase stop && supabase start
```

Template'ler `config.toml` dosyasındaki referanslar üzerinden yüklenir.

## 📸 Önizleme

Magic Link template görünümü:

```
┌─────────────────────────────────────┐
│           ┌──────────┐              │
│           │    ₿     │              │
│           └──────────┘              │
│        Crypto Survivors             │
│     Survive The Volatility          │
│  ─────────────────────────────────  │
│                                     │
│        🔐 Giriş Kodunuz             │
│                                     │
│     ┌─────────────────────┐         │
│     │      123456         │         │
│     └─────────────────────┘         │
│                                     │
│            ── veya ──               │
│                                     │
│    [ ✨ Tek Tıkla Giriş Yap ]      │
│                                     │
│  ⚠️ Güvenlik Uyarısı...            │
│                                     │
│  🎮 Kill bears. Dodge bulls.        │
│     © 2026 Crypto Survivors         │
└─────────────────────────────────────┘
```
