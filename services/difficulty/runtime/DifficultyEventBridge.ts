import { EventBus } from '../../core/EventBus';
import { type DifficultyInputInbox } from './DifficultyInputInbox';

export type DifficultyLifecycleRequests = {
  requestReset: (eligibleFromTick: number) => void;
  requestCycleContinue: (eligibleFromTick: number) => void;
};

export class DifficultyEventBridge {
  private readonly unsubscribers: (() => void)[] = [];
  private started = false;
  private disposed = false;

  public constructor(
    private readonly inbox: DifficultyInputInbox,
    private readonly getCurrentTick: () => number,
    private readonly lifecycleRequests: DifficultyLifecycleRequests | null = null
  ) {}

  public start(): void {
    if (this.started || this.disposed) return;
    this.started = true;

    this.unsubscribers.push(
      EventBus.on(
        'canonicalMarketFrame',
        frame => this.inbox.recordMarketFrame(frame, this.nextTick()),
        { scope: 'gameplay' }
      ),
      EventBus.on(
        'playerHit',
        event => this.inbox.recordPlayerHit(event, this.nextTick()),
        { scope: 'gameplay' }
      ),
      EventBus.on('enemyKilled', () => this.inbox.recordEnemyKilled(this.nextTick()), {
        scope: 'gameplay',
      }),
      EventBus.on(
        'playerDash',
        event => this.inbox.recordDash(event, this.nextTick()),
        { scope: 'gameplay' }
      ),
      EventBus.on('bulletFired', () => this.inbox.recordBulletFired(this.nextTick()), {
        scope: 'gameplay',
      }),
      EventBus.on(
        'levelUpComplete',
        event => this.inbox.recordLevel(event.newLevel, this.nextTick()),
        { scope: 'gameplay' }
      ),
      EventBus.on('gameReset', () => this.requestReset(this.nextTick()), {
        scope: 'gameplay',
      }),
      EventBus.on('gameOver', () => this.requestReset(this.nextTick()), {
        scope: 'gameplay',
      }),
      EventBus.on(
        'cycleDecisionMade',
        event => {
          if (event.decision === 'CONTINUE') {
            this.requestCycleContinue(this.nextTick());
          } else {
            this.requestReset(this.nextTick());
          }
        },
        { scope: 'gameplay' }
      ),
      EventBus.on(
        'difficultyRunInitialized',
        constants => this.inbox.initializeRun(constants, this.nextTick()),
        { scope: 'gameplay' }
      )
    );
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (let index = 0; index < this.unsubscribers.length; index += 1) {
      this.unsubscribers[index]?.();
    }
    this.unsubscribers.length = 0;
    this.started = false;
  }

  private nextTick(): number {
    return this.getCurrentTick() + 1;
  }

  private requestReset(eligibleFromTick: number): void {
    if (this.lifecycleRequests === null) {
      this.inbox.requestReset(eligibleFromTick);
      return;
    }
    this.lifecycleRequests.requestReset(eligibleFromTick);
  }

  private requestCycleContinue(eligibleFromTick: number): void {
    if (this.lifecycleRequests === null) {
      this.inbox.requestCycleContinue(eligibleFromTick);
      return;
    }
    this.lifecycleRequests.requestCycleContinue(eligibleFromTick);
  }
}
