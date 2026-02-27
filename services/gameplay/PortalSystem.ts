import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { difficultyContext } from '../difficulty';
import { TimeService } from '../core/TimeService';

export interface PortalState {
  isActive: boolean;
  x: number;
  y: number;
  radius: number;
  timeLeft: number;
  type: 'TAKE_PROFIT' | 'STOP_LOSS';
}

class PortalSystemClass {
  private static instance: PortalSystemClass | null = null;

  private state: PortalState = {
    isActive: false,
    x: 0,
    y: 0,
    radius: 40,
    timeLeft: 0,
    type: 'TAKE_PROFIT',
  };

  private rawCoins = 0;
  private lastPortalTime = 0;
  private readonly PORTAL_DURATION = 25; // seconds
  private readonly PORTAL_COOLDOWN = 45; // seconds

  private constructor() {
    EventBus.on('gameReset', () => this.reset());
    EventBus.on('enemyKilled', (data: { enemyType?: string } | undefined) => {
      // Whales and Lootboxes could drop more, for now mock increment
      if (data?.enemyType === 'whale') this.addRawCoins(50);
      else this.addRawCoins(1);
    });
  }

  static getInstance(): PortalSystemClass {
    return (PortalSystemClass.instance ??= new PortalSystemClass());
  }

  public update(dt: number, width: number, height: number) {
    if (this.state.isActive) {
      this.state.timeLeft -= dt / 1000;
      if (this.state.timeLeft <= 0) {
        this.closePortal();
      }
      return;
    }

    // AI Check for spawning (Only after 60s of gameplay)
    const elapsed = TimeService.getGameTimeSeconds();
    if (elapsed < 60) return;

    if (elapsed - this.lastPortalTime > this.PORTAL_COOLDOWN) {
      this.checkTrigger(width, height);
    }
  }

  private checkTrigger(width: number, height: number) {
    const inputs = difficultyContext.inputs;
    const pnl = inputs.pnlPercent;

    // AI Decision: High Aggression or High Stress might force a portal
    // But primarily based on PnL as per user request
    if (pnl > 0.1) {
      // 10% Profit
      this.spawnPortal('TAKE_PROFIT', width, height);
    } else if (pnl < -0.15) {
      // 15% Loss
      this.spawnPortal('STOP_LOSS', width, height);
    }
  }

  private spawnPortal(
    type: 'TAKE_PROFIT' | 'STOP_LOSS',
    width: number,
    height: number
  ) {
    // Spawn within screen but away from center (let's say 20% margin)
    const margin = 0.2;
    this.state = {
      isActive: true,
      type,
      x: (margin + Math.random() * (1 - 2 * margin)) * width,
      y: (margin + Math.random() * (1 - 2 * margin)) * height,
      radius: 45,
      timeLeft: this.PORTAL_DURATION,
    };

    this.lastPortalTime = TimeService.getGameTimeSeconds();

    Logger.info(
      `[PortalSystem] ${type} Portal Opened at ${Math.floor(this.state.x)}, ${Math.floor(this.state.y)}`
    );

    // Emit for SpawnSystem to create Gatekeepers
    EventBus.emit('portalOpened', {
      x: this.state.x,
      y: this.state.y,
      type: this.state.type,
      portalNumber: Math.floor(this.lastPortalTime),
      reason: 'Rule-Based Allocation',
      isForced: false,
    });
  }

  public closePortal() {
    if (!this.state.isActive) return;
    this.state.isActive = false;
    Logger.info(`[PortalSystem] Portal Closed`);
    EventBus.emit('portalClosed', {
      type: this.state.type,
      portalNumber: Math.floor(this.lastPortalTime),
    });
  }

  /**
   * Final calculation for game summary
   */
  public calculateFinalRewards(): {
    totalCoins: number;
    rawCoins: number;
    bonus: number;
  } {
    const survivalTime = TimeService.getGameTimeSeconds();
    const inputs = difficultyContext.inputs;
    const plValue = Math.max(0, Math.floor(inputs.pnlPercent * 100)); // Use percentage as integer

    // Formula: rawCoins + (survivalTime / 10 * plValue)
    const bonus = Math.floor((survivalTime / 10) * plValue);
    const totalCoins = this.rawCoins + bonus;

    return { totalCoins, rawCoins: this.rawCoins, bonus };
  }

  public addRawCoins(amount: number) {
    this.addRawCoinsInternal(amount);
  }

  private addRawCoinsInternal(amount: number) {
    this.rawCoins += amount;
  }

  public getRawCoins(): number {
    return this.rawCoins;
  }

  public getState(): PortalState {
    return this.state;
  }

  public reset() {
    this.state.isActive = false;
    this.rawCoins = 0;
    this.lastPortalTime = 0;
  }
}

export const portalSystem = PortalSystemClass.getInstance();
