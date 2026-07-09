import { render, screen } from '../../test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClutchAnnouncement } from '../../../components/hud/ClutchAnnouncement';
import { screenService } from '../../../services/system/ScreenService';
import { useIsRetro } from '../../../contexts/useTheme';

// Mock services and hooks
vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(),
  },
}));

vi.mock('../../../hooks/useResponsiveUI', () => ({
  useResponsiveUI: () => ({
    rs: (val: number) => val,
    rfs: (val: number) => val,
  }),
}));

vi.mock('../../../contexts/useTheme', () => ({
  useIsRetro: vi.fn(),
}));

describe('ClutchAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render anything when active is false', () => {
    vi.mocked(screenService.isMobile).mockReturnValue(false);
    vi.mocked(useIsRetro).mockReturnValue(false);
    const { container } = render(<ClutchAnnouncement active={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render "CLUTCH!" on Desktop when active is true', () => {
    vi.mocked(screenService.isMobile).mockReturnValue(false);
    vi.mocked(useIsRetro).mockReturnValue(false);
    render(<ClutchAnnouncement active={true} />);
    expect(screen.getByText('hud.clutch')).toBeInTheDocument();
  });

  it('renders modern clutch feedback as a danger event rail', () => {
    vi.mocked(screenService.isMobile).mockReturnValue(false);
    vi.mocked(useIsRetro).mockReturnValue(false);
    render(<ClutchAnnouncement active={true} />);

    const rail = screen.getByTestId('hud-event-rail');
    expect(rail).toHaveAttribute('data-hud-tone', 'danger');
    expect(rail).not.toHaveClass('bg-gradient-to-r');
  });

  it('should render "CLUTCH!" and "RECOVERED" on Mobile when active is true', () => {
    vi.mocked(screenService.isMobile).mockReturnValue(true);
    vi.mocked(useIsRetro).mockReturnValue(false);
    render(<ClutchAnnouncement active={true} />);
    expect(screen.getByText('hud.clutch')).toBeInTheDocument();
    expect(screen.getByText('hud.recovered')).toBeInTheDocument();
  });

  it('should apply retro styles when isRetro is true', () => {
    vi.mocked(screenService.isMobile).mockReturnValue(false);
    vi.mocked(useIsRetro).mockReturnValue(true);
    render(<ClutchAnnouncement active={true} />);

    // Desktop layout
    const element = screen.getByText('hud.clutch').parentElement;
    expect(element).toHaveClass('border-4');
    expect(element).toHaveClass('rounded-none');
    expect(element).not.toHaveClass('bg-gradient-to-r');
  });

  it('should apply modern rail styles when isRetro is false', () => {
    vi.mocked(screenService.isMobile).mockReturnValue(false);
    vi.mocked(useIsRetro).mockReturnValue(false);
    render(<ClutchAnnouncement active={true} />);

    // Desktop layout
    const element = screen.getByText('hud.clutch').closest('[data-hud-tone]');
    expect(element).toHaveAttribute('data-hud-tone', 'danger');
    expect(element).not.toHaveClass('bg-gradient-to-r');
  });
});
