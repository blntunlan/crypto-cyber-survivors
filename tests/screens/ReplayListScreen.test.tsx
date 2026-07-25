import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../test-utils';
import { ReplayListScreen } from '../../components/screens/ReplayListScreen';

const { mockFetchMyReplays } = vi.hoisted(() => ({
  mockFetchMyReplays: vi.fn(),
}));

vi.mock('../../services/replay/ReplayPlayerService', () => ({
  ReplayPlayerService: {
    fetchMyReplays: mockFetchMyReplays,
  },
}));

describe('ReplayListScreen', () => {
  beforeEach(() => {
    mockFetchMyReplays.mockReset();
    mockFetchMyReplays.mockReturnValue(new Promise(() => {}));
  });

  it('uses the shared loading state panel while replays are loading', () => {
    render(<ReplayListScreen onBack={() => {}} onWatch={() => {}} />);

    expect(screen.getByRole('status')).toHaveAttribute(
      'data-ui-component',
      'state-panel'
    );
    expect(screen.getByText('common.menu_pages.replays.loading')).toBeInTheDocument();
  });
});
