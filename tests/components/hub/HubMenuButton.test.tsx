import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { HubMenuButton } from '../../../components/hub/HubMenuButton';

let isRetro = false;

vi.mock('../../../contexts/useTheme', () => ({
  useTheme: () => ({
    isRetro,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('HubMenuButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRetro = false;
  });

  it('renders content and badge', () => {
    render(
      <HubMenuButton
        id="play"
        icon={<span>🎮</span>}
        title="Play"
        subtitle="Start run"
        badge={3}
        accentColor="#22d3ee"
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Start run')).toBeInTheDocument();
    expect(screen.getByText('🎮')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    render(
      <HubMenuButton
        id="play"
        icon={<span>🎮</span>}
        title="Play"
        accentColor="#22d3ee"
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows retro selected indicator', () => {
    isRetro = true;
    render(
      <HubMenuButton
        id="play"
        icon={<span>🎮</span>}
        title="Play"
        accentColor="#22d3ee"
        isSelected
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('prevents click when disabled', () => {
    const onClick = vi.fn();
    render(
      <HubMenuButton
        id="play"
        icon={<span>🎮</span>}
        title="Play"
        accentColor="#22d3ee"
        disabled
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
