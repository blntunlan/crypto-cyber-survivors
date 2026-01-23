import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { MarketDisconnectedScreen } from '../../components/screens/MarketDisconnectedScreen';

describe('MarketDisconnectedScreen', () => {
  it('should render correctly and handle back to menu', () => {
    const onBackToMenu = vi.fn();

    render(<MarketDisconnectedScreen onBackToMenu={onBackToMenu} />);

    expect(screen.getByText('!')).toBeInTheDocument();
    expect(screen.getByText('market.disconnected_title')).toBeInTheDocument();

    const backBtn = screen.getByText('market.exit_terminal');
    fireEvent.click(backBtn);
    expect(onBackToMenu).toHaveBeenCalled();
  });
});
