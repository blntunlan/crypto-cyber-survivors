/**
 * Stat Registry
 *
 * Centralized definition for all player stats.
 * Used to derive types, defaults, and UI configurations.
 */

export interface StatDefinition {
  id: string; // matches Player[key]
  label: string; // UI Label
  description: string;
  defaultValue: number;
  cap?: number; // Max value cap
  minValue?: number; // Min value limit
  isPercentage: boolean; // 0.05 -> 5%
  isInverse?: boolean; // Lower is better (e.g. fireRate)
  uiColor?: string; // Tailwind class
  showInKernel?: boolean; // Show in main UI
  category: 'combat' | 'defense' | 'movement' | 'economy';
}

export const STAT_DEFINITIONS = {
  // COMBAT
  baseDamage: {
    id: 'baseDamage',
    label: 'DMG',
    description: 'Base damage per projectile',
    defaultValue: 25,
    isPercentage: false,
    uiColor: 'text-white',
    showInKernel: true,
    category: 'combat',
  },
  fireRate: {
    id: 'fireRate',
    label: 'A/S', // Attack Speed
    description: 'Milliseconds between shots (lower is faster)',
    defaultValue: 400,
    cap: 50, // Minimum ms (fastest speed)
    isPercentage: false,
    isInverse: true, // Lower is better
    uiColor: 'text-orange-400',
    showInKernel: true,
    category: 'combat',
  },
  critChance: {
    id: 'critChance',
    label: 'Crit',
    description: 'Chance to deal double damage',
    defaultValue: 0.05,
    cap: 0.95,
    isPercentage: true,
    uiColor: 'text-yellow-400',
    showInKernel: true,
    category: 'combat',
  },
  critDamage: {
    id: 'critDamage',
    label: 'Crit Dmg',
    description: 'Damage multiplier for critical hits',
    defaultValue: 2.0,
    isPercentage: false, // Usually displayed as x2.0
    showInKernel: false, // Usually hidden or secondary
    category: 'combat',
  },
  area: {
    id: 'area',
    label: 'Area',
    description: 'Projectile size multiplier',
    defaultValue: 1.0,
    cap: 3.0,
    isPercentage: false, // Displayed as x1.0
    uiColor: 'text-cyan-400',
    showInKernel: true,
    category: 'combat',
  },
  projectiles: {
    id: 'projectiles',
    label: 'Proj',
    description: 'Number of projectiles fired at once',
    defaultValue: 1,
    cap: 8,
    isPercentage: false,
    showInKernel: false, // Often visual enough not to need UI
    category: 'combat',
  },

  // DEFENSE
  hp: {
    id: 'hp',
    label: 'HP',
    description: 'Current Health Points',
    defaultValue: 100,
    minValue: 1, // Prevent death from stat changes
    isPercentage: false,
    showInKernel: false, // Handled by HP bar usually
    category: 'defense',
  },
  maxHp: {
    id: 'maxHp',
    label: 'Max HP',
    description: 'Maximum Health Points',
    defaultValue: 100,
    minValue: 10, // Minimum floor for max HP
    isPercentage: false,
    showInKernel: false,
    category: 'defense',
  },
  armor: {
    id: 'armor',
    label: 'Armor',
    description: 'Damage reduction',
    defaultValue: 0,
    cap: 15, // ~75% reduction
    isPercentage: false,
    uiColor: 'text-slate-300',
    showInKernel: true,
    category: 'defense',
  },
  regen: {
    id: 'regen',
    label: 'Regen',
    description: 'HP recovered per second',
    defaultValue: 0,
    isPercentage: false,
    showInKernel: false,
    category: 'defense',
  },
  dodge: {
    id: 'dodge',
    label: 'Dodge',
    description: 'Chance to completely avoid damage',
    defaultValue: 0,
    cap: 0.5,
    isPercentage: true,
    uiColor: 'text-indigo-400',
    showInKernel: false, // Maybe add later to UI
    category: 'defense',
  },

  // MOVEMENT
  speed: {
    id: 'speed',
    label: 'SPD',
    description: 'Movement speed',
    defaultValue: 5,
    cap: 15,
    isPercentage: false,
    uiColor: 'text-blue-400',
    showInKernel: true,
    category: 'movement',
  },

  // ECONOMY / UTILITY
  luck: {
    id: 'luck',
    label: 'Luck',
    description: 'Affects gem drops and quality',
    defaultValue: 0,
    cap: 20,
    isPercentage: false,
    uiColor: 'text-green-400',
    showInKernel: true,
    category: 'economy',
  },
  lifesteal: {
    id: 'lifesteal',
    label: 'Vamp',
    description: 'Chance to heal 1HP on kill',
    defaultValue: 0,
    cap: 0.5,
    isPercentage: true,
    uiColor: 'text-red-400',
    showInKernel: true,
    category: 'economy',
  },
  magnet: {
    id: 'magnet',
    label: 'Magnet',
    description: 'Experience gem collection range',
    defaultValue: 0,
    cap: 300,
    isPercentage: false,
    uiColor: 'text-purple-400',
    showInKernel: true,
    category: 'economy',
  },
} as const;

export type StatKey = keyof typeof STAT_DEFINITIONS;
