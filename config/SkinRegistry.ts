/**
 * SkinRegistry - Visual definitions for character skins
 *
 * Identity metadata (name, icon, rarity, unlock method) lives in
 * CHARACTER_SKIN_DEFINITIONS (types/inventory.ts); this registry owns the
 * render-facing palette consumed by SkinService / EntityRenderer.
 *
 * Rules:
 * - All colors must be 6-digit hex (#RRGGBB) — renderers append alpha
 *   suffixes (`${color}25`). Enforced by tests/config/SkinRegistry.test.ts.
 * - `trailColor` and `accentColor` stay unset on every skin so the dash
 *   trail and halo keep the market-position color (green LONG / red SHORT).
 *   The position signal is a design pillar; skins may not hide it.
 * - Omitted fields inherit the market-position color at runtime.
 */

import { type CharacterSkinId } from '../types/lootbox';
import { type SkinVisualDefinition } from '../types/skins';

export const DEFAULT_SKIN_ID: CharacterSkinId = 'default';

export const SKIN_VISUAL_REGISTRY: Record<CharacterSkinId, SkinVisualDefinition> = {
  // Cyber Trader — fully position-driven (the legacy player look).
  default: {},
  diamond_hands: {
    bodyColor: '#00BFFF',
    coreColor: '#E0FFFF',
  },
  whale_watcher: {
    bodyColor: '#1E90FF',
    coreColor: '#B0E2FF',
  },
  satoshi_ghost: {
    bodyColor: '#F7931A',
    glowColor: '#F7931A',
    coreColor: '#FFE0B2',
    outlineColor: '#FFF3E0',
  },
  vitalik_mode: {
    bodyColor: '#627EEA',
    glowColor: '#627EEA',
    coreColor: '#DDE4FF',
  },
  solana_sage: {
    bodyColor: '#9945FF',
    glowColor: '#9945FF',
    coreColor: '#14F195',
  },
  degen_ape: {
    bodyColor: '#8B4513',
    coreColor: '#FFD700',
  },
  laser_eyes: {
    bodyColor: '#FF4500',
    glowColor: '#FF4500',
    coreColor: '#FFD5C8',
  },
};
