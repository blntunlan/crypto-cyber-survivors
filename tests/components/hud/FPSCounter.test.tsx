import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test-utils';
import { FPSCounter } from '../../../components/hud/FPSCounter';
import { screenService } from '../../../services/system/ScreenService';
import { EventBus } from '../../../services/core/EventBus';

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
    onChange: vi.fn(() => vi.fn()),
  },
}));

describe('FPSCounter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial placeholder and updates on fpsUpdated', () => {
    render(<FPSCounter />);
    expect(screen.getByText('-- FPS')).toBeInTheDocument();

    act(() => {
      EventBus.emit('fpsUpdated', { avgFps: 58 });
    });

    expect(screen.getByText('58 FPS')).toBeInTheDocument();
  });

  it('renders mobile variant when screen is mobile', () => {
    // @ts-expect-error testing mock
    screenService.isMobile.mockReturnValue(true);
    render(<FPSCounter />);

    const el = screen.getByText('-- FPS');
    expect(el).toHaveClass('text-[8px]');
  });
});
