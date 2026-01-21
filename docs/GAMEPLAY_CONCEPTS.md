# 🧠 Crypto Cyber Survivors - Gameplay Konseptleri ve Beyin Fırtınası

Bu doküman, oyunun kripto temasını derinleştirmek ve oynanışı daha eğlenceli/bağımlılık yapıcı hale getirmek için geliştirilen fikirleri içerir.

## 1. Piyasa Bazlı Dinamik Mekanikler (Real-Time Data Mechanics)
Canlı borsa verilerini (BTC/USD) doğrudan oynanışa bağlayan mekanikler.

*   **⚡ Leverage (Kaldıraç) Modu:**
    *   **Mekanik:** Oyuncu geçici bir süre için "x100 Leverage" açar.
    *   **Etki:** Hasar ve hız %500 artar.
    *   **Risk:** Tek bir vuruş almak "Liquidation" (anında ölüm) veya HP'nin %90 azalmasıyla sonuçlanır.
*   **📈 Bull vs Bear Stance:**
    *   **Mekanik:** Canlı BTC fiyatı yükselişteyse (Boğa) veya düşüşteyse (Ayı) karakterin mod değiştirmesi.
    *   **Boğa (Pump):** Yüksek saldırı hızı, agresif mermiler, düşük defans.
    *   **Ayı (Dump):** Yüksek defans (Diamond Hands kalkanı), yavaş hareket, alan hasarı odağı.
*   **📊 Volatilite Fırtınaları:**
    *   **Mekanik:** Fiyat hareketlerinde ani sıçrama (Spike) olduğunda tetiklenir.
    *   **Etki:** Tüm düşmanlar 2x hızlanır ancak öldüklerinde düşen XP/Gem miktarı 2x artar.

## 2. Tematik Silah ve Yetenek Fikirleri
Kripto terminolojisini mekaniksel karşılıklarla birleştiren yetenekler.

*   **⛽ Gas Fee Zone (AoE):**
    *   Karakterin etrafında dönen Ethereum logolu bir alan hasarı.
    *   Düşmanlar alana girdiğinde "Burn" (yanma) etkisi alır. Alan ne kadar kalabalıksa (Ağ yoğunluğu) hasar o kadar artar.
*   **📉 Panic Sell (Ultimate):**
    *   Ekrandaki tüm düşmanları temizleyen bir patlama.
    *   **Bedeli:** Mevcut XP'nin %20'sini siler (Zararına satış).
*   **⛏️ Mining Rig (Turret):**
    *   Yere kurulan sabit bir taret. Düşmanlara ateş ederken aynı zamanda saniyede küçük miktarda XP üretir.
*   **💸 Airdrop (Loot Box):**
    *   Haritaya rastgele düşen kutular. 
    *   %70 ihtimalle güçlü bir geçici buff, %30 ihtimalle "Scam" (patlayarak hasar verir).

## 3. Düşman ve Boss Konseptleri

*   **🐋 The Whale (Balina):** 
    *   Çok yavaş ama devasa can barına sahip. Öldüğünde "Market Crash" yaratarak ekrandaki diğer tüm düşmanları sersemletir.
*   **👺 Rug Puller:** 
    *   Haritada sahte ödüller (Büyük Gem veya Health Pack) bırakır. Oyuncu dokunduğunda bir canavara dönüşür.
*   **🤖 KYC Bot:** 
    *   Oyuncuya çarptığında hasar vermez ama 2 saniyeliğine oyuncuyu dondurur (Identity Verification süresi).

## 4. Meta-Progression (Kalıcı Gelişim)

*   **🏦 Staking Sistemi:** 
    *   Oyuncular kazandıkları puanları oyun kapalıyken "Stake" edebilir ve bir sonraki girişte bonus kazanabilir.
*   **📜 Paper Hands vs Diamond Hands:**
    *   **Diamond Hands:** Hiç hasar almadan uzun süre dayanana verilen kalıcı zırh bonusu.
    *   **Paper Hands:** Çok fazla kaçış manevrası yapan oyuncuya verilen kalıcı hız bonusu.

## 🛠️ Uygulama Önceliği (Öneri)

1.  **Gas Fee Zone:** `CombatSystem.ts` içindeki AoE mantığı kullanılarak hızlıca eklenebilir.
2.  **Bull/Bear Stance:** `MarketService` verisiyle karakter statlarını çarpanlara ayırmak.
3.  **Airdrop:** Rastgele spawn mantığı ile ödül/ceza mekaniği.

---
*Bu fikirler geliştirme sürecinde `TODO_COMPREHENSIVE.md` dosyasına aktarılmak üzere bir havuz oluşturur.*
