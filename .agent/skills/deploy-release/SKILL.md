---
name: deploy-release
description: Safe deployment workflow for Supabase and Railway.
---

# Deploy Release Skill

Bu skill, projeyi production (veya staging) ortamına güvenli bir şekilde deploy etmek için gereken adımları içerir.

## Usage

```
/deploy-release [env]
```

**Env:** `prod` (default), `staging`.

## Workflow

### 1. Pre-Flight Checks

Deploy öncesi kodun sağlam olduğundan emin ol.

```bash
# Workflow: /quick-commit veya /code-quality-audit çalıştırılabilir
npm run type-check
npm run test
npm run build
```

Eğer build başarısız olursa deploy İPTAL edilmeli.

### 2. Supabase Deployment

Veritabanı ve fonksiyonları güncelle.

```bash
# 1. Migrations
supabase db push

# 2. Edge Functions
# (Tek tek veya hepsi)
supabase functions deploy verify-game
supabase functions deploy submit-score
```

**Dikkat:** `db push` destructive changes içeriyorsa onay iste!

### 3. Railway Deployment

Frontend ve backend servislerini güncelle.

```bash
# Railway CLI yüklü olmalı
railway up
```

VEYA `git push railway main` (eğer git-based deployment kullanılıyorsa).

### 4. Post-Deployment Verification

Canlı sistemi kontrol et.

- [ ] Site açılıyor mu?
- [ ] Login çalışıyor mu? (Supabase Auth)
- [ ] Websocket bağlantısı kuruluyor mu?
- [ ] Versiyon numarası güncel mi?

## Rollback Plan

Eğer deploy patlarsa:
1. Railway üzerinden önceki deployment'a "Revert" yap.
2. Supabase migration'ı geri almak daha zordur; manuel `down` migration gerekebilir.

## Checklist

- [ ] `.env` production değerleri doğru mu?
- [ ] veritabanı yedeği alındı mı (opsiyonel ama önerilir)?
- [ ] `CHANGELOG.md` güncellendi mi?
