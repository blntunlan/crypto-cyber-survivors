---
description: Modern dökümantasyon sitesinin yönetimi, navigasyon güncellenmesi ve içerik standardizasyonu.
---

# 📚 Documentation System Workflow

Bu iş akışı, projenin teknik dökümantasyonunu merkezi bir "Doc-Site" mantığıyla yönetmek için kullanılır.

## 🛠️ Hazırlık Aşaması
1. **Kategori Belirleme**: Yeni dökümanın hangi ana kategoriye (`Core`, `Gameplay`, `AI`, `Security`, `API`) gireceğine karar ver.
2. **Standardizasyon**: `.agent/skills/documentation-system/templates/MASTER_DOC.md` şablonunu temel al.

## ✍️ İçerik Üretim Süreci
3. **Dosya Oluşturma**: `docs/` klasörü altında ilgili alt klasöre (örn: `docs/services/`) markdown dosyasını ekle.
4. **Zenginleştirme**: 
   - Karmaşık akışlar için mutlaka **Mermaid** diyagramı ekle.
   - Önemli uyarılar için `> [!IMPORTANT]` veya `> [!TIP]` bloklarını kullan.
   - API linkleri için `docs/api/` altındaki otomatik dökümanlara yönlendirme yap.

## 🗺️ Navigasyon Yönetimi (Source of Truth)
5. **Sidebar Güncelleme**: `docs/navigation.json` dosyasını (merkezi navigasyon dosyası) güncelle.
   - Yeni başlığı ve dosya yolunu (path) ilgili kategori altına ekle.
   - *Not: Modern dökümantasyon sitelerinde navigasyon dosyadan okunur.*

## ⚙️ Otomasyon ve Senkronizasyon
6. **API Doc Sync**: `npm run docs` komutunu çalıştırarak koddan üretilen (TypeDoc) dökümanları güncelle.
7. **Broken Link Check**: Tüm iç bağlantıların (`[Link](...)`) geçerli olduğunu doğrula.

## 🚀 Build ve Preview
8. **Doğrulama**: Gerekirse dökümantasyon build komutunu çalıştır ve görsel çıktıyı kontrol et.
9. **Commit**: `docs: add documentation for [Feature Name]` mesajıyla commitle.

---
// turbo
// 💡 İpucu: Yeni bir döküman ekledikten sonra SYSTEM_OVERVIEW.md'yi güncellemeyi unutma.
