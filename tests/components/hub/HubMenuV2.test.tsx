/**
 * HubMenuV2 - snapshot parity + basic interaction tests.
 */

import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HubMenuV2 } from '../../../components/hub/HubMenuV2';
import { audio } from '../../../services/audio';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SUPPORTED_LANGUAGES: [{ code: 'en', name: 'English', flag: '🇺🇸' }],
}));

vi.mock('../../../services/lootbox', () => ({
  LootboxService: {
    getTotalUnopenedCount: vi.fn().mockReturnValue(2),
  },
}));

vi.mock('../../../services/inventory', () => ({
  InventoryService: {
    getConsumables: vi.fn().mockReturnValue([{}, {}]),
    getEquippedSkin: vi.fn().mockReturnValue('default'),
  },
}));

vi.mock('../../../services/audio', () => ({
  audio: {
    playButton: vi.fn(),
    playSelectionTick: vi.fn(),
  },
}));

describe('HubMenuV2', () => {
  const mockOnNavigate = vi.fn();
  const mockNickname = 'Pilot';
  const mockCoins = 4200;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all hub buttons', () => {
    render(
      <HubMenuV2 nickname={mockNickname} coins={mockCoins} onNavigate={mockOnNavigate} />
    );

    expect(screen.getAllByText('hub.play').length).toBeGreaterThan(0);
    expect(screen.getAllByText('hub.stash').length).toBeGreaterThan(0);
    expect(screen.getAllByText('hub.loot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('hub.skins').length).toBeGreaterThan(0);
    expect(screen.getAllByText('hub.ranks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('hub.gear').length).toBeGreaterThan(0);
  });

  it('emits navigation when enabled tile clicked', () => {
    render(
      <HubMenuV2 nickname={mockNickname} coins={mockCoins} onNavigate={mockOnNavigate} />
    );

    fireEvent.click(screen.getByText('hub.play'));
    expect(mockOnNavigate).toHaveBeenCalledWith('play');
    expect(audio.playButton).toHaveBeenCalled();
  });
});
