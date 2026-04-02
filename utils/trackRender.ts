/**
 * DEV-only render tracking utility.
 * Used with DevPerformanceOverlay to count component renders.
 */

export const renderCounts = new Map<string, number>();
export let totalRenders = 0;
export let rendersSinceLastCheck = 0;
export let lastRenderCheckTime = performance.now();

export function resetRenderCheck() {
  const now = performance.now();
  const elapsed = (now - lastRenderCheckTime) / 1000;
  const rps = elapsed > 0 ? rendersSinceLastCheck / elapsed : 0;
  lastRenderCheckTime = now;
  rendersSinceLastCheck = 0;
  return rps;
}

export function trackRender(componentName: string) {
  if (!import.meta.env.DEV) return;
  const count = (renderCounts.get(componentName) ?? 0) + 1;
  renderCounts.set(componentName, count);
  totalRenders++;
  rendersSinceLastCheck++;

  // Warn on excessive renders for a single component
  if (count > 0 && count % 100 === 0) {
    console.warn(`[PERF] ${componentName} has rendered ${count} times`);
  }
}
