import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { SettingsPanel } from '../../components/settings/SettingsPanel';

// Mock framer-motion
vi.mock('framer-motion', () => {
  return {
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
      header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
      aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('SettingsPanel', () => {
  const defaultProps = {
    onClose: vi.fn(),
    isInGame: false,
    onReplayTutorial: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings title', () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByText('settings.title')).toBeDefined();
  });

  it('should call onClose when close button clicked', () => {
    render(<SettingsPanel {...defaultProps} />);
    // Find close button by text or aria label
    // From common.json: "close": "Close"
    const closeBtn = screen.getByText('settings.close');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should switch categories when sidebar buttons clicked', () => {
    render(<SettingsPanel {...defaultProps} />);

    // Find a category button, e.g., Audio
    const audioBtn = screen.getByText('settings.audio');
    fireEvent.click(audioBtn);

    // Check if category content changed (e.g., Master Volume appears)
    expect(screen.getByText('settings.master_volume')).toBeDefined();
  });

  it('should show replay tutorial button when not in game', () => {
    render(<SettingsPanel {...defaultProps} isInGame={false} />);
    expect(screen.getByText(/tutorial.replay/i)).toBeDefined();
  });

  it('should NOT show replay tutorial button when in game', () => {
    render(<SettingsPanel {...defaultProps} isInGame={true} />);
    expect(screen.queryByText('tutorial.replay')).toBeNull();
  });
});
