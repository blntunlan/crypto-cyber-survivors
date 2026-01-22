/**
 * VolumeFactor - Increases difficulty based on market participants (Volume + Whales)
 */
export function calculateVolumeFactor({
  normalizedVolume,
  whaleTier,
}: {
  normalizedVolume: number;
  whaleTier: 0 | 1 | 2 | 3;
}): number {
  // Base volume multiplier (0.0 volume = 1.0x, 1.0 volume = 1.5x)
  const baseVolumeMod = 1.0 + (normalizedVolume || 0) * 0.5;

  // Whale multiplier
  const whaleMods = [1.0, 1.1, 1.25, 1.5];
  const whaleMod = whaleMods[whaleTier] ?? 1.0;

  return baseVolumeMod * whaleMod; // Max 2.25x
}
