---
name: documentation-system
description: Proje dökümantasyonunu yönetmek, API dökümanları oluşturmak ve dökümantasyon standartlarını korumak için yetenek.
---

# Documentation System Skill

Bu yetenek, projenin teknik dökümantasyonunun güncel, tutarlı ve profesyonel kalmasını sağlar.

## Kullanım Senaryoları

1.  **API Dökümantasyonu Oluşturma**: `npm run docs` komutunu kullanarak TypeDoc dökümanlarını güncelle.
2.  **Yeni Servis Dökümante Etme**: Her yeni singleton servis için `SERVICE_DOC.md` şablonunu kullan.
3.  **Yeni Özellik (Feature) Dökümantasyonu**: Karmaşık oyun mekanikleri için `FEATURE_DOC.md` şablonunu kullan.
4.  **Mimari Diyagramlar**: `ARCHITECTURE_DIAGRAM.md` içindeki Mermaid.js şablonlarını kullanarak görselleştirmeler yap.

## Dökümantasyon Standartları

-   **Dil**: Teknik dökümanlar için Türkçe veya İngilizce (mevcut dökümana uygun) kullan.
-   **Yapı**: `docs/` klasörü altında mantıklı bir hiyerarşi kur. API dökümanları her zaman `docs/api/` altında olmalı.
-   **Görselleştirme**: Mümkünse akışları ve bağımlılıkları Mermaid diyagramları ile açıkla.
-   **Güncellik**: Kod değişiklikleri yapıldığında ilgili dökümanları (özellikle `GEMINI.md`) hemen güncelle.

## Komutlar

```bash
npm run docs          # API dökümanlarını (Markdown) oluştur
npm run docs:watch    # Değişiklikleri izle ve dökümanları güncelle
npm run docs:clean    # Eski API dökümanlarını temizle
```

## Kontrol Listesi

- [ ] `GEMINI.md` yeni eklenen servis/yetenekleri içeriyor mu?
- [ ] `docs/api/` içeriği en son kod haliyle uyumlu mu?
- [ ] Mimari diyagramlar güncel mi?
- [ ] Tüm Markdown dosyalarında linkler doğru çalışıyor mu?
