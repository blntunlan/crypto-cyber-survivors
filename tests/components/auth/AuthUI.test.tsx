import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthInput } from '../../../components/auth/ui/AuthInput';
import { AuthButton } from '../../../components/auth/ui/AuthButton';
import { AuthCard } from '../../../components/auth/ui/AuthCard';

describe('Auth UI Components', () => {
  describe('AuthInput', () => {
    it('should render correctly', () => {
      render(<AuthInput placeholder="Enter email" />);
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });

    it('should handle value changes', () => {
      const handleChange = vi.fn();
      render(<AuthInput placeholder="Email" onChange={handleChange} />);

      const input = screen.getByPlaceholderText('Email');
      fireEvent.change(input, { target: { value: 'test@test.com' } });

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('AuthButton', () => {
    it('should render children', () => {
      render(<AuthButton>Sign In</AuthButton>);
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(<AuthButton loading>Sign In</AuthButton>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle clicks', () => {
      const handleClick = vi.fn();
      render(<AuthButton onClick={handleClick}>Sign In</AuthButton>);

      fireEvent.click(screen.getByText('Sign In'));
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('AuthCard', () => {
    it('should render children', () => {
      render(
        <AuthCard title="Welcome">
          <div>Content</div>
        </AuthCard>
      );

      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
