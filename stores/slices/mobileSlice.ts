import { type StateCreator } from 'zustand';
import {
  type MobileControlSettings,
  DEFAULT_MOBILE_SETTINGS,
} from '../../types/MobileSettings';

export interface MobileActions {
  setMobileSetting: <K extends keyof MobileControlSettings>(
    key: K,
    value: MobileControlSettings[K]
  ) => void;
}

export interface MobileSlice extends MobileActions {
  mobile: MobileControlSettings;
}

export const createMobileSlice: StateCreator<MobileSlice> = (set) => ({
  mobile: DEFAULT_MOBILE_SETTINGS,

  setMobileSetting: (key, value) =>
    set((state) => ({
      mobile: { ...state.mobile, [key]: value },
    })),
});
