import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../test-utils';
import { LandingFaq } from '../../components/screens/landing/LandingFaq';

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe('LandingFaq', () => {
  it('exposes accordion state and the controlled answer region', () => {
    render(<LandingFaq />);

    const trigger = screen.getByRole('button', {
      name: 'Does the live price actually change the run, or is it just a skin?',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'faq-panel-0');
    expect(document.getElementById('faq-panel-0')).not.toBeVisible();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const region = screen.getByRole('region', { name: trigger.textContent });
    expect(region).not.toHaveAttribute('hidden');
    expect(region).toHaveTextContent(/RSI, ATR and volume are computed server-side/i);
  });
});
