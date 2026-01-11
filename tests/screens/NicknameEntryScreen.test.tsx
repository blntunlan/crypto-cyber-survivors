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
import { audio } from '../../services/AudioService';

// Mock dependencies
vi.mock('../../contexts/useUser', () => ({
  useUser: vi.fn(),
}));

vi.mock('../../services/AudioService', () => ({
  audio: {
    playLevelUp: vi.fn(),
    playHit: vi.fn(),
    playButton: vi.fn(),
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
    expect(screen.getByText(/Identify/i)).toBeInTheDocument();
    // Use getAllByText for 'Survivor' or target the specific header one
    expect(screen.getByText(/Beta Access Protocol/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your nickname.../i)).toBeInTheDocument();
  });

  it('shows error for invalid nicknames', async () => {
    render(<NicknameEntryScreen onComplete={mockOnComplete} />);

    const input = screen.getByPlaceholderText(/Enter your nickname.../i);
    const submitBtn = screen.getByRole('button', { name: /Enter the Arena/i });

    // Use a value that is long enough (enabled button) but invalid (contains space)
    fireEvent.change(input, { target: { value: 'a b' } });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Only letters, numbers, and underscores/i)
    ).toBeInTheDocument();
    expect(audio.playHit).toHaveBeenCalled();
  });

  it('successfully logs in and calls onComplete', async () => {
    mockLogin.mockResolvedValue({ success: true });

    render(<NicknameEntryScreen onComplete={mockOnComplete} />);

    const input = screen.getByPlaceholderText(/Enter your nickname.../i);
    fireEvent.change(input, { target: { value: 'TopTrader' } });

    const submitBtn = screen.getByRole('button', { name: /Enter the Arena/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('TopTrader');
      expect(mockOnComplete).toHaveBeenCalledWith('TopTrader');
    });
  });

  it('displays error if login fails', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Nickname taken' });

    render(<NicknameEntryScreen onComplete={mockOnComplete} />);

    const input = screen.getByPlaceholderText(/Enter your nickname.../i);
    fireEvent.change(input, { target: { value: 'TakenName' } });

    const submitBtn = screen.getByRole('button', { name: /Enter the Arena/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Nickname taken/i)).toBeInTheDocument();
      expect(audio.playHit).toHaveBeenCalled();
    });
  });
});
