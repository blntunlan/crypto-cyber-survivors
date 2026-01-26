# 🧠 Crypto Cyber Survivors - Gameplay Konseptleri ve Beyin Fırtınası

Bu doküman, oyunun kripto temasını derinleştirmek ve oynanışı daha eğlenceli/bağımlılık yapıcı hale getirmek için geliştirilen fikirleri içerir.

## 1. Piyasa Bazlı Dinamik Mekanikler (Real-Time Data Mechanics)
Canlı borsa verilerini (BTC/USD) doğrudan oynanışa bağlayan mekanikler.

| Mekanik | Açıklama | Etki / Risk |
|:---|:---|:---|
| **⚡ Leverage (Kaldıraç) Modu** | Oyuncu geçici süre "x100 Leverage" açar | Hasar/Hız +%500. Tek vuruş = Liquidation (HP -%90 veya ölüm) |
| **📈 Bull vs Bear Stance** | Canlı fiyat trendine göre karakter mod değiştirir | **Boğa:** Saldırı hızı/hasar ↑, defans ↓. **Ayı:** Defans ↑, hız ↓, AoE odaklı |
| **📊 Volatilite Fırtınaları** | Ani fiyat sıçramalarında (Spike) tetiklenir | Düşmanlar 2x hızlanır, ancak düşen ödüller (XP/Gem) 2x artar |

## 2. Tematik Silah ve Yetenek Fikirleri
Kripto terminolojisini mekaniksel karşılıklarla birleştiren yetenekler.

| Yetenek | Açıklama | Mekaniksel Karşılık |
|:---|:---|:---|
| **⛽ Gas Fee Zone (AoE)** | Karakter etrafında Ethereum logolu yanma alanı | "Burn" etkisi. Düşman yoğunluğu arttıkça hasar artar (Ağ yoğunluğu) |
| **📉 Panic Sell (Ultimate)** | Ekrandaki tüm düşmanları temizleyen patlama | **Bedel:** Mevcut XP'nin %20'sini siler (Zararına satış) |
| **⛏️ Mining Rig (Turret)** | Yere kurulan sabit taret | Ateş ederken saniyede küçük miktarda XP (madencilik) üretir |
| **💸 Airdrop (Loot Box)** | Haritaya rastgele düşen kutular | %70 Buff, %30 "Scam" (Patlayarak hasar verir) |

## 3. Düşman ve Boss Konseptleri

| Düşman / Boss | Davranış | Özel Etki |
|:---|:---|:---|
| **🐋 The Whale (Balina)** | Yavaş ve devasa can barı | Öldüğünde "Market Crash" yaratarak ekrandakileri sersemletir |
| **👺 Rug Puller** | Haritada sahte ödüller bırakır | Oyuncu dokunduğunda pusu kuran canavara dönüşür |
| **🤖 KYC Bot** | Oyuncuya çarptığında hasar vermez | 2 saniyeliğine oyuncuyu dondurur (Kimlik doğrulaması bekletmesi) |

## 4. Meta-Progression (Kalıcı Gelişim)

| Sistem | Açıklama | Kazanım |
|:---|:---|:---|
| **🏦 Staking Sistemi** | Kazanılan puanları oyun kapalıyken Stake etme | Gelecek oturumda pasif bonus kazanımı |
| **📜 Paper vs Diamond Hands** | Oyuncunun hayatta kalma tarzına göre verilen bonus | **Diamond:** Hasar almadan dayanma → Zırh bonusu. **Paper:** Çok manevra yapma → Hız bonusu |

## 🛠️ Uygulama Önceliği (Öneri)

| Öncelik | Özellik | Geliştirme Notu |
|:---|:---|:---|
| **1** | **Gas Fee Zone** | `CombatSystem.ts` AoE mantığı ile hızlı eklenebilir |
| **2** | **Bull/Bear Stance** | `MarketService` verisiyle stat çarpanları ayarlanacak |
| **3** | **Airdrop** | Rastgele spawn ve ödül/ceza mekaniği |

---
*Bu fikirler geliştirme sürecinde `TODO_COMPREHENSIVE.md` dosyasına aktarılmak üzere bir havuz oluşturur.*

