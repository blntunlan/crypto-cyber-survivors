export type RuntimeDprSetting = number | 'native';

export type RuntimeDebugFlags = {
  noMotion: boolean;
  noBackdrop: boolean;
  noGlow: boolean;
  noBackgroundCandles: boolean;
  noScreenShake: boolean;
  runtimeDpr: RuntimeDprSetting;
};

export type RuntimeDebugSnapshot = RuntimeDebugFlags & {
  activeFlags: string[];
  resolvedCanvasDpr: number;
};

const RUNTIME_DPR_MIN = 0.5;
const RUNTIME_DPR_MAX = 3;

const DEFAULT_FLAGS: RuntimeDebugFlags = {
  noMotion: false,
  noBackdrop: false,
  noGlow: false,
  noBackgroundCandles: false,
  noScreenShake: false,
  runtimeDpr: 1,
};

const TRUE_VALUES = new Set(['', '1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function getSearchParams(search?: string | URLSearchParams): URLSearchParams {
  if (search instanceof URLSearchParams) {
    return search;
  }

  if (typeof search === 'string') {
    const normalized = search.startsWith('?') ? search.slice(1) : search;
    return new URLSearchParams(normalized);
  }

  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search);
  }

  return new URLSearchParams();
}

function firstParam(params: URLSearchParams, keys: readonly string[]): string | null {
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (!key || !params.has(key)) continue;
    return params.get(key);
  }
  return null;
}

function parseBooleanFlag(params: URLSearchParams, keys: readonly string[]): boolean {
  const raw = firstParam(params, keys);
  if (raw === null) return false;

  const normalized = raw.trim().toLowerCase();
  if (FALSE_VALUES.has(normalized)) return false;
  return TRUE_VALUES.has(normalized) || normalized.length > 0;
}

function parseRuntimeDpr(raw: string | null): RuntimeDprSetting {
  if (raw === null) return DEFAULT_FLAGS.runtimeDpr;

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'native' || normalized === 'device') {
    return 'native';
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_FLAGS.runtimeDpr;
  }

  return round(clamp(numeric, RUNTIME_DPR_MIN, RUNTIME_DPR_MAX));
}

export function getRuntimeDebugFlags(
  search?: string | URLSearchParams
): RuntimeDebugFlags {
  const params = getSearchParams(search);
  return {
    noMotion: parseBooleanFlag(params, [
      'noMotion',
      'runtimeNoMotion',
      'debugNoMotion',
    ]),
    noBackdrop: parseBooleanFlag(params, [
      'noBackdrop',
      'runtimeNoBackdrop',
      'debugNoBackdrop',
    ]),
    noGlow: parseBooleanFlag(params, ['noGlow', 'runtimeNoGlow', 'debugNoGlow']),
    noBackgroundCandles: parseBooleanFlag(params, [
      'noBackgroundCandles',
      'runtimeNoBackgroundCandles',
      'debugNoBackgroundCandles',
    ]),
    noScreenShake: parseBooleanFlag(params, [
      'noScreenShake',
      'runtimeNoScreenShake',
      'debugNoScreenShake',
    ]),
    runtimeDpr: parseRuntimeDpr(
      firstParam(params, ['runtimeDpr', 'canvasDpr', 'debugDpr'])
    ),
  };
}

export function resolveRuntimeCanvasDpr(
  flags: RuntimeDebugFlags = getRuntimeDebugFlags(),
  devicePixelRatio?: number
): number {
  const nativeDpr =
    devicePixelRatio ??
    (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

  if (flags.runtimeDpr === 'native') {
    return round(clamp(nativeDpr, RUNTIME_DPR_MIN, RUNTIME_DPR_MAX));
  }

  return round(clamp(flags.runtimeDpr, RUNTIME_DPR_MIN, RUNTIME_DPR_MAX));
}

export function getRuntimeDebugSnapshot(
  search?: string | URLSearchParams,
  devicePixelRatio?: number
): RuntimeDebugSnapshot {
  const flags = getRuntimeDebugFlags(search);
  const activeFlags: string[] = [];

  if (flags.noMotion) activeFlags.push('noMotion');
  if (flags.noBackdrop) activeFlags.push('noBackdrop');
  if (flags.noGlow) activeFlags.push('noGlow');
  if (flags.noBackgroundCandles) activeFlags.push('noBackgroundCandles');
  if (flags.noScreenShake) activeFlags.push('noScreenShake');
  if (flags.runtimeDpr !== DEFAULT_FLAGS.runtimeDpr) {
    activeFlags.push(`runtimeDpr:${flags.runtimeDpr}`);
  }

  return {
    ...flags,
    activeFlags,
    resolvedCanvasDpr: resolveRuntimeCanvasDpr(flags, devicePixelRatio),
  };
}

export function applyRuntimeDebugDocumentFlags(
  flags: RuntimeDebugFlags = getRuntimeDebugFlags()
): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.runtimeNoMotion = String(flags.noMotion);
  root.dataset.runtimeNoBackdrop = String(flags.noBackdrop);
  root.dataset.runtimeNoGlow = String(flags.noGlow);
  root.dataset.runtimeNoBackgroundCandles = String(flags.noBackgroundCandles);
  root.dataset.runtimeNoScreenShake = String(flags.noScreenShake);
  root.dataset.runtimeDpr = String(flags.runtimeDpr);
}
