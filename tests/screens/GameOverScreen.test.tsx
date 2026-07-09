import { render, screen, fireEvent } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameOverScreen } from '../../components/screens/GameOverScreen';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const motionMock = {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      transition: _transition,
      ...props
    }: any) => <div {...props}>{children}</div>,
    h2: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      transition: _transition,
      ...props
    }: any) => <h2 {...props}>{children}</h2>,
    span: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      transition: _transition,
      ...props
    }: any) => <span {...props}>{children}</span>,
    button: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      transition: _transition,
      ...props
    }: any) => <button {...props}>{children}</button>,
  };
  return {
    motion: motionMock,
    m: motionMock,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

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
    expect(screen.getByTestId('overlay-chrome-surface')).toHaveAttribute(
      'data-overlay-priority',
      'decision'
    );
    // Multiple L10 elements may exist (stat + career best)
    expect(screen.getAllByText(/L10/)).toBeDefined();
    expect(screen.getByText('50.00%')).toBeDefined();
  });

  it('should render survival time and kills', () => {
    render(<GameOverScreen {...defaultProps} />);
    expect(screen.getByText('2:00')).toBeDefined(); // 120 seconds = 2:00
    expect(screen.getByText('50')).toBeDefined(); // kills
  });

  it('should call onRestart when button is clicked', () => {
    const onRestart = vi.fn();
    render(<GameOverScreen {...defaultProps} onRestart={onRestart} />);

    fireEvent.click(screen.getByText('common.game_over_screen.back_to_menu'));
    expect(onRestart).toHaveBeenCalled();
  });

  it('should show career stats section', () => {
    render(<GameOverScreen {...defaultProps} />);
    expect(screen.getByText('common.game_over_screen.career_stats')).toBeDefined();
  });
});
