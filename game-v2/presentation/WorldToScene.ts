/**
 * The single owner of the simulation-to-scene axis mapping (V2-ADR-043).
 *
 * The simulation is a right-handed 2D plane where `+Y` is up. Three.js renders
 * it on the XZ plane under a camera that looks straight down with
 * `up = (0, 0, -1)`, which puts `-Z` at the top of the screen and keeps `+X` on
 * the right. Writing `worldY` straight into `z` therefore drew `+Y` downwards:
 * pressing `W` moved the player up in the simulation and down on screen.
 *
 * Negating here — rather than flipping the camera up vector, which would mirror
 * X instead, or flipping the input, which would make `+Y` mean "down" in the
 * simulation — keeps every authoritative value untouched, so no state hash,
 * recording, or replay is affected by the fix.
 */
export const sceneZOf = (worldY: number): number => -worldY;

/** The inverse mapping, for reading a scene position back as simulation space. */
export const worldYOf = (sceneZ: number): number => -sceneZ;
