import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';

export type StepContext = {
  tick: number;
  deltaSeconds: number;
  intent: Readonly<PlayerIntent>;
};
