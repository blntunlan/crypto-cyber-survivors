# 🗄️ UI & Menü Sistemleri Yol Haritası

Bu doküman oyunun kullanıcı arayüzü (UI) ve menü sistemlerinin geliştirilmesi için planlanan adımları içerir. Hedefimiz oyuncuya tam kontrol ve zengin bir bilgi ekranı sunmaktır.

---

## Faz 1: Gelişmiş Duraklatma (Pause) Menüsü ⏸️
*Oyuncunun oyun ortasında kontrolünü artırmak.*
- [x] **Temel Butonlar:**
    - [x] Resume (Devam Et)
    - [x] Restart (Yeniden Başlat) - Mevcut run'ı sıfırlar.
    - [x] Quit to Menu (Ana Menüye Dön) - Mevcut run'ı sonlandırır.
- [ ] **Hızlı Ayarlar:**
    - [x] Audio On/Off toggle.
    - [ ] BGM On/Off toggle (Müzik eklendiğinde).
- [x] **Run İstatistikleri:**
    - [x] O anki toplam hasar, kill sayısı ve aktif buff'ların listesi. (Kills, Combo, XP eklendi)

## Faz 2: Genişletilmiş Ana Menü (Home) 🏠
*İlk izlenim ve meta-progression girişi.*
- [ ] **Karakter/Silah Seçimi:**
    - [ ] Farklı kripto karakterleri (BTC, ETH, SOL) seçme alanı.
- [ ] **Ayarlar (Settings) Paneli:**
    - [ ] Ekran çözünürlüğü/Kalite ayarları.
    - [ ] Ses düzey çubukları (Slider).
    - [ ] Keybinding (Tuş atama) önizlemesi.
- [ ] **Profil Özeti:**
    - [ ] Toplam kazanılan altın/XP.
    - [ ] En yüksek skor (High Score).

## Faz 3: Level Up & Upgrade Polish 💎
*Karar verme anlarını daha değerli kılmak.*
- [ ] **Reroll & Skip:**
    - [ ] Mevcut seçenekleri yenileme (Reroll) butonu.
    - [ ] Hiçbirini almadan XP/Altın alarak geçme (Skip).
- [ ] **Detaylı Bilgi:**
    - [ ] Kartların üzerine gelince (Hover) detaylı stat değişimlerini görme (+5 Damage, -0.2 Attack Speed gibi).
    - [ ] Synergy uyarısı (Eğer başka bir kartla birleşecekse parlama efekti).

## Faz 4: Oyun Sonu (Game Over / Victory) 🏆
*Maç sonrası tatmin duygusunu artırmak.*
- [ ] **Detaylı Rapor:**
    - [ ] "En çok hasar veren silah" grafiği.
    - [ ] Run süresi, Max Combo, Milestone başarımları.
- [ ] **Meta-Progress Bildirimleri:**
    - [ ] "Yeni bir karakter açıldı!" veya "Level 5 Kalıcı Armor açıldı!" bildirimleri.
- [ ] **Sosyal Paylaşım:**
    - [ ] "Score Card" oluşturma ve paylaşma butonu.

---

## Uygulama Planı (Kısa Vade)

1. **Pause Menüsü:** Hemen `App.tsx` içine Restart ve Quit butonları eklenecek.
2. **Settings:** Temel ses açma/kapama özelliği eklenecek.
3. **Stat Ekranı:** Pause menüsüne küçük bir stat paneli eklenecek.

**Son Güncelleme:** 2025-12-18
