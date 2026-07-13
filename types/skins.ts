/**
 * Skin Types - Character skin visual system
 *
 * Describes how an equipped cosmetic skin maps onto the player render
 * pipeline. Ownership/equip state lives in InventoryService and the
 * cosmetics store; these types only describe visuals.
 *
 * Identity metadata (name, icon, rarity, unlock method) stays in
 * CHARACTER_SKIN_DEFINITIONS (types/inventory.ts).
 */

import { type CharacterSkinId } from './lootbox';

/**
 * Per-layer color overrides for a skin.
 *
 * Every field must be a 6-digit hex color (`#RRGGBB`) because renderers
 * append alpha suffixes (e.g. `${color}25` for gradients).
 *
 * A missing field falls back to the live market-position color
 * (green LONG / red SHORT) — the "leveraged position" signal must stay
 * readable no matter which skin is equipped.
 */
export type SkinVisualDefinition = {
  /** Main body fill. */
  bodyColor?: string;
  /** Dash trail fill. */
  trailColor?: string;
  /** shadowBlur + radial glow field around the body. */
  glowColor?: string;
  /** Dash halo rings and idle pulse ring. */
  accentColor?: string;
  /** Inner core highlight (defaults to white). */
  coreColor?: string;
  /** Crisp edge/outline ring (defaults to white). */
  outlineColor?: string;
};

/**
 * Fully resolved, renderer-ready visual set.
 *
 * SkinService keeps a single pre-allocated instance and mutates it in
 * place when the skin or position color changes — do not retain or copy
 * it per frame (zero-alloc RAF contract).
 */
export type ResolvedSkinVisuals = {
  skinId: CharacterSkinId;
  bodyColor: string;
  trailColor: string;
  glowColor: string;
  accentColor: string;
  coreColor: string;
  outlineColor: string;
};
