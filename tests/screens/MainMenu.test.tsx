import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { MainMenu } from '../../components/screens/MainMenu';
import { GameMode } from '../../types/gameMode';

// Mock audio
vi.mock('../../services/AudioService', () => ({
  audio: {
    playSelectionTick: vi.fn(),
    playPairSelect: vi.fn(),
    playButton: vi.fn(),
    playLevelUp: vi.fn(),
  },
}));

describe('MainMenu', () => {
  const defaultProps = {
    price: 50000,
    onStart: vi.fn(),
    onOpenSettings: vi.fn(),
    selectedPair: 'BTC' as const,
    onPairChange: vi.fn(),
    selectedMode: GameMode.CASUAL,
    onModeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderMainMenu = (props = defaultProps) => {
    return render(<MainMenu {...props} />);
  };

  it('should render price when available', () => {
    renderMainMenu();
    expect(screen.getByText(/\$50,000/)).toBeInTheDocument();
  });

  it('should render connecting status when price is 0', () => {
    renderMainMenu({ ...defaultProps, price: 0 });
    expect(screen.getByText('common.menu.connecting')).toBeInTheDocument();
  });

  it('should call onModeChange when switching modes', () => {
    renderMainMenu();
    const compButton = screen.getByText('common.modes.competitive_name');
    fireEvent.click(compButton);
    expect(defaultProps.onModeChange).toHaveBeenCalledWith(GameMode.COMPETITIVE);
  });

  it('should call onStart when Long/Short buttons are clicked', () => {
    renderMainMenu();
    const longButton = screen.getByText('common.long');
    fireEvent.click(longButton);
    expect(defaultProps.onStart).toHaveBeenCalledWith('LONG', expect.any(Number));
  });

  it('should disable start buttons when price is 0', () => {
    renderMainMenu({ ...defaultProps, price: 0 });
    const longButton = screen.getByRole('button', { name: /common\.long/i });
    expect(longButton).toBeDisabled();
  });

  it('should call onOpenSettings when settings button clicked', () => {
    renderMainMenu();
    const settingsButton = screen.getByText('common.settings');
    fireEvent.click(settingsButton);
    expect(defaultProps.onOpenSettings).toHaveBeenCalled();
  });

  it('should change leverage when a leverage button is clicked', () => {
    renderMainMenu();
    // Select 2x leverage
    const lev2Button = screen.getByText('2x');
    fireEvent.click(lev2Button);

    // Check if label updates (SAFE for 2x)
    expect(screen.getByText('common.menu.lev_safe')).toBeInTheDocument();
  });

  it('should call onPairChange when an asset is clicked', () => {
    renderMainMenu();
    // Find ETH button in CryptoSelector
    // CRYPTO_PAIRS[ETH].symbol is ETH
    const ethButton = screen.getByText('ETH');
    fireEvent.click(ethButton);
    expect(defaultProps.onPairChange).toHaveBeenCalledWith('ETH');
  });

  it('should handle keyboard navigation (ArrowDown/ArrowUp)', () => {
    renderMainMenu();

    // Initial active row is 0 (Game Mode)
    // Press ArrowDown 4 times to reach Settings (Row 4)
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // 1: Assets
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // 2: Leverage
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // 3: Actions
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // 4: Settings

    // Press Enter to open settings
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(defaultProps.onOpenSettings).toHaveBeenCalled();
  });

  it('should handle horizontal navigation (ArrowRight/ArrowLeft)', () => {
    renderMainMenu();

    // Row 0: Game Mode. Press ArrowRight to cycle.
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(defaultProps.onModeChange).toHaveBeenCalled();

    // Move to Actions (Row 3)
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    // Action col 0 is LONG. ArrowRight -> SHORT
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(defaultProps.onStart).toHaveBeenCalledWith('SHORT', expect.any(Number));
  });

  it('should render correctly on mobile', () => {
    // Mock mobile device
    vi.mock('../../hooks/useDevice', () => ({
      useDevice: () => ({ isMobile: true, isTablet: false }),
    }));

    renderMainMenu();
    // Mobile might have different class or smaller text, but same functionality
    expect(screen.getByText('common.menu.sentiment_engine')).toBeInTheDocument();
  });

  it('should select different leverage multipliers', () => {
    renderMainMenu();

    const leverage100 = screen.getByText('100x');
    fireEvent.click(leverage100);
    // There are multiple "DEGEN" / "SPOT" labels (button and description)
    expect(screen.getAllByText('common.menu.lev_degen').length).toBeGreaterThan(0);

    const leverage1 = screen.getAllByText('common.menu.lev_spot')[0]!;
    fireEvent.click(leverage1);
    expect(screen.getAllByText('common.menu.lev_spot').length).toBeGreaterThan(0);
  });
});
