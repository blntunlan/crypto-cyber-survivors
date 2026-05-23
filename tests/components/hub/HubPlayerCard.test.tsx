import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { HubPlayerCard } from '../../../components/hub/HubPlayerCard';

let isRetro = false;

vi.mock('../../../contexts/useTheme', () => ({
  useTheme: () => ({
    isRetro,
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('HubPlayerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRetro = false;
  });

  const baseProps = {
    nickname: 'Test Survivor',
    coins: 15320,
    cryptoBalance: {
      btc: 0.123456,
      eth: 1.25,
      sol: 10.5,
    },
    equippedSkin: 'default' as any,
  };

  it('renders nickname and formatted balances', () => {
    render(<HubPlayerCard {...baseProps} />);

    expect(screen.getByText('Test Survivor')).toBeInTheDocument();
    expect(screen.getByText('15.3K')).toBeInTheDocument();
    expect(screen.getByText('₿0.123456')).toBeInTheDocument();
    expect(screen.getByText('Ξ1.2500')).toBeInTheDocument();
    expect(screen.getByText('◎10.50')).toBeInTheDocument();
  });

  it('hides crypto row when all balances are zero', () => {
    render(<HubPlayerCard {...baseProps} cryptoBalance={{ btc: 0, eth: 0, sol: 0 }} />);

    expect(screen.queryByText(/₿/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ξ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/◎/)).not.toBeInTheDocument();
  });

  it('calls onAvatarClick when avatar is clicked', () => {
    const onAvatarClick = vi.fn();
    const { container } = render(
      <HubPlayerCard {...baseProps} onAvatarClick={onAvatarClick} />
    );

    const avatar = container.querySelector('[class*="h-14"][class*="w-14"]');
    expect(avatar).toBeInTheDocument();

    fireEvent.click(avatar as Element);
    expect(onAvatarClick).toHaveBeenCalledTimes(1);
  });

  it('applies retro panel variant in retro theme', () => {
    isRetro = true;
    const { container } = render(<HubPlayerCard {...baseProps} />);
    expect(container.firstChild).toHaveClass('rounded-none');
    expect(container.firstChild).toHaveClass('border-2');
  });
});
