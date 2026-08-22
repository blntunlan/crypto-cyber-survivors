/**
 * The upgrade choices a paused level-up can resolve.
 *
 * The list stays small and explicit until V2-104 replaces the fixed card with
 * the generated three-card offer; `CommandRecorder` validates against it so a
 * replay cannot carry a choice the runtime cannot apply.
 */
export const RUN_UPGRADE_CHOICE_IDS = [
  'starter-damage-2',
  'passive-move-speed',
] as const;

export type RunUpgradeChoiceId = (typeof RUN_UPGRADE_CHOICE_IDS)[number];

export const isRunUpgradeChoiceId = (value: unknown): value is RunUpgradeChoiceId =>
  RUN_UPGRADE_CHOICE_IDS.includes(value as RunUpgradeChoiceId);

export type RunCommand = Readonly<{
  tick: number;
  type: 'choose-upgrade';
  choiceId: RunUpgradeChoiceId;
}>;
