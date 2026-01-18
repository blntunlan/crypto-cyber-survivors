# 🗺️ Arka Plan ve Görsel Ambians Yol Haritası (Roadmap)

Bu belge, "Crypto Cyber Survivors" oyununun market verilerini (RSI, Volume, ATR) daha etkili bir şekilde görsellere yansıtmak ve atmosferi derinleştirmek için güncellenmiştir.

## 🟢 Aşama 1: Görsel Derinlik ve Temel Göstergeler (Kısa Vade)
- [ ] **Mum Çakışma Önleyici (Anti-Overlap)**: Arka plandaki mumların X ekseninde birbirinin üzerine binmesini engelleyen dağılım algoritması.
    - *Teknik Detay*: `BackgroundRenderer` içinde `x` koordinatları için minimum mesafe kontrolü.
- [ ] **Parallax Katmanları**: 3 farklı derinlik katmanı (Uzak, Orta, Yakın) ile gerçekçi hareket hissi.
- [x] **RSI Temelli Renk Tonlaması (Subtle Tint)**: RSI durumuna göre (Oversold/Overbought) ekranın hafifçe renklenmesi. (Geliştirilecek: Favorabiliteye duyarlı hale getirilecek).
- [ ] **Position-Aware Indicator Mapping**: Ekran tintinin sadece RSI'ya göre değil, oyuncunun pozisyonuna (LONG/SHORT) olan *lehine/aleyhine* durumuna göre değişmesi.
    - *Kural*: Pozisyon lehineyse "Safety Aura" (Mavi/Yeşil), aleyhineyse "Danger Aura" (Kırmızı/Turuncu).

## 🟡 Aşama 2: Dinamik Market Etkileşimleri (Orta Vade)
- [ ] **Volatility Pulse (ATR)**: `DifficultyManager`'daki ATR artışına göre arka plan ızgarasının (grid) ve neon hatların nabız gibi atması.
    - *Bağlantı*: `spawnRateMultiplier` 2.0'ı geçtiğinde "Chaos Mode" efektleri.
- [ ] **Whale Warning System**: Sunucudan gelen `whaleTier` 1/2/3 olduğunda ortaya çıkan görsel uyarılar.
    - [ ] **Radar Effect**: Balinanın spawn olacağı yönü gösteren kenar belirteçleri.
    - [ ] **Localized Cooldown Visuals**: Balina spawn sonrası `VolumeAnalyzer` cooldown süresince ekran kenarlarında "Market Cooling" detayı.
- [ ] **Combat-React**: Oyuncu Super Crit vurduğunda arka planda titreşim veya renk dalgalanması.

## 🔴 Aşama 3: Atmosferik ve Taktiksel Detaylar (Uzun Vade)
- [ ] **Vignette & Scanlines**: Ekran kenarlarında kararma ve nostaljik tarama çizgileri ile premium Cyberpunk görünümü.
- [ ] **Volatilite Partikülleri**: Market yönüne göre yükselen veya düşen dolar/bitcoin sembolleri.
- [ ] **Flash Crash / Moon Event**: Çok sert fiyat hareketlerinde (Shockwave) tüm arka planın anlık olarak beyazlaşması veya tersine dönmesi.
- [ ] **Adaptive Noise**: Oyun zorlaştıkça ve volatilite arttıkça arka planın daha "stresli" (jittery) ve hareketli hale gelmesi.

---
*Bu yol haritası, MarketIndicatorService ve SpawnSystem arasındaki entegrasyonu derinleştirerek oyuncuya taktiksel avantaj sağlayan bir ambians sunmayı hedefler.*
