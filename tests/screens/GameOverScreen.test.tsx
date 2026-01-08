import { render, screen, fireEvent } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameOverScreen } from '../../components/screens/GameOverScreen';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    h2: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <h2 {...props}>{children}</h2>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
    button: ({
      children,
      onClick,
      ...props
    }: React.PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('GameOverScreen', () => {
  const defaultProps = {
    level: 10,
    finalPnl: 0.5,
    survivalTime: 120,
    kills: 50,
    onRestart: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render level and final pnl', () => {
    render(<GameOverScreen {...defaultProps} />);
    // Multiple L10 elements may exist (stat + career best)
    expect(screen.getAllByText(/L10/)).toBeDefined();
    expect(screen.getByText('50.0%')).toBeDefined();
  });

  it('should render survival time and kills', () => {
    render(<GameOverScreen {...defaultProps} />);
    expect(screen.getByText('2:00')).toBeDefined(); // 120 seconds = 2:00
    expect(screen.getByText('50')).toBeDefined(); // kills
  });

  it('should call onRestart when button is clicked', () => {
    const onRestart = vi.fn();
    render(<GameOverScreen {...defaultProps} onRestart={onRestart} />);

    fireEvent.click(screen.getByText(/Back to Terminal/i));
    expect(onRestart).toHaveBeenCalled();
  });

  it('should show career stats section', () => {
    render(<GameOverScreen {...defaultProps} />);
    expect(screen.getByText('Career Stats')).toBeDefined();
  });
});
