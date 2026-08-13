import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LevelUpFlash } from '../../../components/hud/LevelUpFlash';
import { screenService } from '../../../services/system/ScreenService';

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(),
    onChange: vi.fn(() => () => {}),
  },
}));

describe('LevelUpFlash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['desktop', false, '0.05'],
    ['mobile', true, '0.03'],
  ])(
    'uses a low-intensity themed edge cue instead of a white screen flash on %s',
    (_platform, isMobile, expectedOpacity) => {
      vi.mocked(screenService.isMobile).mockReturnValue(isMobile);

      const { container } = render(<LevelUpFlash intensity={1} />);

      const flash = container.firstElementChild;
      if (!(flash instanceof HTMLDivElement)) {
        throw new Error('Expected level-up cue to render as a div');
      }
      expect(flash.className).toContain('border-[var(--color-primary)]');
      expect(flash.className).not.toMatch(/bg-white|mix-blend-screen/);
      expect(flash).toHaveStyle(`opacity: ${expectedOpacity}`);
    }
  );
});
