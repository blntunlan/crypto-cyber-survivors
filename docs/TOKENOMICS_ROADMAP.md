# 🪙 Crypto Cyber Survivors - Tokenomics & Web3 Roadmap

> $SURV Token - Solana Blockchain Entegrasyonu
> Oluşturulma: 2025-12-20

---

## 📋 İçindekiler

1. [Vizyon](#-vizyon)
2. [Token Bilgileri](#-token-bilgileri)
3. [Tokenomics (Dağılım)](#-tokenomics-dağılım)
4. [Kullanım Alanları (Utility)](#-kullanım-alanları-utility)
5. [Teknik Mimari](#-teknik-mimari)
6. [Uygulama Fazları](#-uygulama-fazları)
7. [Güvenlik](#-güvenlik)
8. [Riskler ve Mitigasyon](#-riskler-ve-mitigasyon)

---

## 🎯 Vizyon

**"Play-to-Earn meets Real Market Data"**

Crypto Cyber Survivors, gerçek zamanlı Bitcoin piyasa verilerini oyun mekaniğine entegre eden ilk survival oyunudur. $SURV token'ı bu ekosistemi güçlendirerek:

- Oyuncuları **gerçek kripto ödülleriyle** motive eder
- **Sezon bazlı turnuvalar** için ödül havuzları oluşturur
- **Achievement NFT'leri** ile oyuncu başarılarını kalıcı hale getirir
- **Governance** ile topluluk yönetimini sağlar

---

## 💎 Token Bilgileri

| Özellik | Değer |
|---------|-------|
| **Token Adı** | Survivor Token |
| **Sembol** | $SURV |
| **Blockchain** | Solana |
| **Token Standardı** | SPL Token |
| **Decimals** | 9 |
| **Toplam Arz** | 1,000,000,000 (1 Milyar) |
| **Başlangıç Fiyatı** | TBD (Launch sonrası) |

---

## 📊 Tokenomics (Dağılım)

```
┌─────────────────────────────────────────────────────────────┐
│                    TOPLAM ARZ: 1 MİLYAR                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░  40% Play-to-Earn │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  25% Ekip & Dev   │
│  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  15% Topluluk     │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10% Likidite     │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% Marketing    │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% Rezerv      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detaylı Dağılım

| Kategori | Miktar | Yüzde | Vesting/Kilit |
|----------|--------|-------|---------------|
| **Play-to-Earn Havuzu** | 400,000,000 | 40% | 5 yıl boyunca kademeli serbest bırakma |
| **Ekip & Geliştirme** | 250,000,000 | 25% | 6 ay cliff + 24 ay lineer vesting |
| **Topluluk & Airdrop** | 150,000,000 | 15% | Launch'ta %5, geri kalanı 12 ay |
| **Likidite (DEX)** | 100,000,000 | 10% | Launch'ta kilitsiz (Raydium/Orca) |
| **Marketing & Partnerships** | 50,000,000 | 5% | İhtiyaca göre serbest bırakma |
| **Stratejik Rezerv** | 50,000,000 | 5% | DAO onayı ile kullanım |

---

## 🎮 Kullanım Alanları (Utility)

### 1. Play-to-Earn Ödülleri 🏆

| Aktivite | Ödül | Sıklık |
|----------|------|--------|
| Günlük Giriş | 10 $SURV | Günlük |
| İlk 10 Dakika Hayatta Kalma | 50 $SURV | Oyun başına |
| Sezon Sonu Top 100 | 1,000 - 50,000 $SURV | Sezon (2 hafta) |
| Combo x50 Başarımı | 25 $SURV | İlk kez |
| Boss Öldürme (Gelecek) | 100 $SURV | Oyun başına |

```typescript
// Örnek Ödül Hesaplama
const calculateRewards = (stats: GameStats): number => {
    let rewards = 0;
    
    // Hayatta kalma bonusu
    if (stats.survivalTime >= 600) rewards += 50; // 10+ dakika
    
    // Combo bonusu
    if (stats.maxCombo >= 50) rewards += 25;
    
    // Kill bonusu (her 100 kill için 10 token)
    rewards += Math.floor(stats.kills / 100) * 10;
    
    // Sezon sıralaması bonusu
    if (stats.seasonRank <= 10) rewards += 50000;
    else if (stats.seasonRank <= 100) rewards += 5000;
    
    return rewards;
};
```

### 2. Oyun İçi Satın Almalar 🛒

| Öğe | Fiyat | Açıklama |
|-----|-------|----------|
| Kozmetik Skin | 500 $SURV | Oyuncu görünümü |
| Premium Kart Paketi | 1,000 $SURV | Nadir kartlara erişim |
| Sezon Pass | 2,500 $SURV | Ekstra ödüller + özel içerik |
| İsim Değiştirme | 100 $SURV | Leaderboard ismi |

### 3. NFT Koleksiyonu 🖼️

| NFT Türü | Mint Maliyeti | Özellik |
|----------|---------------|---------|
| **Achievement Badge** | Ücretsiz (Claim) | Başarım kanıtı |
| **Season Champion** | Sadece Top 3 | Özel görsel + %5 ödül bonusu |
| **Founder's Edition** | 10,000 $SURV | Erken destekçi rozeti |
| **Legendary Survivor** | Sadece 100 adet | En yüksek tier + governance ağırlığı |

### 4. Governance (DAO) 🗳️

Token sahipleri şu konularda oy kullanabilir:

- Yeni kart/düşman önerileri
- Sezon ödül havuzu dağılımı
- Token burn etkinlikleri
- Partnership onayları

```
1 $SURV = 1 Oy
Minimum Teklif Eşiği: 10,000 $SURV
Quorum: Toplam arzın %5'i
```

### 5. Staking & Yield 📈

| Pool | APY | Kilit Süresi |
|------|-----|--------------|
| Flexible | 5% | Yok |
| 30 Gün | 12% | 30 gün |
| 90 Gün | 25% | 90 gün |
| LP Staking (SURV/SOL) | 40% | Değişken |

---

## 🏗️ Teknik Mimari

### Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                         KULLANICI                               │
│                    (Phantom/Solflare)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌─────────────────┐
│  OYUN CLIENT    │ │   WEB3    │ │    BACKEND      │
│  (React/Canvas) │ │  GATEWAY  │ │   (Supabase)    │
│                 │ │           │ │                 │
│ • Game Logic    │ │ • Wallet  │ │ • Leaderboard   │
│ • UI/UX         │ │ • Balance │ │ • Anti-Cheat    │
│ • Local Score   │ │ • Claim   │ │ • Reward Queue  │
└────────┬────────┘ └─────┬─────┘ └────────┬────────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SOLANA BLOCKCHAIN                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  SPL Token   │  │   Metaplex   │  │   Custom     │          │
│  │   ($SURV)    │  │  (NFT Mint)  │  │   Program    │          │
│  │              │  │              │  │  (Staking)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dosya Yapısı (Oyun İçi)

```
crypto-cyber-survivors/
├── services/
│   └── web3/
│       ├── walletService.ts      # Phantom bağlantısı
│       ├── tokenService.ts       # $SURV bakiye, transfer
│       ├── nftService.ts         # Achievement NFT claim
│       └── stakingService.ts     # Staking kontrat etkileşimi
├── components/
│   └── web3/
│       ├── WalletButton.tsx      # Connect/Disconnect
│       ├── TokenBalance.tsx      # Bakiye gösterimi
│       └── ClaimRewards.tsx      # Ödül talep butonu
└── hooks/
    ├── useWallet.ts              # Wallet state hook
    └── useTokenBalance.ts        # Real-time bakiye hook
```

### Ayrı Token Projesi

```
crypto-cyber-token/               # Ayrı Repository
├── programs/
│   ├── staking/                  # Anchor staking programı
│   └── rewards/                  # Ödül dağıtım programı
├── scripts/
│   ├── create-token.ts           # Token oluşturma (bir kez)
│   ├── create-metadata.ts        # Metaplex metadata
│   └── initial-distribution.ts   # İlk dağıtım
├── tests/
│   └── staking.test.ts
└── README.md
```

---

## 📅 Uygulama Fazları

### Faz 0: Hazırlık (1-2 Hafta) ⬜

| Görev | Süre | Öncelik |
|-------|------|---------|
| Token tasarım kararları finalize | 2 gün | ⭐⭐⭐⭐⭐ |
| Solana CLI & Anchor kurulumu | 1 gün | ⭐⭐⭐⭐⭐ |
| Test wallet oluşturma (Devnet) | 1 saat | ⭐⭐⭐⭐⭐ |
| Metaplex hesabı ve metadata hazırlığı | 1 gün | ⭐⭐⭐⭐ |
| Logo ve branding asset'leri | 2 gün | ⭐⭐⭐ |

### Faz 1: Token Oluşturma (1 Hafta) ⬜

| Görev | Süre | Bağımlılık |
|-------|------|------------|
| SPL Token oluşturma (Devnet) | 1 saat | Faz 0 |
| Metaplex metadata ekleme | 2 saat | Token oluşturma |
| Token Authority multi-sig setup | 1 gün | - |
| Test mint & transfer | 1 gün | - |
| Mainnet token deploy | 1 saat | Tüm testler OK |

```bash
# Örnek Token Oluşturma Akışı
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/surv-authority.json
spl-token create-token --decimals 9 --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
# Output: Token Mint Address: SURVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Faz 2: Oyun Entegrasyonu (2 Hafta) ⬜

| Görev | Süre | Dosya |
|-------|------|-------|
| Wallet Adapter kurulumu | 2 saat | - |
| walletService.ts | 4 saat | services/web3/ |
| tokenService.ts | 4 saat | services/web3/ |
| WalletButton component | 4 saat | components/web3/ |
| TokenBalance component | 2 saat | components/web3/ |
| MainMenu wallet entegrasyonu | 4 saat | components/screens/ |
| GameOver ekranına ödül gösterimi | 4 saat | components/screens/ |

```typescript
// Örnek: Wallet Adapter Kurulumu
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';

const network = WalletAdapterNetwork.Devnet;
const wallets = [new PhantomWalletAdapter()];
```

### Faz 3: Backend Ödül Sistemi (2 Hafta) ⬜

| Görev | Süre | Teknoloji |
|-------|------|-----------|
| Supabase reward_claims tablosu | 2 saat | PostgreSQL |
| Game session signature & validation | 1 gün | Edge Function |
| Reward calculation service | 1 gün | TypeScript |
| Server-side token transfer (keypair) | 1 gün | @solana/web3.js |
| Anti-cheat: Replay hash validation | 2 gün | - |
| Rate limiting & abuse prevention | 1 gün | - |

```sql
-- Supabase Schema
CREATE TABLE reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    session_id UUID REFERENCES game_sessions(id),
    amount BIGINT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    tx_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_claims_wallet ON reward_claims(wallet_address);
CREATE INDEX idx_claims_status ON reward_claims(status);
```

### Faz 4: NFT Achievement Sistemi (1 Hafta) ⬜

| Görev | Süre | Teknoloji |
|-------|------|-----------|
| Metaplex Candy Machine setup | 1 gün | Metaplex |
| Achievement metadata JSON'ları | 1 gün | IPFS |
| nftService.ts (mint & claim) | 1 gün | @metaplex-foundation |
| Achievement unlock trigger | 4 saat | EventBus |
| UI: NFT koleksiyonu görüntüleme | 1 gün | React |

### Faz 5: Staking & Governance (2 Hafta) ⬜

| Görev | Süre | Teknoloji |
|-------|------|-----------|
| Anchor staking program | 1 hafta | Rust/Anchor |
| stakingService.ts | 2 gün | @coral-xyz/anchor |
| Staking UI | 2 gün | React |
| Governance proposal UI | 2 gün | React |
| DAO voting mechanism | 3 gün | Realms veya Custom |

### Faz 6: Mainnet Launch (1 Hafta) ⬜

| Görev | Süre | Kritiklik |
|-------|------|-----------|
| Security audit (kontratlar) | Değişken | 🔴 Kritik |
| Mainnet token deploy | 1 saat | 🔴 Kritik |
| Liquidity pool oluşturma (Raydium) | 4 saat | 🔴 Kritik |
| CoinGecko/CoinMarketCap listing | 1 hafta | 🟡 Orta |
| Launch announcement | 1 gün | 🟡 Orta |

---

## 🔐 Güvenlik

### Token Authority

```
┌─────────────────────────────────────────┐
│           MULTI-SIG WALLET              │
│         (3/5 İmza Gerekli)              │
├─────────────────────────────────────────┤
│  • Kurucu 1                             │
│  • Kurucu 2                             │
│  • Teknik Lead                          │
│  • Topluluk Temsilcisi                  │
│  • Harici Danışman                      │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         TOKEN MINT AUTHORITY            │
│  • Yeni token basma                     │
│  • Authority değiştirme                 │
│  • Freeze (acil durum)                  │
└─────────────────────────────────────────┘
```

### Anti-Cheat Mekanizmaları

| Mekanizma | Açıklama |
|-----------|----------|
| **Replay Hash** | Her oyun oturumu için benzersiz hash, tekrar gönderimleri engeller |
| **Server-Side Validation** | Skor mantığı backend'de yeniden hesaplanır |
| **Rate Limiting** | Wallet başına günlük maksimum claim sayısı |
| **Signature Verification** | Oyun client imzası backend'de doğrulanır |
| **Anomaly Detection** | İmkansız skorlar için otomatik flag |

```typescript
// Örnek: Anti-Cheat Validation
const validateGameSession = async (session: GameSession): Promise<boolean> => {
    // 1. Replay hash kontrolü
    const existingSession = await db.sessions.findByHash(session.replayHash);
    if (existingSession) return false;
    
    // 2. Süre mantığı kontrolü
    if (session.survivalTime > session.duration * 1.1) return false;
    
    // 3. Kill/dakika oranı kontrolü
    const killsPerMinute = session.kills / (session.survivalTime / 60);
    if (killsPerMinute > MAX_POSSIBLE_KPM) return false;
    
    // 4. İmza doğrulama
    const isValidSignature = await verifySignature(session.signature, session.walletAddress);
    if (!isValidSignature) return false;
    
    return true;
};
```

---

## ⚠️ Riskler ve Mitigasyon

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| **Bot/Cheat Saldırısı** | Yüksek | Yüksek | Multi-layer anti-cheat, CAPTCHA, davranış analizi |
| **Token Fiyat Çöküşü** | Orta | Yüksek | Kademeli vesting, buy-back mekanizması, utility odaklı tasarım |
| **Smart Contract Bug** | Düşük | Kritik | Profesyonel audit, bug bounty programı |
| **Solana Network Congestion** | Orta | Orta | Transaction retry logic, priority fee |
| **Regulatory Uncertainty** | Orta | Yüksek | Hukuki danışmanlık, gerekirse geo-blocking |

---

## 📚 Kaynaklar

### Teknik Dökümanlar
- [Solana SPL Token Docs](https://spl.solana.com/token)
- [Metaplex Docs](https://docs.metaplex.com/)
- [Anchor Book](https://book.anchor-lang.com/)
- [@solana/wallet-adapter](https://github.com/solana-labs/wallet-adapter)

### İlgili Proje Dökümanları
- [MASTER_ROADMAP.md](./MASTER_ROADMAP.md)
- [LEADERBOARD_ARCHITECTURE.md](./LEADERBOARD_ARCHITECTURE.md)

---

## ✅ Sonraki Adımlar

```
[ ] Faz 0: Hazırlık
    [ ] Token ismi ve sembolü kesinleştir ($SURV?)
    [ ] Tokenomics oranlarını finalize et
    [ ] Logo tasarımı
    [ ] Solana Devnet wallet oluştur

[ ] Faz 1: Token Oluşturma (Devnet)
    [ ] SPL Token mint
    [ ] Metaplex metadata
    [ ] Test transferleri
```

---

> 💡 **Not:** Bu döküman yaşayan bir belgedir. Topluluk geri bildirimleri ve piyasa koşullarına göre güncellenecektir.
