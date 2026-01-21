import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { KernelStatus } from '../../../components/hud/KernelStatus';
import { screenService } from '../../../services/ScreenService';

// Mock ScreenService
vi.mock('../../../services/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
    onChange: vi.fn(() => vi.fn()),
    getSafeAreaInsets: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  },
}));

describe('KernelStatus Component', () => {
  const mockPlayer = {
    level: 5,
    exp: 50,
    nextLevelExp: 100,
  } as any;

  const mockSmoothValues = {
    exp: 50,
    baseDamage: 10,
    speed: 5,
    fireRate: 1,
    luck: 0,
    lifesteal: 0,
    critChance: 0.1,
    magnet: 1,
    armor: 0,
    area: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop Layout', () => {
    it('should render level and status title', () => {
      // @ts-expect-error: testing
      screenService.isMobile.mockReturnValue(false);

      render(<KernelStatus player={mockPlayer} smoothValues={mockSmoothValues} />);

      expect(screen.getByText(/hud\.kernel_status/i)).toBeInTheDocument();
      expect(screen.getByText(/hud\.level_short.*5/i)).toBeInTheDocument();
    });

    it('should render stat rows for visible stats', () => {
      // @ts-expect-error: testing
      screenService.isMobile.mockReturnValue(false);
      render(<KernelStatus player={mockPlayer} smoothValues={mockSmoothValues} />);

      // Check for common stats defined in StatRegistry (using translation keys)
      expect(screen.getByText(/hud\.stat\.baseDamage/i)).toBeInTheDocument();
      expect(screen.getByText(/hud\.stat\.speed/i)).toBeInTheDocument();
    });
  });

  describe('Mobile Layout', () => {
    it('should render compact mobile view', () => {
      // @ts-expect-error: testing
      screenService.isMobile.mockReturnValue(true);

      render(<KernelStatus player={mockPlayer} smoothValues={mockSmoothValues} />);

      // Mobile view only shows Level number and short tag, no stats grid
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.queryByText(/hud\.stat\.baseDamage/i)).not.toBeInTheDocument();
    });
  });

  describe('Dynamic Scaling', () => {
    it('should calculate XP bar width correctly', () => {
      // @ts-expect-error: testing
      screenService.isMobile.mockReturnValue(false);
      const { container } = render(
        <KernelStatus
          player={{ ...mockPlayer, exp: 75, nextLevelExp: 100 }}
          smoothValues={{ ...mockSmoothValues, exp: 75 }}
        />
      );

      const xpBarFill = container.querySelector('.bg-blue-500');
      expect(xpBarFill).toHaveStyle('width: 75%');
    });
  });
});
