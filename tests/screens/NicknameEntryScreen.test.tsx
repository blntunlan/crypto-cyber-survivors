/**
 * Nickname Entry Screen Tests
 *
 * Covers the survivor identification flow including validation,
 * API interaction (mocked), and session completion.
 */
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NicknameEntryScreen } from '../../components/screens/NicknameEntryScreen';
import { useUser } from '../../contexts/useUser';
import { audio } from '../../services/audio';

// Mock dependencies
vi.mock('../../contexts/useUser', () => ({
  useUser: vi.fn(),
}));

vi.mock('../../services/audio', () => ({
  audio: {
    playLevelUp: vi.fn(),
    playHit: vi.fn(),
    playButton: vi.fn(),
    playKeystroke: vi.fn(),
  },
}));

/**
 * Main test suite for NicknameEntryScreen.
 */
describe('NicknameEntryScreen', () => {
  const mockOnComplete = vi.fn();
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUser as any).mockReturnValue({
      login: mockLogin,
    });
  });

  it('renders the screen correctly', () => {
    render(<NicknameEntryScreen onComplete={mockOnComplete} />);
    expect(
      screen.getByText(/common.nickname_screen.title_identify/i)
    ).toBeInTheDocument();
    // Use getAllByText for 'Survivor' or target the specific header one
    expect(screen.getByText(/Beta Access Protocol/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('common.nickname_screen.placeholder')
    ).toBeInTheDocument();
  });

  it('shows error for invalid nicknames', async () => {
    render(<NicknameEntryScreen onComplete={mockOnComplete} />);

    const input = screen.getByPlaceholderText('common.nickname_screen.placeholder');
    const submitBtn = screen.getByRole('button', {
      name: 'common.nickname_screen.enter_arena',
    });

    // Use a value that is long enough (enabled button) but invalid (contains space)
    fireEvent.change(input, { target: { value: 'a b' } });
    fireEvent.click(submitBtn);

    const errorElements = await screen.findAllByText(
      /Only letters, numbers, and underscores/i
    );
    expect(errorElements.length).toBeGreaterThan(0);
    expect(errorElements[0]).toBeInTheDocument();
    expect(audio.playHit).toHaveBeenCalled();
  });

  it('successfully logs in and calls onComplete', async () => {
    mockLogin.mockResolvedValue({ success: true });

    render(<NicknameEntryScreen onComplete={mockOnComplete} />);

    const input = screen.getByPlaceholderText('common.nickname_screen.placeholder');
    fireEvent.change(input, { target: { value: 'TopTrader' } });

    const submitBtn = screen.getByRole('button', {
      name: 'common.nickname_screen.enter_arena',
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('TopTrader');
      expect(mockOnComplete).toHaveBeenCalledWith('TopTrader');
    });
  });

  it('displays error if login fails', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Nickname taken' });

    render(<NicknameEntryScreen onComplete={mockOnComplete} />);

    const input = screen.getByPlaceholderText('common.nickname_screen.placeholder');
    fireEvent.change(input, { target: { value: 'TakenName' } });

    const submitBtn = screen.getByRole('button', {
      name: 'common.nickname_screen.enter_arena',
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Nickname taken/i);
      expect(errorElements.length).toBeGreaterThan(0);
      expect(errorElements[0]).toBeInTheDocument();
      expect(audio.playHit).toHaveBeenCalled();
    });
  });
});
