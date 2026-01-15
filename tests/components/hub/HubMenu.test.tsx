/**
 * Hub Menu Component Tests
 *
 * Verifies the main navigation hub, including button rendering,
 * badge counts from various services, and grid-based keyboard navigation.
 */
import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HubMenu } from '../../../components/hub/HubMenu';
import { audio } from '../../../services/AudioService';

// Mock Services
vi.mock('../../../services/lootbox', () => ({
  LootboxService: {
    getTotalUnopenedCount: vi.fn().mockReturnValue(5),
  },
}));

vi.mock('../../../services/inventory', () => ({
  InventoryService: {
    getConsumables: vi.fn().mockReturnValue([{}, {}, {}]),
    getEquippedSkin: vi.fn().mockReturnValue('default'),
  },
}));

vi.mock('../../../services/AudioService', () => ({
  audio: {
    playButton: vi.fn(),
  },
}));

/**
 * Main test suite for the Hub Menu navigation.
 */
describe('HubMenu', () => {
  const mockOnNavigate = vi.fn();
  const mockNickname = 'Test Survivor';
  const mockCoins = 1500;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with all 6 buttons', () => {
    render(
      <HubMenu nickname={mockNickname} coins={mockCoins} onNavigate={mockOnNavigate} />
    );

    expect(screen.getByText('PLAY')).toBeInTheDocument();
    expect(screen.getByText('STASH')).toBeInTheDocument();
    expect(screen.getByText('LOOT')).toBeInTheDocument();
    expect(screen.getByText('SKINS')).toBeInTheDocument();
    expect(screen.getByText('RANKS')).toBeInTheDocument();
    expect(screen.getByText('GEAR')).toBeInTheDocument();
  });

  it('displays correct counts for items and lootboxes', () => {
    render(
      <HubMenu nickname={mockNickname} coins={mockCoins} onNavigate={mockOnNavigate} />
    );

    // Loot subtitle check
    expect(screen.getByText('Open Crates!')).toBeInTheDocument();
    // Stash subtitle check (Items: 3)
    expect(screen.getByText('Items: 3')).toBeInTheDocument();
  });

  it('navigates to PLAY when play button is clicked', () => {
    render(
      <HubMenu nickname={mockNickname} coins={mockCoins} onNavigate={mockOnNavigate} />
    );

    const playBtn = screen.getByText('PLAY').closest('button');
    if (playBtn) fireEvent.click(playBtn);

    expect(mockOnNavigate).toHaveBeenCalledWith('play');
    expect(audio.playButton).toHaveBeenCalled();
  });

  it('handles keyboard navigation (Arrow keys)', () => {
    render(
      <HubMenu nickname={mockNickname} coins={mockCoins} onNavigate={mockOnNavigate} />
    );

    // Grid layout is 2 columns:
    // [0: PLAY]    [1: STASH*]
    // [2: LOOT*]   [3: SKINS*]
    // [4: RANKS*]  [5: GEAR]
    // * = disabled buttons that won't trigger onNavigate

    // Navigate to GEAR (index 5) which is enabled:
    // From PLAY (0): ArrowRight -> STASH (1), ArrowDown -> SKINS (3),
    // ArrowDown -> GEAR (5)
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockOnNavigate).toHaveBeenCalledWith('gear');
  });
});
