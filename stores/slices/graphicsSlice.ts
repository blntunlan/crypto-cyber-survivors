import { type StateCreator } from 'zustand';

export interface GraphicsSettings {
  showParticles: boolean;
  showScreenShake: boolean;
  showDamageNumbers: boolean;
  reducedMotion: boolean;
  hudScale: number;
  showFPS: boolean;
}

export const DEFAULT_GRAPHICS: GraphicsSettings = {
  showParticles: true,
  showScreenShake: true,
  showDamageNumbers: true,
  reducedMotion: false,
  hudScale: 1.0,
  showFPS: false,
};

export interface GraphicsActions {
  toggleParticles: () => void;
  toggleScreenShake: () => void;
  toggleDamageNumbers: () => void;
  toggleReducedMotion: () => void;
  setHudScale: (scale: number) => void;
  toggleFPS: () => void;
  setGraphicsSetting: <K extends keyof GraphicsSettings>(
    key: K,
    value: GraphicsSettings[K]
  ) => void;
}

export interface GraphicsSlice extends GraphicsActions {
  graphics: GraphicsSettings;
}

export const createGraphicsSlice: StateCreator<GraphicsSlice> = set => ({
  graphics: DEFAULT_GRAPHICS,

  toggleParticles: () =>
    set(state => ({
      graphics: { ...state.graphics, showParticles: !state.graphics.showParticles },
    })),

  toggleScreenShake: () =>
    set(state => ({
      graphics: {
        ...state.graphics,
        showScreenShake: !state.graphics.showScreenShake,
      },
    })),

  toggleDamageNumbers: () =>
    set(state => ({
      graphics: {
        ...state.graphics,
        showDamageNumbers: !state.graphics.showDamageNumbers,
      },
    })),

  toggleReducedMotion: () =>
    set(state => ({
      graphics: { ...state.graphics, reducedMotion: !state.graphics.reducedMotion },
    })),

  setHudScale: scale =>
    set(state => ({
      graphics: {
        ...state.graphics,
        hudScale: Math.max(0.5, Math.min(2.0, scale)),
      },
    })),

  toggleFPS: () =>
    set(state => ({
      graphics: { ...state.graphics, showFPS: !state.graphics.showFPS },
    })),

  setGraphicsSetting: (key, value) =>
    set(state => ({
      graphics: { ...state.graphics, [key]: value },
    })),
});
