import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';

type GameV2LifecycleCommand =
  | { type: 'start' }
  | { type: 'pauseForLevelUp' }
  | { type: 'resumeFromLevelUp' }
  | { type: 'endRun' }
  | { type: 'reset' }
  | { type: 'dispose' };

export class GameV2Lifecycle {
  private currentPhase: GameV2Phase = 'idle';

  private currentSessionEpoch = 0;

  public get phase(): GameV2Phase {
    return this.currentPhase;
  }

  public get sessionEpoch(): number {
    return this.currentSessionEpoch;
  }

  public start(): void {
    this.execute({ type: 'start' });
  }

  public pauseForLevelUp(): void {
    this.execute({ type: 'pauseForLevelUp' });
  }

  public resumeFromLevelUp(): void {
    this.execute({ type: 'resumeFromLevelUp' });
  }

  public endRun(): void {
    this.execute({ type: 'endRun' });
  }

  public reset(): void {
    this.execute({ type: 'reset' });
  }

  public dispose(): void {
    this.execute({ type: 'dispose' });
  }

  private execute(command: GameV2LifecycleCommand): void {
    if (this.currentPhase === 'disposed') {
      if (command.type === 'dispose') {
        return;
      }

      throw new Error(
        `Cannot execute "${command.type}" while in phase "${this.currentPhase}"`
      );
    }

    switch (command.type) {
      case 'start':
        if (this.currentPhase !== 'idle') {
          throw new Error(
            `Cannot execute "${command.type}" while in phase "${this.currentPhase}"`
          );
        }
        this.transition('playing');
        return;
      case 'pauseForLevelUp':
        if (this.currentPhase !== 'playing') {
          throw new Error(
            `Cannot execute "${command.type}" while in phase "${this.currentPhase}"`
          );
        }
        this.transition('level-up');
        return;
      case 'resumeFromLevelUp':
        if (this.currentPhase !== 'level-up') {
          throw new Error(
            `Cannot execute "${command.type}" while in phase "${this.currentPhase}"`
          );
        }
        this.transition('playing');
        return;
      case 'endRun':
        if (this.currentPhase !== 'playing') {
          throw new Error(
            `Cannot execute "${command.type}" while in phase "${this.currentPhase}"`
          );
        }
        this.transition('game-over');
        return;
      case 'reset':
        this.currentSessionEpoch += 1;
        this.transition('idle');
        return;
      case 'dispose':
        this.transition('disposed');
        return;
    }
  }

  private transition(next: GameV2Phase): void {
    this.currentPhase = next;
  }
}
