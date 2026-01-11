import { describe, it, expect } from 'vitest';
import {
  getHUDLayout,
  DESKTOP_LAYOUT,
  MOBILE_LAYOUT,
  TABLET_LAYOUT,
} from '../config/UILayout';

describe('UILayout', () => {
  it('should return DESKTOP_LAYOUT for desktop platform', () => {
    expect(getHUDLayout('desktop')).toEqual(DESKTOP_LAYOUT);
  });

  it('should return MOBILE_LAYOUT for mobile platform', () => {
    expect(getHUDLayout('mobile')).toEqual(MOBILE_LAYOUT);
  });

  it('should return TABLET_LAYOUT for tablet platform', () => {
    expect(getHUDLayout('tablet')).toEqual(TABLET_LAYOUT);
  });

  it('should return DESKTOP_LAYOUT as default for unknown platform', () => {
    expect(getHUDLayout('unknown' as unknown as 'desktop')).toEqual(DESKTOP_LAYOUT);
  });

  describe('Layout Properties', () => {
    it('should have globalScale defined in all layouts', () => {
      expect(DESKTOP_LAYOUT.globalScale).toBeDefined();
      expect(MOBILE_LAYOUT.globalScale).toBeDefined();
      expect(TABLET_LAYOUT.globalScale).toBeDefined();
    });

    it('should have waveTimer element config in all layouts', () => {
      expect(DESKTOP_LAYOUT.elements.waveTimer).toBeDefined();
      expect(MOBILE_LAYOUT.elements.waveTimer).toBeDefined();
      expect(TABLET_LAYOUT.elements.waveTimer).toBeDefined();
    });

    it('should have compact positioning on mobile', () => {
      expect(MOBILE_LAYOUT.positioning).toBe('compact');
    });
  });
});
