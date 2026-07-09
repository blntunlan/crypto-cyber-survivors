import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import { ReplayOverlay } from '../../../components/hud/ReplayOverlay';

vi.mock('../../../services/replay/ReplayPlayerService', () => ({
  ReplayPlayerService: {
    getReplay: vi.fn(() => null),
    setSpeed: vi.fn(),
  },
}));

describe('ReplayOverlay', () => {
  it('uses the compact War Room utility rail', () => {
    render(<ReplayOverlay onExit={vi.fn()} />);

    expect(screen.getByTestId('replay-overlay')).toHaveAttribute(
      'data-overlay-priority',
      'utility'
    );
  });
});
