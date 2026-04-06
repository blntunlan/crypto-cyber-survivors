# Feature Implementation Plan
> Crypto Cyber Survivors — 6 Yeni Özellik

Tarih: 2026-03-16
Durum: Planlama

---

## İçindekiler

1. [Silah Sistemi](#1-silah-sistemi)
2. [Meta Progression](#2-meta-progression)
3. [Market Event Announcements](#3-market-event-announcements)
4. [Daily / Weekly Challenge](#4-daily--weekly-challenge)
5. [Replay Sistemi](#5-replay-sistemi)
6. [Elite Düşmanlar](#6-elite-düşmanlar)

---

## 1. Silah Sistemi

### Tasarım Felsefesi

Şu an oyuncunun tek saldırı tipi var (bullet). Silah sistemi:
- Oyuncu aynı anda **en fazla 2 silah** taşıyabilir
- Silahlar level-up kartlarından elde edilir ve **1–5 arası seviyelendirilebilir**
- Aynı silahın iki kopyası max seviyeye ulaşınca **evrim** geçirebilir
- Her silah **market verisine** farklı tepki verir (Laser ATR'den, Boomerang RSI'dan güç alır)

### Silah Kataloğu

| Silah | Açıklama | Market Bonusu | Evrim Hedefi |
|---|---|---|---|
| `QuantumBullet` | Tek hızlı mermi (mevcut) | — | `HyperCannon` (3x hasar, az hız) |
| `SpreadShot` | 3'lü yelpaze ateş | Volume yüksekse +1 mermi | `FullAutoSpray` (5'li, deli hız) |
| `Laser` | Sürekli ışın, düşük hasar | ATR % × 200 = hasar çarpanı | `PlasmaCutter` (AOE ışın) |
| `Boomerang` | Geri dönen, gidiş+dönüşte vurur | RSI favorable = 2x hasar | `TwinBumerang` (çift yörünge) |
| `AOENuke` | Yavaş, büyük patlama yarıçapı | PnL < -30% = +50% radius | `NovaBomb` (3x radius, zincir) |
| `OrbitShield` | Oyuncuyu dönen 3 mermi korur | Kârdayken 4. mermi eklenir | `FortressRing` (6 mermi, push) |

### Yeni Dosyalar

```
types/weapons.ts
config/WeaponRegistry.ts
services/combat/WeaponSystem.ts
factories/WeaponFactory.ts
services/combat/projectiles/
  ├── LaserProjectile.ts
  ├── BoomerangProjectile.ts
  └── AOEProjectile.ts
```

#### `types/weapons.ts`

```typescript
export type WeaponId =
  | 'quantum_bullet'
  | 'spread_shot'
  | 'laser'
  | 'boomerang'
  | 'aoe_nuke'
  | 'orbit_shield';

export type WeaponLevel = 1 | 2 | 3 | 4 | 5;

export interface WeaponInstance {
  id: WeaponId;
  level: WeaponLevel;
  cooldownTimer: number; // ms, internal state
}

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  icon: string;
  description: string;
  baseDamage: number;
  baseCooldown: number;     // ms
  projectileSpeed: number;
  projectileRadius: number;
  damagePerLevel: number;   // baseDamage * level * this
  cooldownPerLevel: number; // baseCooldown * (1 - level * this)
  marketBonus: (ctx: WeaponMarketContext) => number; // damage multiplier
  evolutionPair?: WeaponId; // partner weapon for evolution
  evolutionResult?: string; // resulting weapon id
}

export interface WeaponMarketContext {
  atrPercent: number;
  rsiState: RSIState;
  pnl: number;
  volumeNorm: number;
  isFavorable: boolean;
}
```

#### `config/WeaponRegistry.ts`

```typescript
import { type WeaponConfig } from '../types/weapons';

export const WEAPON_REGISTRY: Record<WeaponId, WeaponConfig> = {
  quantum_bullet: {
    id: 'quantum_bullet',
    name: 'Quantum Bullet',
    icon: '🔫',
    baseDamage: 25,
    baseCooldown: 400,
    projectileSpeed: 8,
    projectileRadius: 5,
    damagePerLevel: 0.25,   // level 5 → 3.0x base
    cooldownPerLevel: 0.08, // level 5 → 0.6x cooldown
    marketBonus: () => 1.0,
    evolutionPair: 'laser',
    evolutionResult: 'hyper_cannon',
  },
  laser: {
    id: 'laser',
    name: 'Volatility Laser',
    icon: '⚡',
    baseDamage: 8,           // per tick (60fps)
    baseCooldown: 0,         // continuous
    projectileSpeed: Infinity,
    projectileRadius: 3,
    damagePerLevel: 0.3,
    cooldownPerLevel: 0,
    // ATR 0.03% → 2x hasar, ATR < 0.002% → 0.5x hasar
    marketBonus: ({ atrPercent }) =>
      0.5 + Math.min(atrPercent / 0.03, 1) * 1.5,
  },
  boomerang: {
    id: 'boomerang',
    name: 'RSI Boomerang',
    icon: '🪃',
    baseDamage: 35,
    baseCooldown: 1200,
    projectileSpeed: 6,
    projectileRadius: 8,
    damagePerLevel: 0.2,
    cooldownPerLevel: 0.1,
    marketBonus: ({ isFavorable }) => isFavorable ? 2.0 : 1.0,
  },
  // ... diğer silahlar
};
```

#### `services/combat/WeaponSystem.ts`

```typescript
export class WeaponSystemClass {
  private weapons: WeaponInstance[] = [];
  static readonly MAX_WEAPONS = 2;

  addWeapon(id: WeaponId): boolean {
    const existing = this.weapons.find(w => w.id === id);
    if (existing) {
      return this.upgradeWeapon(id); // aynı silahtaysa level up
    }
    if (this.weapons.length >= WeaponSystem.MAX_WEAPONS) return false;
    this.weapons.push({ id, level: 1, cooldownTimer: 0 });
    return true;
  }

  upgradeWeapon(id: WeaponId): boolean {
    const w = this.weapons.find(w => w.id === id);
    if (!w || w.level >= 5) return false;
    w.level = (w.level + 1) as WeaponLevel;
    this.checkEvolution();
    return true;
  }

  // Her iki silah da level 5 ise evrim
  private checkEvolution(): void {
    if (this.weapons.length < 2) return;
    const [a, b] = this.weapons;
    const cfgA = WEAPON_REGISTRY[a.id];
    if (a.level === 5 && b.level === 5 && cfgA.evolutionPair === b.id) {
      EventBus.emit('weaponEvolution', {
        from: [a.id, b.id],
        to: cfgA.evolutionResult!,
      });
    }
  }

  update(
    deltaTime: number,
    player: Player,
    enemies: Enemy[],
    pool: IPoolManager,
    marketCtx: WeaponMarketContext
  ): void {
    for (const weapon of this.weapons) {
      weapon.cooldownTimer -= deltaTime;
      if (weapon.cooldownTimer <= 0) {
        this.fire(weapon, player, enemies, pool, marketCtx);
        const cfg = WEAPON_REGISTRY[weapon.id];
        const cooldown = cfg.baseCooldown *
          (1 - weapon.level * cfg.cooldownPerLevel);
        weapon.cooldownTimer = cooldown;
      }
    }
  }

  private fire(
    weapon: WeaponInstance,
    player: Player,
    enemies: Enemy[],
    pool: IPoolManager,
    ctx: WeaponMarketContext
  ): void {
    const cfg = WEAPON_REGISTRY[weapon.id];
    const damage = cfg.baseDamage *
      (1 + weapon.level * cfg.damagePerLevel) *
      cfg.marketBonus(ctx);
    // WeaponFactory'ye delegate et
    WeaponFactory.createProjectile(weapon.id, player, enemies, pool, damage);
  }
}

export const WeaponSystem = new WeaponSystemClass();
```

### Değiştirilecek Mevcut Dosyalar

| Dosya | Değişiklik |
|---|---|
| `types.ts` → `Player` | `weapons: WeaponInstance[]` ekle |
| `services/cards/cardDefinitions.ts` | Silah edinme kartları ekle (örn: `"Volatility Laser"` rare kart) |
| `components/GameEngine.tsx` | Bullet firing loop → `WeaponSystem.update(...)` |
| `hooks/useGameStatusEffects.ts` | MENU'de `WeaponSystem.reset()` çağır |
| `config/StatRegistry.ts` | `weaponSlots: 2` stat ekle (legendary kart ile 3'e çıkabilir) |

### Kart Entegrasyonu

```typescript
// cardDefinitions.ts'e eklenecek yeni kartlar
{
  id: 'weapon_laser',
  name: 'Volatility Laser',
  description: 'Adds Laser weapon. Stronger when ATR is high.',
  icon: '⚡',
  tier: 'rare',
  effect: (player) => {
    WeaponSystem.addWeapon('laser');
    return player;
  },
},
{
  id: 'weapon_laser_upgrade',
  name: 'Laser Overcharge',
  description: 'Upgrades your Laser to next level.',
  icon: '⚡+',
  tier: 'rare',
  effect: (player) => {
    WeaponSystem.upgradeWeapon('laser');
    return player;
  },
},
```

### GameEngine Entegrasyon Noktası

```typescript
// GameEngine.tsx — mevcut bullet firing yerine:
if (status === GameStatus.PLAYING) {
  const marketCtx: WeaponMarketContext = {
    atrPercent: marketDataRef.current.atrPercent ?? 0.01,
    rsiState: marketDataRef.current.rsiState,
    pnl: marketDataRef.current.effectivePnl,
    volumeNorm: marketDataRef.current.volumeNorm ?? 0.5,
    isFavorable: marketDataRef.current.isFavorable ?? false,
  };
  WeaponSystem.update(deltaTime, player, p.activeEnemies, pool.current, marketCtx);
}
```

---

## 2. Meta Progression

### Tasarım Felsefesi

Her run'dan kazanılan coin'lerin **%15'i Meta Cüzdanına** akar. Bu kalıcı coin'ler run'lar arası ana menüden harcanır. Oyuncuya her run'da ufak bir avantaj vererek **tekrar oynama motivasyonu** yaratır.

### Upgrade Ağacı

#### Savaş (Combat)
| Upgrade | Maks Seviye | Her Seviye | Maliyet (artan) |
|---|---|---|---|
| `DAMAGE_BOOST` | 5 | +%8 base damage | 50 / 120 / 250 / 500 / 1000 |
| `CRIT_MASTERY` | 3 | +%5 crit chance | 80 / 200 / 450 |
| `EXTRA_PROJECTILE` | 2 | +1 mermi | 300 / 800 |

#### Hayatta Kalma (Survival)
| Upgrade | Maks Seviye | Her Seviye | Maliyet |
|---|---|---|---|
| `HP_RESERVOIR` | 5 | +15 max HP | 40 / 100 / 200 / 400 / 800 |
| `ARMOR_PLATING` | 3 | +1 armor | 100 / 250 / 600 |
| `DASH_COOLDOWN` | 2 | -%20 dash cooldown | 150 / 400 |

#### Ekonomi (Economy)
| Upgrade | Maks Seviye | Her Seviye | Maliyet |
|---|---|---|---|
| `COIN_MAGNET` | 5 | +25 magnet range | 30 / 70 / 150 / 300 / 600 |
| `LUCK_GENE` | 4 | +%3 luck | 60 / 150 / 350 / 700 |
| `XP_ACCELERATOR` | 3 | +%10 XP | 80 / 180 / 400 |

#### Özel (Special — tek seviyeli, çok pahalı)
| Upgrade | Etki | Maliyet |
|---|---|---|
| `STARTING_LEVEL_2` | Run'a level 2 başla | 2000 |
| `QUAD_CARD_CHOICE` | Level up'ta 4 kart seç (3 yerine) | 3000 |
| `GRACE_EXTENSION` | Başlangıç grace süresi 5s → 8s | 1500 |

### Yeni Dosyalar

```
types/metaProgression.ts
services/progression/MetaProgressionService.ts
stores/metaProgressionStore.ts
components/screens/MetaUpgradeScreen.tsx
```

#### `types/metaProgression.ts`

```typescript
export type MetaUpgradeId =
  | 'DAMAGE_BOOST' | 'CRIT_MASTERY' | 'EXTRA_PROJECTILE'
  | 'HP_RESERVOIR' | 'ARMOR_PLATING' | 'DASH_COOLDOWN'
  | 'COIN_MAGNET' | 'LUCK_GENE' | 'XP_ACCELERATOR'
  | 'STARTING_LEVEL_2' | 'QUAD_CARD_CHOICE' | 'GRACE_EXTENSION';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  description: string;
  icon: string;
  category: 'combat' | 'survival' | 'economy' | 'special';
  maxLevel: number;
  costPerLevel: number[];    // costPerLevel[i] = level i+1 maliyeti
  effect: (level: number) => Partial<Player>; // başlangıç player modifiyeri
}

export interface PlayerMetaState {
  metaCoins: number;         // kalıcı coin bakiyesi
  upgrades: Record<MetaUpgradeId, number>; // id → seviye (0 = satın alınmamış)
  totalRunsCompleted: number;
  totalMetaCoinsEarned: number;
}
```

#### `services/progression/MetaProgressionService.ts`

```typescript
export class MetaProgressionServiceClass {

  // Run sonu: kazanılan coin'in %15'ini meta'ya aktar
  transferRunCoins(earnedCoins: number): number {
    const metaShare = Math.floor(earnedCoins * 0.15);
    const store = useMetaProgressionStore.getState();
    store.addMetaCoins(metaShare);
    Logger.info(`[MetaProgression] +${metaShare} meta coins from run`);
    return metaShare;
  }

  // Run başında oyunculara meta bonus'ları uygula
  applyBonuses(basePlayer: Player): Player {
    const { upgrades } = useMetaProgressionStore.getState();
    let player = { ...basePlayer };

    for (const [id, level] of Object.entries(upgrades)) {
      if (level === 0) continue;
      const def = META_UPGRADE_REGISTRY[id as MetaUpgradeId];
      const patch = def.effect(level);
      player = { ...player, ...patch };
    }

    return player;
  }

  purchaseUpgrade(id: MetaUpgradeId): boolean {
    const store = useMetaProgressionStore.getState();
    const def = META_UPGRADE_REGISTRY[id];
    const currentLevel = store.upgrades[id] ?? 0;

    if (currentLevel >= def.maxLevel) return false;

    const cost = def.costPerLevel[currentLevel];
    if (store.metaCoins < cost) return false;

    store.spendMetaCoins(cost);
    store.setUpgradeLevel(id, currentLevel + 1);
    EventBus.emit('metaUpgradePurchased', { id, newLevel: currentLevel + 1 });
    return true;
  }
}

export const MetaProgressionService = new MetaProgressionServiceClass();
```

#### `stores/metaProgressionStore.ts`

```typescript
// Zustand + localStorage kalıcılığı
interface MetaProgressionStore extends PlayerMetaState {
  addMetaCoins: (amount: number) => void;
  spendMetaCoins: (amount: number) => void;
  setUpgradeLevel: (id: MetaUpgradeId, level: number) => void;
  reset: () => void;
}

export const useMetaProgressionStore = create<MetaProgressionStore>()(
  persist(
    (set) => ({
      metaCoins: 0,
      upgrades: Object.fromEntries(
        Object.keys(META_UPGRADE_REGISTRY).map(k => [k, 0])
      ) as Record<MetaUpgradeId, number>,
      totalRunsCompleted: 0,
      totalMetaCoinsEarned: 0,
      addMetaCoins: (amount) => set(s => ({
        metaCoins: s.metaCoins + amount,
        totalMetaCoinsEarned: s.totalMetaCoinsEarned + amount,
      })),
      spendMetaCoins: (amount) => set(s => ({
        metaCoins: Math.max(0, s.metaCoins - amount),
      })),
      setUpgradeLevel: (id, level) => set(s => ({
        upgrades: { ...s.upgrades, [id]: level },
      })),
      reset: () => set({ metaCoins: 0, upgrades: {}, totalRunsCompleted: 0, totalMetaCoinsEarned: 0 }),
    }),
    { name: 'meta-progression-storage' }
  )
);
```

### Değiştirilecek Mevcut Dosyalar

| Dosya | Değişiklik |
|---|---|
| `App.tsx` → `startGame` | `MetaProgressionService.applyBonuses(basePlayer)` çağır |
| `hooks/useGameFlowController.ts` → `handleGameOver` | `MetaProgressionService.transferRunCoins(totalCoins)` |
| `hooks/useGameFlowController.ts` → `handleCashOut` | Aynı transfer çağrısı |
| `components/screens/MainMenu.tsx` | "UPGRADES" butonu ekle → `MetaUpgradeScreen` |
| `config/StatRegistry.ts` | Meta bonus stats için cap kontrolü ekle |

### QUAD_CARD_CHOICE Entegrasyonu

```typescript
// hooks/useGameFlowController.ts → handleLevelUp içinde:
const cardCount = MetaProgressionService.getUpgradeLevel('QUAD_CARD_CHOICE') > 0 ? 4 : 3;
const choices = CardSystem.generateChoices(playerRef.current.luck, playerRef.current.level, cardCount);
```

---

## 3. Market Event Announcements

### Tasarım Felsefesi

WebSocket'ten gelen ani piyasa hareketleri oyun içinde sinematik banner ile duyurulur. Oyuncu **neyin neden olduğunu anlar** — pedagojik ve immersif.

### Event Tipleri

| Event | Tetikleyici | Banner Rengi | Mesaj Örneği |
|---|---|---|---|
| `PRICE_SHOCK_UP` | Fiyat 60s'de +%2 | Yeşil | `"⚡ BTC +2.1% in 60s — UPSIDE SHOCK!"` |
| `PRICE_SHOCK_DOWN` | Fiyat 60s'de -%2 | Kırmızı | `"💥 BTC -2.3% in 60s — VOLATILITY SHOCK!"` |
| `RSI_OVERSOLD` | RSI < 20 geçiş | Cyan | `"📉 RSI OVERSOLD — Friendly enemies incoming"` |
| `RSI_OVERBOUGHT` | RSI > 80 geçiş | Turuncu | `"📈 RSI OVERBOUGHT — Enemies going aggressive"` |
| `WHALE_DETECTED` | Volume norm > 0.95 | Mor | `"🐋 MEGA WHALE DETECTED — Incoming!"` |
| `LIQUIDATION_WARNING` | effectivePnl < -60% | Yanıp sönen Kırmızı | `"⚠️ LIQUIDATION ZONE — Survive or cash out!"` |
| `FAVORABLE_MARKET` | RSI state pozisyona uyumlu geçiş | Altın | `"✨ MARKET ALIGNED — Friendly wave!"` |

### Yeni Dosyalar

```
services/market/MarketEventAnnouncer.ts
components/hud/MarketAnnouncementBanner.tsx
```

#### `services/market/MarketEventAnnouncer.ts`

```typescript
interface AnnouncementEvent {
  type: MarketAnnouncementType;
  message: string;
  color: string;
  icon: string;
  duration: number; // ms
  priority: number; // yüksek öncelikli announcement sırayı atlar
}

export class MarketEventAnnouncerClass {
  private lastRSIState: RSIState = RSIState.NEUTRAL;
  private lastPnl = 0;
  private liquidationWarningActive = false;

  update(data: MarketData, position: MarketPosition): void {
    this.checkRSITransition(data.rsiState, position);
    this.checkPriceShock(data);
    this.checkLiquidationWarning(data.effectivePnl);
    this.checkWhaleDetection(data.volumeNorm ?? 0);
  }

  private checkRSITransition(newState: RSIState, position: MarketPosition): void {
    if (newState === this.lastRSIState) return;
    const isFavorable = (position === 'LONG' && newState === RSIState.OVERSOLD)
      || (position === 'SHORT' && newState === RSIState.OVERBOUGHT);

    if (newState !== RSIState.NEUTRAL) {
      EventBus.emit('marketAnnouncement', {
        type: isFavorable ? 'FAVORABLE_MARKET' : `RSI_${newState}`,
        message: isFavorable
          ? `✨ MARKET ALIGNED — Friendly wave incoming!`
          : `${newState === RSIState.OVERBOUGHT ? '📈' : '📉'} RSI ${newState}`,
        color: isFavorable ? '#FFD700' : (newState === RSIState.OVERBOUGHT ? '#FF6B35' : '#00FFFF'),
        icon: isFavorable ? '✨' : '📊',
        duration: 3000,
        priority: 2,
      });
    }
    this.lastRSIState = newState;
  }

  private checkLiquidationWarning(pnl: number): void {
    const inDanger = pnl <= -0.6;
    if (inDanger && !this.liquidationWarningActive) {
      this.liquidationWarningActive = true;
      EventBus.emit('marketAnnouncement', {
        type: 'LIQUIDATION_WARNING',
        message: '⚠️ LIQUIDATION ZONE — Survive or cash out!',
        color: '#FF0000',
        icon: '⚠️',
        duration: 5000,
        priority: 10, // en yüksek öncelik
      });
    } else if (!inDanger) {
      this.liquidationWarningActive = false;
    }
  }
}

export const MarketEventAnnouncer = new MarketEventAnnouncerClass();
```

#### `components/hud/MarketAnnouncementBanner.tsx`

```typescript
// EventBus'tan 'marketAnnouncement' dinler
// CSS animation: slide-in + fade-out
// Queue: aynı anda birden fazla event varsa sıralı göster
// Liquidation warning: yanıp söner
export const MarketAnnouncementBanner: React.FC = () => {
  const [queue, setQueue] = useState<AnnouncementEvent[]>([]);
  const [current, setCurrent] = useState<AnnouncementEvent | null>(null);

  useEffect(() => {
    const unsub = EventBus.on('marketAnnouncement', (event) => {
      setQueue(q => {
        // Priority >= 10 ise mevcut announcement'ı interrupt et
        if (event.priority >= 10) return [event, ...q];
        return [...q, event].sort((a, b) => b.priority - a.priority);
      });
    });
    return () => unsub();
  }, []);

  // queue'dan sırayla göster
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
      setTimeout(() => setCurrent(null), next.duration);
    }
  }, [current, queue]);

  if (!current) return null;

  return (
    <div style={{
      position: 'absolute', top: 60, left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: current.color + '22',
      border: `2px solid ${current.color}`,
      color: current.color,
      padding: '8px 20px',
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 'bold',
      zIndex: 100,
      animation: 'slideInFade 0.3s ease',
      textShadow: `0 0 10px ${current.color}`,
    }}>
      {current.message}
    </div>
  );
};
```

### Değiştirilecek Mevcut Dosyalar

| Dosya | Değişiklik |
|---|---|
| `components/GameHUD.tsx` | `<MarketAnnouncementBanner />` ekle |
| `components/GameEngine.tsx` → game loop | `MarketEventAnnouncer.update(marketData, position)` çağır (frame throttled, her 10 frame'de bir) |
| `types/events.ts` | `marketAnnouncement: AnnouncementEvent` event type ekle |

---

## 4. Daily / Weekly Challenge

### Tasarım Felsefesi

Her gün/hafta **herkes aynı koşullarla** oynuyor. Challenge'lar Supabase'den çekilir, deterministic seed ile üretilir. Completion = bonus lootbox + meta coin. Ayrı leaderboard → rekabet.

### Challenge Yapısı

```typescript
export interface ChallengeDefinition {
  id: string;                          // "2026-03-16-daily"
  type: 'daily' | 'weekly';
  name: string;                        // "Bear Trap Monday"
  description: string;
  constraints: ChallengeConstraint[];
  objectives: ChallengeObjective[];
  reward: ChallengeReward;
  expiresAt: string;                   // ISO timestamp
  seed: number;                        // RNG seed (tarih hash'i)
}

export interface ChallengeConstraint {
  type: 'position' | 'leverage_min' | 'leverage_max' | 'game_mode';
  value: string | number;
}
// Örnek: { type: 'position', value: 'SHORT' }
// Örnek: { type: 'leverage_min', value: 25 }

export interface ChallengeObjective {
  type: 'survive_seconds' | 'kill_count' | 'reach_level' | 'survive_liquidation_zone';
  target: number;
  current: number;   // runtime tracking
  completed: boolean;
}

export interface ChallengeReward {
  metaCoins: number;
  lootboxType: LootboxType;
  bonusXp: number;
}
```

### Challenge Örnekleri

| Gün | İsim | Kısıt | Hedef | Ödül |
|---|---|---|---|---|
| Pazartesi | Bear Trap | SHORT, min 10x | 5 dk hayatta kal | 200 meta coin + gas_box |
| Salı | Diamond Hands | LONG, min 50x | Level 10'a ulaş | 350 meta coin + validator_vault |
| Çarşamba | Whale Hunter | Herhangi | 3 Whale öldür | 250 meta coin + whale_hunter_box |
| Haftalık | The Liquidator | SHORT, 100x | Liquidation zone'da 60s hayatta kal | 1500 meta coin + whale_wallet |

### Yeni Dosyalar

```
services/challenges/ChallengeService.ts
types/challenge.ts
supabase/functions/get-daily-challenge/index.ts
components/screens/ChallengeScreen.tsx
components/hud/ChallengeProgressHUD.tsx
```

#### `services/challenges/ChallengeService.ts`

```typescript
export class ChallengeServiceClass {
  private activeChallenge: ChallengeDefinition | null = null;
  private objectives: Map<string, ChallengeObjective> = new Map();

  async fetchTodayChallenge(): Promise<ChallengeDefinition | null> {
    const { data } = await supabase.functions.invoke('get-daily-challenge');
    this.activeChallenge = data;
    return data;
  }

  // Challenge run'u başlatmadan önce constraint kontrolü
  validateConstraints(position: MarketPosition, leverage: number): string | null {
    if (!this.activeChallenge) return null;
    for (const c of this.activeChallenge.constraints) {
      if (c.type === 'position' && position !== c.value) {
        return `Bu challenge ${c.value} pozisyon gerektiriyor`;
      }
      if (c.type === 'leverage_min' && leverage < (c.value as number)) {
        return `Bu challenge minimum ${c.value}x kaldıraç gerektiriyor`;
      }
    }
    return null;
  }

  // GameEngine / EventBus'tan gelen olayları dinle
  startTracking(): void {
    EventBus.on('enemyKilled', ({ type }) => {
      this.updateObjective('kill_count', 1);
      if (type === 'whale') this.updateObjective('whale_kill_count', 1);
    });
    EventBus.on('levelUpComplete', ({ newLevel }) => {
      this.updateObjective('reach_level', newLevel, 'max');
    });
  }

  private updateObjective(
    type: string,
    value: number,
    mode: 'add' | 'max' = 'add'
  ): void {
    const obj = this.objectives.get(type);
    if (!obj || obj.completed) return;
    obj.current = mode === 'add' ? obj.current + value : Math.max(obj.current, value);
    if (obj.current >= obj.target) {
      obj.completed = true;
      this.checkAllObjectives();
    }
    EventBus.emit('challengeObjectiveUpdate', { type, current: obj.current, target: obj.target });
  }

  private checkAllObjectives(): void {
    const allDone = [...this.objectives.values()].every(o => o.completed);
    if (allDone) {
      void this.claimReward();
    }
  }

  private async claimReward(): Promise<void> {
    const reward = this.activeChallenge!.reward;
    await MetaProgressionService.addMetaCoins(reward.metaCoins);
    await LootboxService.earnLootbox(reward.lootboxType, 'challenge_complete');
    EventBus.emit('challengeCompleted', { reward });
  }
}

export const ChallengeService = new ChallengeServiceClass();
```

#### Supabase Edge Function: `get-daily-challenge`

```typescript
// supabase/functions/get-daily-challenge/index.ts
Deno.serve(async (req) => {
  const today = new Date().toISOString().split('T')[0]; // "2026-03-16"
  const seed = hashString(today); // deterministik seed

  // DB'den bugünkü challenge'ı getir veya yoksa üret
  const { data } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single();

  if (data) {
    return new Response(JSON.stringify(data), { status: 200 });
  }

  // Yeni challenge üret (admin tarafından önceden yüklenebilir)
  return new Response(JSON.stringify({ error: 'No challenge for today' }), { status: 404 });
});
```

#### Supabase Migration

```sql
-- supabase/migrations/xxx_add_challenges.sql
CREATE TABLE daily_challenges (
  id TEXT PRIMARY KEY,              -- "2026-03-16-daily"
  type TEXT NOT NULL,               -- 'daily' | 'weekly'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints JSONB NOT NULL DEFAULT '[]',
  objectives JSONB NOT NULL DEFAULT '[]',
  reward JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  seed BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  challenge_id TEXT REFERENCES daily_challenges(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  score INTEGER NOT NULL,           -- kills * level * survival_time
  UNIQUE(user_id, challenge_id)     -- bir challenge bir kere tamamlanır
);
```

### Değiştirilecek Mevcut Dosyalar

| Dosya | Değişiklik |
|---|---|
| `App.tsx` → `startGame` | `ChallengeService.validateConstraints(position, leverage)` kontrolü |
| `components/screens/MainMenu.tsx` | "DAILY CHALLENGE" butonu + rozet (tamamlanmışsa ✅) |
| `components/GameHUD.tsx` | `<ChallengeProgressHUD />` ekle (küçük ilerleme göstergesi) |

---

## 5. Replay Sistemi

### Tasarım Felsefesi

`EventRecorderService` zaten replay verisi toplayıp `replayData` olarak session'a ekliyor. Bu veri Supabase'e kaydedilip geri oynatılabilir hale getirilecek.

### Mimari

```
Run Sırasında:
  EventRecorderService → olayları toplar (kill, damage, levelup, position, etc.)

Run Sonunda:
  MetricsService.endSession() → replayData (compressed binary)
  GameSessionService.submitSession() → Supabase'e kaydeder

Replay Modunda:
  ReplayPlayerService → replayData'yı decompress eder
  → Ghost entity olarak GameEngine'e enjekte eder
  → Aynı market verisi + aynı kararlar tekrar oynatılır
```

### Replay Veri Formatı

```typescript
export interface ReplaySnapshot {
  t: number;           // timestamp (ms from start)
  px: number;          // player x
  py: number;          // player y
  hp: number;          // player hp
  level: number;
}

export interface ReplayEvent {
  t: number;
  type:
    | 'kill'           // { enemyType, x, y }
    | 'damage_taken'   // { amount, source }
    | 'levelup'        // { newLevel, cardChosen }
    | 'dash'           // { dx, dy }
    | 'portal_open'    // { x, y, type }
    | 'weapon_fire';   // { weaponId, tx, ty }
  data: Record<string, unknown>;
}

export interface ReplayData {
  version: 2;
  sessionId: string;
  duration: number;            // ms
  finalLevel: number;
  totalKills: number;
  marketPair: CryptoPair;
  leverage: number;
  position: MarketPosition;
  entryPrice: number;
  exitPrice: number;
  snapshots: ReplaySnapshot[]; // her 500ms'de bir
  events: ReplayEvent[];
  compressedSize: number;
}
```

### Yeni Dosyalar

```
services/replay/ReplayPlayerService.ts
services/replay/ReplayRecorderService.ts   (EventRecorderService refactor)
components/screens/ReplayViewerScreen.tsx
components/hud/ReplayOverlay.tsx
```

#### `services/replay/ReplayPlayerService.ts`

```typescript
export class ReplayPlayerServiceClass {
  private replay: ReplayData | null = null;
  private currentTimeMs = 0;
  private snapshotIndex = 0;
  private eventIndex = 0;
  private ghostPlayer: GhostEntity | null = null;

  loadReplay(data: ReplayData): void {
    this.replay = data;
    this.currentTimeMs = 0;
    this.snapshotIndex = 0;
    this.eventIndex = 0;
    this.ghostPlayer = this.createGhostEntity();
  }

  // GameEngine'in render loop'unda çağrılır (replay mode'da)
  tick(deltaTime: number): ReplayTickResult {
    if (!this.replay || !this.ghostPlayer) return { done: true };

    this.currentTimeMs += deltaTime;

    // Snapshot interpolation
    while (
      this.snapshotIndex < this.replay.snapshots.length - 1 &&
      this.replay.snapshots[this.snapshotIndex + 1].t <= this.currentTimeMs
    ) {
      this.snapshotIndex++;
    }
    const snap = this.replay.snapshots[this.snapshotIndex];
    this.ghostPlayer.x = snap.px;
    this.ghostPlayer.y = snap.py;
    this.ghostPlayer.hp = snap.hp;

    // Events
    const pendingEvents: ReplayEvent[] = [];
    while (
      this.eventIndex < this.replay.events.length &&
      this.replay.events[this.eventIndex].t <= this.currentTimeMs
    ) {
      pendingEvents.push(this.replay.events[this.eventIndex++]);
    }

    return {
      done: this.currentTimeMs >= this.replay.duration,
      ghost: this.ghostPlayer,
      events: pendingEvents,
      progress: this.currentTimeMs / this.replay.duration,
    };
  }

  private createGhostEntity(): GhostEntity {
    return { x: 0, y: 0, hp: 100, level: 1, alpha: 0.4, color: '#8888FF' };
  }
}

export const ReplayPlayerService = new ReplayPlayerServiceClass();
```

#### Supabase Depolama

```sql
-- supabase/migrations/xxx_add_replays.sql
CREATE TABLE game_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id),
  user_id UUID REFERENCES profiles(id),
  score INTEGER NOT NULL,
  replay_data BYTEA NOT NULL,       -- compressed
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Her kullanıcı için sadece top 5 replay sakla
CREATE OR REPLACE FUNCTION prune_old_replays() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM game_replays
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM game_replays
      WHERE user_id = NEW.user_id
      ORDER BY score DESC LIMIT 5
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_replay_insert
  AFTER INSERT ON game_replays
  FOR EACH ROW EXECUTE FUNCTION prune_old_replays();
```

#### Edge Function: `save-replay`

```typescript
// supabase/functions/save-replay/index.ts
Deno.serve(async (req) => {
  const { sessionId, replayData, score } = await req.json();
  const userId = await getUserIdFromJWT(req);

  // Max replay boyutu: 500KB
  const replayBytes = new TextEncoder().encode(JSON.stringify(replayData));
  if (replayBytes.length > 500_000) {
    return new Response(JSON.stringify({ error: 'Replay too large' }), { status: 413 });
  }

  await supabase.from('game_replays').insert({
    session_id: sessionId,
    user_id: userId,
    score,
    replay_data: replayBytes,
    duration_ms: replayData.duration,
  });

  return new Response(JSON.stringify({ saved: true }), { status: 200 });
});
```

#### GameOver Ekranına Entegrasyon

```typescript
// GameOver ekranında:
<button onClick={() => setScreen('REPLAY_VIEWER')}>
  🎬 Watch Replay
</button>

// ReplayViewerScreen:
// - Harita üzerinde ghost player path çizgisi
// - Kill eventleri haritada işaretli
// - Market price chart + PnL timeline overlay
// - 2x hız butonu
```

### Değiştirilecek Mevcut Dosyalar

| Dosya | Değişiklik |
|---|---|
| `services/core/MetricsService.ts` | `endSession` → `replayData`'yı `save-replay` edge function'a ilet |
| `components/GameEngine.tsx` | Replay mode: `ReplayPlayerService.tick()` + ghost render |
| `App.tsx` | `REPLAY_VIEWER` screen state ekle |
| `types/events.ts` | `replaySaved`, `replayLoaded` event tipleri ekle |

---

## 6. Elite Düşmanlar

### Tasarım Felsefesi

Her düşman spawn'ında **%15 şansla Elite varyant** olarak çıkabilir. Elite düşmanlar:
- 2.5x HP, 1.5x hız, 1.8x hasar
- Görsel: Altın/pembe parlama, küçük taç ikonu
- **Benzersiz özel yetenek** (tipe göre)
- 3x drop değeri, garantili buff/debuff drop

### Elite Yetenekleri

| Düşman | Elite Yeteneği | Açıklama |
|---|---|---|
| **Elite Bear** | `HealAura` | 200px yarıçapta yakın düşmanlara saniyede +5 HP verir |
| **Elite Bull** | `DamageTrail` | Hareket rotasında 2 saniyelik hasar alanı bırakır |
| **Elite FUD** | `DeathSplit` | Ölünce 3 normal FUD'a bölünür |
| **Elite Whale** | `MinionSpawn` | %50 HP'de 4 Bear minyon çıkarır (bir kez) |
| **Elite MEV Bot** | `MirrorMovement` | Oyuncunun hareketini tam kopyalar (sürekli yaklaşım) |
| **Elite Sandwich** | `CageTrap` | Spawn olunca 6 düşman tam çember oluşturur (kaçış zorlaşır) |
| **Elite Liquidator** | `ChainExplosion` | Patladığında yakın düşmanlara da patlama zinciri |
| **Elite Rug Pull** | `PhaseTeleport` | Her 3 saniyede oyuncunun hemen yanına ışınlanır |

### Yeni Dosyalar

```
config/EliteConfig.ts
services/combat/EliteAbilitySystem.ts
```

#### `config/EliteConfig.ts`

```typescript
export const ELITE_CONFIG = {
  spawnChance: 0.15,      // %15 normal spawn'da elite olur
  hpMultiplier: 2.5,
  speedMultiplier: 1.5,
  damageMultiplier: 1.8,
  dropValueMultiplier: 3.0,
  guaranteedDrop: true,   // öldürünce her zaman buff/debuff drop
  visualGlowColor: '#FFD700',
  visualGlowRadius: 8,
  crownIconOffset: { x: 0, y: -20 },
} as const;

export type EliteAbilityId =
  | 'heal_aura'
  | 'damage_trail'
  | 'death_split'
  | 'minion_spawn'
  | 'mirror_movement'
  | 'cage_trap'
  | 'chain_explosion'
  | 'phase_teleport';

export const ELITE_ABILITIES: Record<EnemyId, EliteAbilityId> = {
  bear: 'heal_aura',
  bull: 'damage_trail',
  fud: 'death_split',
  whale: 'minion_spawn',
  mev_bot: 'mirror_movement',
  sandwich: 'cage_trap',
  liquidator: 'chain_explosion',
  rugpull: 'phase_teleport',
  // boss tipler elite olamaz:
  market_maker: 'heal_aura', // fallback
  gatekeeper: 'heal_aura',
  '51_attack': 'heal_aura',
  rsi: 'damage_trail',
  pumpdump: 'death_split',
  flash_loan: 'chain_explosion',
};
```

#### `services/combat/EliteAbilitySystem.ts`

```typescript
export class EliteAbilitySystemClass {
  private abilityTimers: Map<string, number> = new Map(); // enemyId → cooldown

  update(
    deltaTime: number,
    eliteEnemies: Enemy[],
    player: Player,
    pool: IPoolManager,
    allEnemies: Enemy[]
  ): void {
    for (const enemy of eliteEnemies) {
      if (!enemy.isElite) continue;
      this.tickAbility(deltaTime, enemy, player, pool, allEnemies);
    }
  }

  private tickAbility(
    deltaTime: number,
    enemy: Enemy,
    player: Player,
    pool: IPoolManager,
    allEnemies: Enemy[]
  ): void {
    const ability = ELITE_ABILITIES[enemy.type];
    const key = `${enemy.type}_${enemy.poolIndex}`;
    const timer = (this.abilityTimers.get(key) ?? 0) - deltaTime;
    this.abilityTimers.set(key, timer);
    if (timer > 0) return;

    switch (ability) {
      case 'heal_aura':
        this.applyHealAura(enemy, allEnemies);
        this.abilityTimers.set(key, 1000); // 1s cooldown
        break;

      case 'mirror_movement':
        // Her frame düşmanı oyuncuya yönlendir (hız 2x)
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * 2 * deltaTime * 0.06;
        enemy.y += Math.sin(angle) * enemy.speed * 2 * deltaTime * 0.06;
        break;

      case 'phase_teleport':
        enemy.x = player.x + (Math.random() - 0.5) * 80;
        enemy.y = player.y + (Math.random() - 0.5) * 80;
        EventBus.emit('eliteAbilityActivated', { type: 'phase_teleport', x: enemy.x, y: enemy.y });
        this.abilityTimers.set(key, 3000); // 3s cooldown
        break;

      // ... diğer yetenekler
    }
  }

  // Elite ölünce çağrılır
  onEliteDeath(enemy: Enemy, pool: IPoolManager): void {
    const ability = ELITE_ABILITIES[enemy.type];

    if (ability === 'death_split') {
      // 3 normal FUD spawn et
      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 30;
        pool.spawnEnemy('fud', enemy.x + offset, enemy.y, /* difficulty */);
      }
    }

    if (ability === 'chain_explosion') {
      // Yakın düşmanlara AOE hasar ver (player'a da!)
      EventBus.emit('eliteChainExplosion', { x: enemy.x, y: enemy.y, radius: 80, damage: 20 });
    }
  }

  private applyHealAura(healer: Enemy, allEnemies: Enemy[]): void {
    const AURA_RADIUS = 200;
    for (const e of allEnemies) {
      if (e === healer || !e.active) continue;
      const dx = e.x - healer.x;
      const dy = e.y - healer.y;
      if (dx * dx + dy * dy <= AURA_RADIUS * AURA_RADIUS) {
        e.health = Math.min(e.health + 5, e.maxHealth);
      }
    }
  }
}

export const EliteAbilitySystem = new EliteAbilitySystemClass();
```

### Değiştirilecek Mevcut Dosyalar

| Dosya | Değişiklik |
|---|---|
| `types.ts` → `Enemy` | `isElite?: boolean` alanı ekle |
| `factories/EnemyFactory.ts` | Elite roll + stat multipier + `isElite = true` set |
| `services/combat/SpawnSystem.ts` | `ELITE_CONFIG.spawnChance` ile roll, factory'e `isElite` flag'i geç |
| `services/combat/physics/CombatResolutionService.ts` | Elite ölümünde `EliteAbilitySystem.onEliteDeath()` çağır; drop değerini 3x yap |
| `components/GameEngine.tsx` → render loop | `EliteAbilitySystem.update(...)` çağır; elite visual (glow + taç) render |
| `services/renderers/GameRenderer.ts` | Elite görsel: altın glow circle + taç sembolü |

### EnemyFactory Değişikliği

```typescript
// factories/EnemyFactory.ts — createEnemy() içine ekle:
const isElite = !isBoss(type) && Math.random() < ELITE_CONFIG.spawnChance;

if (isElite) {
  enemy.isElite = true;
  enemy.health    *= ELITE_CONFIG.hpMultiplier;
  enemy.maxHealth *= ELITE_CONFIG.hpMultiplier;
  enemy.speed     *= ELITE_CONFIG.speedMultiplier;
  enemy.damage    *= ELITE_CONFIG.damageMultiplier;
  // Visual override
  enemy.visualStyle = 'elite'; // yeni stil
  Logger.debug(`[EnemyFactory] Elite ${type} spawned`);
}
```

---

## Implementasyon Sırası

```
Hafta 1:  Elite Düşmanlar        (tek dosya değişikliği, hızlı)
          Market Event Banners   (görsel etki, kolay)

Hafta 2:  Silah Sistemi          (core gameplay — en büyük iş)

Hafta 3:  Meta Progression       (Zustand store + UI)

Hafta 4:  Daily Challenge        (Supabase migration + edge function)

Hafta 5:  Replay Sistemi         (en karmaşık — mevcut altyapı var)
```

## Bağımlılık Grafiği

```
EliteAbilitySystem ──────────────────┐
MarketEventAnnouncer ────────────────┤
                                     ▼
WeaponSystem ──── cardDefinitions ── GameEngine (merkez)
                                     ▲
MetaProgressionService ──────────────┤
ChallengeService ────────────────────┤
ReplayPlayerService ─────────────────┘
```

Hiçbir özellik diğerine bağımlı değil — paralel geliştirilebilir.
