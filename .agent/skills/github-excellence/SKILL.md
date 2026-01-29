# Skill: GitHub Excellence (githubSistemi)

## Description
Bu yetenek, projenin GitHub üzerindeki profesyonelliğini ve sürdürülebilirliğini yönetir. Readme düzenleme, PR/Issue şablonları oluşturma, CI/CD yapılandırması (GitHub Actions) ve topluluk standartlarını (LICENSE, CONTRIBUTING) belirleme süreçlerini kapsar.

## Usage
Bu yeteneği, projenin açık kaynak standartlarına getirilmesi veya ekip çalışmasına hazır hale getirilmesi istendiğinde kullanın.
Komut: "GitHub standartlarını uygula" veya "GitHub mükemmellik sürecini başlat".

## Expertise & Phases

### 1. Repository Temelleri (Fundamentals)
- `.github` klasör yapısını oluştur.
- `README.md` dosyasını modern, görsel ağırlıklı ve teknik derinliği yansıtan bir yapıya kavuştur.
- `LICENSE` dosyasını (tercihen MIT) ekle.
- `CONTRIBUTING.md` ve `CODE_OF_CONDUCT.md` dökümanlarını hazırla.

### 2. İş Akışı Şablonları (Workflow Templates)
- `.github/ISSUE_TEMPLATE/` altında:
    - `bug_report.md`: Hata bildirimi şablonu.
    - `feature_request.md`: Yeni özellik isteği şablonu.
    - `task.md`: Geliştirme görevi şablonu.
- `.github/PULL_REQUEST_TEMPLATE.md` dosyasını oluştur (Checklist, Impact, Testing bölümleriyle).

### 3. Otomasyon ve Denetim (Automation)
- GitHub Actions iş akışlarını (`.github/workflows/`) tanımla:
    - `ci.yml`: Push/PR sonrası lint ve test kontrolleri.
    - `dependabot.yml`: Bağımlılık güncellemeleri.
- Branch protection kuralları için yol haritası sun.

### 4. Proje Yönetimi (Project Management)
- Standart "Label" (Etiket) setini belirle (fix, enhancement, security, performance).
- Proje Milestone'larını (Beta, v1.0, v2.0) organize et.

## Global GitHub Standartları
- Tüm markdown dosyalarında emoji kullanımıyla görsel hiyerarşi sağla.
- Teknik dökümantasyonda "Badges" (shields.io) kullan (Build status, License, Version).
- SEO için repository "Topics" ve "Description" alanlarını optimize et.

## Uygulama Raporu Şablonu
Süreç sonunda şu özeti sun:
- Oluşturulan Şablonlar: [PR, Bug, Feature]
- Düzenlenen Dosyalar: [README, CONTRIBUTING, etc.]
- Eklenen Otomasyonlar: [CI, Dependabot]
- Sağlanılan Standartlar: [Security, Quality, Community]
