import { type MarketEventFamily } from '../contracts';
import {
  ENCOUNTER_COST_UNITS,
  type EncounterStatMultipliers,
} from './EnemyCostCatalog';

export const ENCOUNTER_ROLES = ['PRIMARY', 'SUPPORT'] as const;

export type EncounterRole = (typeof ENCOUNTER_ROLES)[number];

export type EncounterCard = {
  id: string;
  family: MarketEventFamily;
  role: EncounterRole;
  costUnits: number;
  statModifiers: EncounterStatMultipliers;
};

export const ENCOUNTER_CARD_CATALOG: readonly EncounterCard[] = [
  {
    id: 'BREAKOUT_PURSUER',
    family: 'BREAKOUT',
    role: 'PRIMARY',
    costUnits: ENCOUNTER_COST_UNITS.primary,
    statModifiers: {
      healthMultiplier: 1.1,
      damageMultiplier: 1,
      speedMultiplier: 1.15,
      spawnDensityMultiplier: 1,
    },
  },
  {
    id: 'BREAKOUT_FLANK',
    family: 'BREAKOUT',
    role: 'SUPPORT',
    costUnits: ENCOUNTER_COST_UNITS.support,
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1.1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1,
    },
  },
  {
    id: 'VOLUME_DENSE_WAVE',
    family: 'VOLUME_SURGE',
    role: 'PRIMARY',
    costUnits: ENCOUNTER_COST_UNITS.primary,
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1.1,
      spawnDensityMultiplier: 1.25,
    },
  },
  {
    id: 'VOLUME_ELITE_WAVE',
    family: 'VOLUME_SURGE',
    role: 'PRIMARY',
    costUnits: ENCOUNTER_COST_UNITS.primary,
    statModifiers: {
      healthMultiplier: 1.15,
      damageMultiplier: 1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1.2,
    },
  },
  {
    id: 'VOLUME_FLANK_SUPPORT',
    family: 'VOLUME_SURGE',
    role: 'SUPPORT',
    costUnits: ENCOUNTER_COST_UNITS.support,
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1.1,
    },
  },
  {
    id: 'VOLATILITY_DASH',
    family: 'VOLATILITY_SPIKE',
    role: 'PRIMARY',
    costUnits: ENCOUNTER_COST_UNITS.primary,
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1.1,
      speedMultiplier: 1.25,
      spawnDensityMultiplier: 1,
    },
  },
  {
    id: 'VOLATILITY_HAZARD',
    family: 'VOLATILITY_SPIKE',
    role: 'SUPPORT',
    costUnits: ENCOUNTER_COST_UNITS.support,
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1.1,
    },
  },
  {
    id: 'SQUEEZE_GAUNTLET',
    family: 'SQUEEZE_RELEASE',
    role: 'PRIMARY',
    costUnits: ENCOUNTER_COST_UNITS.primary,
    statModifiers: {
      healthMultiplier: 1.1,
      damageMultiplier: 1,
      speedMultiplier: 1.15,
      spawnDensityMultiplier: 1,
    },
  },
  {
    id: 'SQUEEZE_HAZARD',
    family: 'SQUEEZE_RELEASE',
    role: 'SUPPORT',
    costUnits: ENCOUNTER_COST_UNITS.support,
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1.1,
    },
  },
  {
    id: 'PANIC_ELITE_SWARM',
    family: 'PANIC_CRASH',
    role: 'PRIMARY',
    costUnits: ENCOUNTER_COST_UNITS.primary,
    statModifiers: {
      healthMultiplier: 1.2,
      damageMultiplier: 1.15,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1,
    },
  },
  {
    id: 'PANIC_VISIBILITY_PRESSURE',
    family: 'PANIC_CRASH',
    role: 'SUPPORT',
    costUnits: ENCOUNTER_COST_UNITS.support,
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1.1,
    },
  },
  {
    id: 'WHALE_GUARDIAN',
    family: 'WHALE_EVENT',
    role: 'PRIMARY',
    costUnits: ENCOUNTER_COST_UNITS.primary,
    statModifiers: {
      healthMultiplier: 1.2,
      damageMultiplier: 1.1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1,
    },
  },
  {
    id: 'WHALE_ORBIT',
    family: 'WHALE_EVENT',
    role: 'SUPPORT',
    costUnits: ENCOUNTER_COST_UNITS.support,
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1.1,
      spawnDensityMultiplier: 1,
    },
  },
];
