import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import { CryptoSelector } from '../../../components/ui/CryptoSelector';

describe('CryptoSelector', () => {
  it('renders readable asset cards and preserves pair selection', () => {
    const onSelect = vi.fn();

    const { container } = render(<CryptoSelector selected="BTC" onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(3);
    expect(buttons.map(button => button.textContent)).toEqual(['BTC', 'ETH', 'SOL']);
    expect(buttons.every(button => button.dataset.uiVariant === 'asset')).toBe(true);
    expect(screen.getByRole('button', { name: 'BTC' })).toHaveAttribute(
      'data-ui-selected',
      'true'
    );
    expect(container.querySelectorAll('[data-asset-label]')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'ETH' }));

    expect(onSelect).toHaveBeenCalledWith('ETH');
  });
});
