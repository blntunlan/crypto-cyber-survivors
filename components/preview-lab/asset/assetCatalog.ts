import { type AssetPreviewEntry } from '../../../types/previewLab';
import { ENEMY_DEFINITIONS } from '../../../config/EnemyRegistry';
import { COLORS } from '../../../config/Colors';

const BOSS_IDS: ReadonlySet<string> = new Set([
  'market_maker',
  'gatekeeper',
  '51_attack',
]);

function resolveEnemyColor(
  def: (typeof ENEMY_DEFINITIONS)[string],
  position: 'LONG' | 'SHORT'
): string {
  const preserveIdentity = def.id === 'fud' || def.id === 'whale';
  if (preserveIdentity) return def.color;
  if (def.id === 'liquidator' || def.id === 'pumpdump') {
    return position === 'LONG' ? COLORS.DUMP_ORANGE : COLORS.PUMP_GREEN;
  }
  return position === 'LONG' ? COLORS.SHORT : COLORS.LONG;
}

function buildEnemyEntries(): AssetPreviewEntry[] {
  const entries: AssetPreviewEntry[] = [];
  for (const def of Object.values(ENEMY_DEFINITIONS)) {
    const isBoss = BOSS_IDS.has(def.id);
    entries.push({
      id: `enemy-${def.id}`,
      kind: 'enemy',
      category: 'enemy',
      label: labelize(def.id),
      description: def.description,
      radius: def.radius,
      color: def.color,
      isBoss,
      isOppositeColor: def.isOppositeColor,
      preserveIdentity: def.id === 'fud' || def.id === 'whale',
      stats: {
        baseHealth: def.baseHealth,
        baseSpeed: def.baseSpeed,
        baseDamage: def.baseDamage,
        spawnWeight: def.spawnWeight,
        combatRole: def.combatRole,
      },
    });
  }
  return entries;
}

function labelize(id: string): string {
  if (id === '51_attack') return '51% Attack';
  return id
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const PLAYER_ENTRY: AssetPreviewEntry = {
  id: 'player-default',
  kind: 'player',
  category: 'player',
  label: 'Player',
  description:
    'The survivor. Color flips with market position (LONG green / SHORT red).',
  radius: 12,
  color: COLORS.LONG,
};

export const ASSET_CATALOG: ReadonlyArray<AssetPreviewEntry> = [
  PLAYER_ENTRY,
  ...buildEnemyEntries(),
];

export function resolveEntryColor(
  entry: AssetPreviewEntry,
  position: 'LONG' | 'SHORT'
): string {
  if (entry.kind === 'player') {
    return position === 'LONG' ? COLORS.LONG : COLORS.SHORT;
  }
  const enemyId = entry.id.replace('enemy-', '');
  const def = ENEMY_DEFINITIONS[enemyId];
  if (!def) return entry.color;
  return resolveEnemyColor(def, position);
}

export const ASSET_CATEGORIES: ReadonlyArray<'all' | 'player' | 'enemy'> = [
  'all',
  'player',
  'enemy',
];
