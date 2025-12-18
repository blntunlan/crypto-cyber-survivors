export enum MarketPosition {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAMEOVER = 'GAMEOVER',
}

export interface MarketData {
  price: number;
  volume: number;
  pnl: number;
  rsi: number;
  difficulty: number;
}

export interface Entity {
  active: boolean; // For Pooling
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface Player extends Omit<Entity, 'active'> {
  hp: number;
  maxHp: number;
  level: number;
  exp: number;
  nextLevelExp: number;
  speed: number;
  fireRate: number;
  critChance: number;
  baseDamage: number;
  luck: number;
  magnet: number;
  armor: number;
  area: number;
  projectiles: number;
}

// Note: UpgradeOption removed - now using Card from CardSystem

export interface Enemy extends Entity {
  speed: number;
  health: number;
  maxHealth: number;
  type: 'bear' | 'bull' | 'fud' | 'whale' | 'liquidator' | 'pumpdump';
}

export interface Bullet extends Entity {
  vx: number;
  vy: number;
  damage: number;
  isCrit: boolean;
  isSuperCrit?: boolean;
}

export interface Gem extends Entity {
  value: number;
  isRare?: boolean;
}

export interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  size: number;
}

export interface Candle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  speed: number;
}

export interface GameState {
  bgCandles: Candle[];
  lastFireTime: number;
  spawnTimer: number;
  shake: number;
  critFlash: number;
  critFlashColor: string;
  currentBg: { r: number; g: number; b: number };
  lastTime: number;

  levelUpFreeze: number;
}
