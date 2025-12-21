---
description: Project stabilization, testing, lint fixing, and git push workflow.
---

// turbo-all
# 🚀 Stabilize & Push Workflow

Bu workflow projenin mevcut durumunu analiz eder, testleri çalıştırır, lint hatalarını temizler ve değişiklikleri güvenli bir şekilde GitHub'a pushlar.

## 1. Proje Durum Analizi
Projenin mevcut git durumunu ve aktif branch'i kontrol et.
```powershell
git status
git branch
```

## 2. Lint Hatalarını Temizle
Kod kalitesini sağlamak için lint hatalarını otomatik düzelt ve kalanları raporla.
```powershell
npm run lint -- --fix
```

## 3. Testleri Çalıştır
Tüm unit ve entegrasyon testlerinin geçtiğinden emin ol.
```powershell
npm test
```

## 4. Değişiklikleri Kaydet (Commit)
Eğer her şey yolundaysa değişiklikleri anlamlı bir mesajla commitle.
```powershell
git add .
git commit -m "chore: stabilize project, fix lints and verify tests"
```

## 5. GitHub'a Pushla
Değişiklikleri uzak sunucuya gönder.
```powershell
git push origin $(git branch --show-current)
```

## 6. Başarı Kontrolü
GitHub üzerindeki durumu doğrula.
```powershell
git log -1
```
