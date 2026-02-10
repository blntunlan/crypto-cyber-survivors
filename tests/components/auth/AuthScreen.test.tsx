import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthScreen } from '../../../components/auth/AuthScreen';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AuthService } from '../../../services/auth/AuthService';

// Mock dependencies
vi.mock('../../../services/auth/AuthService', () => ({
  AuthService: {
    signInWithOtp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    verifyOtp: vi.fn(),
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      session: null,
      loading: false,
      error: null,
      authStage: 'LOGIN',
    });
  });

  it('should render login options tabs', () => {
    render(<AuthScreen />);
    expect(screen.getByText('Email Code (OTP)')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('should switch between OTP and Password tabs', () => {
    render(<AuthScreen />);

    // Default is OTP
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Enter your password')
    ).not.toBeInTheDocument();

    // Switch to Password
    fireEvent.click(screen.getByText('Password'));
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();

    // Switch back
    fireEvent.click(screen.getByText('Email Code (OTP)'));
    expect(
      screen.queryByPlaceholderText('Enter your password')
    ).not.toBeInTheDocument();
  });

  it('should call AuthService.signInWithOtp when submitting OTP form', async () => {
    render(<AuthScreen />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByText('Send Magic Code');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(AuthService.signInWithOtp).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('should call AuthService.signInWithPassword when submitting Password form', async () => {
    render(<AuthScreen />);
    fireEvent.click(screen.getByText('Password'));

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(AuthService.signInWithPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });
  });

  it('should show OTP verification input when stage is OTP_VERIFY', () => {
    useAuthStore.setState({ authStage: 'OTP_VERIFY' });
    render(<AuthScreen />);

    expect(screen.getByText('Verify Code')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument();
  });

  it('should display error message from store', () => {
    useAuthStore.setState({ error: 'Invalid credentials' });
    render(<AuthScreen />);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});
