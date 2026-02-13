import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { UserAvatar } from '../../../components/ui/UserAvatar';

describe('UserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fallback initials when avatarUrl is missing', () => {
    render(<UserAvatar displayName="Satoshi Nakamoto" />);
    expect(screen.getByText('SN')).toBeInTheDocument();
  });

  it('renders provider badge when enabled', () => {
    const { container } = render(
      <UserAvatar
        displayName="Ada Lovelace"
        provider="google"
        showProviderBadge
      />
    );

    expect(container.querySelector('[title="Signed in with google"]')).toBeInTheDocument();
  });

  it('shows online status indicator', () => {
    const { container } = render(<UserAvatar displayName="Ada Lovelace" isOnline />);
    expect(container.querySelector('[title="Online"]')).toBeInTheDocument();
  });

  it('falls back to initials when image fails', () => {
    render(<UserAvatar displayName="Vitalik Buterin" avatarUrl="https://x/y.png" />);
    const image = screen.getByRole('img', { name: 'Vitalik Buterin' });

    fireEvent.error(image);
    expect(screen.getByText('VB')).toBeInTheDocument();
  });

  it('acts as button when onClick is provided', () => {
    const onClick = vi.fn();
    render(<UserAvatar displayName="Linus Torvalds" onClick={onClick} />);

    const buttonLike = screen.getByRole('button');
    fireEvent.click(buttonLike);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
