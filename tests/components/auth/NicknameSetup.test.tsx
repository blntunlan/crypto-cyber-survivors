import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NicknameSetup } from '../../../components/auth/NicknameSetup';
import { useAuthStore } from '../../../stores/useAuthStore';
import { ProfileService } from '../../../services/profile/ProfileService';

// Mock ProfileService
vi.mock('../../../services/profile/ProfileService', () => ({
  ProfileService: {
    updateNickname: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('NicknameSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: '123' } as any,
      session: { user: { id: '123' } } as any,
      loading: false,
      error: null,
      authStage: 'NICKNAME_SETUP',
    });
  });

  it('should render the form', () => {
    render(<NicknameSetup />);
    expect(screen.getByText('Identity Protocol')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter alias...')).toBeInTheDocument();
    expect(screen.getByText('Initialize')).toBeInTheDocument();
  });

  it('should validate empty nickname', async () => {
    render(<NicknameSetup />);

    const submitButton = screen.getByText('Initialize');
    fireEvent.click(submitButton);

    expect(screen.getByText(/Nickname is required/)).toBeInTheDocument();
  });

  it('should validate short nickname', async () => {
    render(<NicknameSetup />);

    const input = screen.getByPlaceholderText('Enter alias...');
    fireEvent.change(input, { target: { value: 'Ab' } });

    const submitButton = screen.getByText('Initialize');
    fireEvent.click(submitButton);

    expect(
      screen.getByText(/Nickname must be at least 3 characters/)
    ).toBeInTheDocument();
  });

  it('should call ProfileService.updateNickname on valid submission', async () => {
    render(<NicknameSetup />);

    const input = screen.getByPlaceholderText('Enter alias...');
    fireEvent.change(input, { target: { value: 'Neo' } });

    const submitButton = screen.getByText('Initialize');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(ProfileService.updateNickname).toHaveBeenCalledWith('123', 'Neo');
    });
  });

  it('should update store stage to COMPLETE on success', async () => {
    (ProfileService.updateNickname as any).mockResolvedValue({
      id: '123',
      nickname: 'Neo',
    });

    render(<NicknameSetup />);

    const input = screen.getByPlaceholderText('Enter alias...');
    fireEvent.change(input, { target: { value: 'Neo' } });

    fireEvent.click(screen.getByText('Initialize'));

    await waitFor(() => {
      expect(useAuthStore.getState().authStage).toBe('COMPLETE');
    });
  });

  it('should handle API errors', async () => {
    (ProfileService.updateNickname as any).mockRejectedValue(
      new Error('Nickname taken')
    );

    render(<NicknameSetup />);

    const input = screen.getByPlaceholderText('Enter alias...');
    fireEvent.change(input, { target: { value: 'Neo' } });

    fireEvent.click(screen.getByText('Initialize'));

    await waitFor(() => {
      expect(screen.getByText(/Nickname taken/)).toBeInTheDocument();
    });
  });
});
