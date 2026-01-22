import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PWAInstallPrompt from '../../../components/ui/PWAInstallPrompt';
import { LanguageProvider } from '../../../contexts/LanguageContext';

// Mock dependencies
const mockInstall = vi.fn();

// Mock the hook directly
vi.mock('../../../hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({
    canInstall: true,
    isInstalled: false,
    isPrompting: false,
    install: mockInstall,
  }),
}));

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing and shows up after delay', () => {
    render(
      <LanguageProvider>
        <PWAInstallPrompt />
      </LanguageProvider>
    );

    // Should not be visible initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Fast-forward time to show the prompt
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should be visible now
    expect(screen.queryByRole('dialog')).toBeInTheDocument();

    // Check for new text content that might be missing or causing issues
    expect(screen.getByText('pwa.installTitle')).toBeInTheDocument();
    expect(screen.getByText('pwa.installDescription')).toBeInTheDocument();
  });
});
