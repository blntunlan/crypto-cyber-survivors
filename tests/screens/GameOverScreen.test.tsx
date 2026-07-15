import { render, screen, fireEvent } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameOverScreen } from '../../components/screens/GameOverScreen';
import { ComboSystem } from '../../services/combat/ComboSystem';

const themeState = vi.hoisted(() => ({ isRetro: false }));

vi.mock('../../contexts/useTheme', () => ({
  useIsRetro: () => themeState.isRetro,
  useTheme: () => ({ isRetro: themeState.isRetro }),
}));

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
    h1: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...props
    }: any) => <h1 {...props}>{children}</h1>,
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
    themeState.isRetro = false;
    vi.spyOn(ComboSystem, 'getMaxStreak').mockReturnValue(36);
  });

  it('renders the approved liquidation hierarchy in semantic order', () => {
    render(<GameOverScreen {...defaultProps} />);

    const heading = screen.getByTestId('liquidation-heading');
    const pnl = screen.getByTestId('liquidation-pnl');
    const runStats = screen.getByTestId('liquidation-run-stats');
    const reward = screen.getByTestId('liquidation-reward');
    const career = screen.getByTestId('liquidation-career');
    const action = screen.getByTestId('liquidation-primary-action');

    expect(screen.getByTestId('overlay-chrome-surface')).toHaveAttribute(
      'data-overlay-priority',
      'decision'
    );
    expect(screen.getByTestId('liquidation-result')).toContainElement(heading);
    expect(heading).toHaveTextContent('common.game_over_screen.liquidated');
    expect(pnl).toHaveTextContent('50.00%');
    expect(runStats).toHaveTextContent('2:00');
    expect(runStats).toHaveTextContent('50');
    expect(runStats).toHaveTextContent('36');
    expect(heading.compareDocumentPosition(pnl)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(pnl.compareDocumentPosition(runStats)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(runStats.compareDocumentPosition(reward)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(reward.compareDocumentPosition(career)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(career.compareDocumentPosition(action)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('hides the decorative decline trace from assistive technology', () => {
    render(<GameOverScreen {...defaultProps} />);
    expect(screen.getByTestId('liquidation-decline-trace')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('renders reward immediately and prefers verified coins', () => {
    const { rerender } = render(<GameOverScreen {...defaultProps} />);
    expect(screen.getByTestId('liquidation-reward-value')).not.toHaveTextContent('+0');

    rerender(<GameOverScreen {...defaultProps} coinsEarned={1234} />);
    expect(screen.getByTestId('liquidation-reward-value')).toHaveTextContent('+1,234');
  });

  it('keeps reward details collapsed until requested', () => {
    render(<GameOverScreen {...defaultProps} />);
    expect(
      screen.queryByTestId('liquidation-reward-breakdown')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByTestId('liquidation-reward-breakdown')).toBeVisible();
  });

  it('keeps required content in retro mode', () => {
    themeState.isRetro = true;
    render(<GameOverScreen {...defaultProps} />);
    expect(screen.getByTestId('liquidation-result')).toHaveAttribute(
      'data-liquidation-theme',
      'retro'
    );
    expect(screen.getByTestId('liquidation-heading')).toBeVisible();
    expect(screen.getByTestId('liquidation-primary-action')).toBeVisible();
  });

  it('calls onRestart from the primary action', () => {
    const onRestart = vi.fn();
    render(<GameOverScreen {...defaultProps} onRestart={onRestart} />);
    fireEvent.click(screen.getByTestId('liquidation-primary-action'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
