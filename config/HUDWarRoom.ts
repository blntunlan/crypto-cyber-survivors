export const HUD_WAR_ROOM = {
  colors: {
    gold: '#D6B85C',
    crimson: '#B22222',
    mint: '#6EE7B7',
    dangerText: '#FF7777',
    value: '#F8FAFC',
    muted: '#AEB5C1',
  },
  textShadow: '0 2px 3px rgba(0,0,0,.9)',
  hp: {
    maxWidth: 222,
    height: 8,
    criticalThreshold: 35,
  },
  operatorStatIds: ['baseDamage', 'speed', 'critChance'] as const,
} as const;

export type HudRailTone = 'gold' | 'danger' | 'positive' | 'neutral';
