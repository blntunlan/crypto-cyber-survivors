import type { PhaseName } from '../services/gameplay/contracts';

export interface RuntimeDiagnosticsConfig {
  enabled: boolean;
  frameBufferSize: number;
  issueBufferSize: number;
  debugSignalBufferSize: number;
  recentFrameExportLimit: number;
  recentIssueExportLimit: number;
  recentDebugSignalExportLimit: number;
  exportMinFrameSamples: number;
  environmentSampleIntervalMs: number;
  memorySampleIntervalMs: number;
  slowFrameMs: number;
  stutterFrameMs: number;
  hitchFrameMs: number;
  lowGameWorkMs: number;
  highOtherFrameRatio: number;
  cadenceQuantizationToleranceMs: number;
  updateBudgetMs: number;
  renderBudgetMs: number;
  physicsBudgetMs: number;
  phaseBudgetMs: number;
  longTaskMs: number;
  memorySpikeMb: number;
  highEntityPressure: {
    enemies: number;
    bullets: number;
    particles: number;
    total: number;
  };
  compositorPressure: {
    motionElements: number;
    backdropFilterElements: number;
    domNodes: number;
    canvasMegapixels: number;
  };
}

export const RUNTIME_DIAGNOSTICS_PHASES: readonly PhaseName[] = [
  'difficulty',
  'input',
  'combat',
  'spawn',
  'physics',
  'effects',
  'portal',
  'metrics',
];

export const RUNTIME_DIAGNOSTICS_CONFIG: RuntimeDiagnosticsConfig = {
  enabled: true,
  frameBufferSize: 600,
  issueBufferSize: 80,
  debugSignalBufferSize: 120,
  recentFrameExportLimit: 120,
  recentIssueExportLimit: 30,
  recentDebugSignalExportLimit: 40,
  exportMinFrameSamples: 180,
  environmentSampleIntervalMs: 1000,
  memorySampleIntervalMs: 1000,
  slowFrameMs: 22,
  stutterFrameMs: 33.34,
  hitchFrameMs: 50,
  lowGameWorkMs: 5,
  highOtherFrameRatio: 0.75,
  cadenceQuantizationToleranceMs: 0.45,
  updateBudgetMs: 10,
  renderBudgetMs: 7,
  physicsBudgetMs: 4,
  phaseBudgetMs: 3,
  longTaskMs: 50,
  memorySpikeMb: 8,
  highEntityPressure: {
    enemies: 120,
    bullets: 220,
    particles: 420,
    total: 700,
  },
  compositorPressure: {
    motionElements: 30,
    backdropFilterElements: 1,
    domNodes: 2500,
    canvasMegapixels: 4,
  },
};

export function getRuntimeDiagnosticsConfig(): RuntimeDiagnosticsConfig {
  const config: RuntimeDiagnosticsConfig = {
    ...RUNTIME_DIAGNOSTICS_CONFIG,
    highEntityPressure: { ...RUNTIME_DIAGNOSTICS_CONFIG.highEntityPressure },
    compositorPressure: { ...RUNTIME_DIAGNOSTICS_CONFIG.compositorPressure },
  };

  if (import.meta.env.VITE_RUNTIME_DIAGNOSTICS_ENABLED !== undefined) {
    config.enabled = import.meta.env.VITE_RUNTIME_DIAGNOSTICS_ENABLED === 'true';
  }

  if (import.meta.env.VITE_RUNTIME_DIAGNOSTICS_FRAME_BUFFER) {
    const value = Number(import.meta.env.VITE_RUNTIME_DIAGNOSTICS_FRAME_BUFFER);
    if (Number.isFinite(value) && value >= 60) {
      config.frameBufferSize = Math.floor(value);
    }
  }

  return config;
}
