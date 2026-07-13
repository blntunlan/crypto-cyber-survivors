import { type MarketRegime } from '../contracts';
import { ENCOUNTER_COST_UNITS } from './EnemyCostCatalog';

export const ADVANTAGE_MECHANICS = [
  'MOMENTUM_WINDOW',
  'LIQUIDITY_DROP',
  'GREEN_LANE',
  'ALPHA_ENCOUNTER',
] as const;

export type AdvantageMechanic = (typeof ADVANTAGE_MECHANICS)[number];

export type AdvantageCard = {
  mechanic: AdvantageMechanic;
  costCredits: number;
  durationSeconds: number;
  cooldownSeconds: number;
  eligibleRegimes: readonly MarketRegime[];
  movementMultiplier: number;
  dashCooldownMultiplier: number;
  grantsToken: false;
};

export const ADVANTAGE_CARD_CATALOG: readonly AdvantageCard[] = [
  {
    mechanic: 'MOMENTUM_WINDOW',
    costCredits: ENCOUNTER_COST_UNITS.support,
    durationSeconds: 8,
    cooldownSeconds: 45,
    eligibleRegimes: ['BULL_TREND', 'BEAR_TREND', 'SQUEEZE'],
    movementMultiplier: 1.1,
    dashCooldownMultiplier: 0.9,
    grantsToken: false,
  },
  {
    mechanic: 'LIQUIDITY_DROP',
    costCredits: ENCOUNTER_COST_UNITS.support,
    durationSeconds: 1,
    cooldownSeconds: 40,
    eligibleRegimes: ['CALM', 'VOLATILE'],
    movementMultiplier: 1,
    dashCooldownMultiplier: 1,
    grantsToken: false,
  },
  {
    mechanic: 'GREEN_LANE',
    costCredits: ENCOUNTER_COST_UNITS.support,
    durationSeconds: 6,
    cooldownSeconds: 45,
    eligibleRegimes: ['VOLATILE', 'PANIC', 'SQUEEZE'],
    movementMultiplier: 1,
    dashCooldownMultiplier: 1,
    grantsToken: false,
  },
  {
    mechanic: 'ALPHA_ENCOUNTER',
    costCredits: ENCOUNTER_COST_UNITS.alpha,
    durationSeconds: 15,
    cooldownSeconds: 75,
    eligibleRegimes: ['BULL_TREND', 'BEAR_TREND', 'PANIC', 'SQUEEZE'],
    movementMultiplier: 1,
    dashCooldownMultiplier: 1,
    grantsToken: false,
  },
];
