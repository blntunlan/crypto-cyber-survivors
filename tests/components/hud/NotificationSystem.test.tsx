import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '../../test-utils';
import { NotificationSystem } from '../../../components/hud/NotificationSystem';
import { EventBus } from '../../../services/core/EventBus';
import { renderCounts } from '../../../utils/trackRender';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock EventBus
vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('NotificationSystem', () => {
  let eventHandlers: Partial<Record<string, (data: any) => void>> = {};
  const originalDev = import.meta.env.DEV;

  beforeEach(() => {
    vi.useFakeTimers();
    eventHandlers = {};
    (EventBus.on as any).mockImplementation(
      (event: string, handler: (data: any) => void) => {
        eventHandlers[event] = handler;
        return () => {
          delete eventHandlers[event];
        };
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    (import.meta.env as any).DEV = originalDev;
  });

  const ensureHandler = async (event: string) => {
    const existingHandler = eventHandlers[event];
    if (existingHandler) return;
    await act(async () => {
      await Promise.resolve();
    });
    if (!eventHandlers[event]) {
      throw new Error(`No handler registered for ${event}`);
    }
  };

  const emitEvent = async (event: string, payload?: any) => {
    await ensureHandler(event);
    await act(async () => {
      eventHandlers[event]?.(payload);
      await Promise.resolve();
    });
  };

  it('renders nothing initially', () => {
    render(<NotificationSystem />);
    const container = document.querySelector('.notification-system-container');
    expect(container).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not rerender when its parent rerenders without notification changes', async () => {
    const Parent = () => {
      const [count, setCount] = React.useState(0);
      return (
        <>
          <button onClick={() => setCount(value => value + 1)}>Parent {count}</button>
          <NotificationSystem />
        </>
      );
    };

    renderCounts.delete('NotificationSystem');
    render(<Parent />);
    await act(async () => {
      await Promise.resolve();
    });
    const initialRenders = renderCounts.get('NotificationSystem') ?? 0;
    const parentButton = screen.getByText('Parent 0');

    await act(async () => {
      fireEvent.click(parentButton);
      await Promise.resolve();
    });

    expect(renderCounts.get('NotificationSystem')).toBe(initialRenders);
  });

  it('responds to gameNotification events', async () => {
    render(<NotificationSystem />);

    await emitEvent('gameNotification', {
      title: 'Test Notification',
      message: 'This is a test message',
      type: 'success',
    });

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('renders interactive notifications as non-opaque rails', async () => {
    render(<NotificationSystem />);

    await emitEvent('gameNotification', {
      title: 'Rail Notice',
      message: 'Readable without a card surface',
      type: 'success',
    });

    const rail = screen.getByTestId('hud-event-rail');
    expect(rail).toHaveAttribute('data-hud-tone', 'positive');
    expect(rail).not.toHaveClass('bg-black');
    expect(rail).not.toHaveClass('backdrop-blur');
    expect(screen.getByRole('button', { name: '×' })).toBeEnabled();
  });

  it('responds to rsiStateChanged events', async () => {
    render(<NotificationSystem />);

    await emitEvent('rsiStateChanged', { state: 'OVERSOLD', rsi: 25.5 });

    // In test environment, it might show the i18n key or a mock translation
    // From logs it seems it shows "hud.announcer.oversold"
    expect(screen.getByText(/oversold/i)).toBeInTheDocument();
    // Message should be there too
    expect(screen.getByText(/rsi_message/i)).toBeInTheDocument();
  });

  it('does not subscribe to removed whaleTierChanged notifications', async () => {
    render(<NotificationSystem />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(eventHandlers.whaleTierChanged).toBeUndefined();
  });

  it('removes notification after duration', async () => {
    render(<NotificationSystem />);

    await emitEvent('gameNotification', {
      title: 'Temporary',
      message: 'Bye bye',
      duration: 1000,
    });

    expect(screen.getByText('Temporary')).toBeInTheDocument();

    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
  });

  it('removes notification when close button is clicked', async () => {
    render(<NotificationSystem />);

    await emitEvent('gameNotification', {
      title: 'Closable',
      message: 'Click me',
    });

    expect(screen.getByText('Closable')).toBeInTheDocument();

    const closeButton = screen.getByText('×');

    await act(async () => {
      fireEvent.click(closeButton);
      await Promise.resolve();
    });

    expect(screen.queryByText('Closable')).not.toBeInTheDocument();
  });

  it('supports multiple notifications at once', async () => {
    render(<NotificationSystem />);

    await emitEvent('gameNotification', { title: 'First', message: '1' });
    await emitEvent('gameNotification', { title: 'Second', message: '2' });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('gates warning/error notifications outside dev mode', async () => {
    (import.meta.env as any).DEV = false;
    render(<NotificationSystem />);

    await emitEvent('gameNotification', {
      title: 'Warn Title',
      message: 'Warn msg',
      type: 'warning',
    });
    expect(screen.queryByText('Warn Title')).not.toBeInTheDocument();

    await emitEvent('gameNotification', {
      title: 'Info Title',
      message: 'Info msg',
      type: 'info',
    });
    expect(screen.getByText('Info Title')).toBeInTheDocument();

    (import.meta.env as any).DEV = true;
    await emitEvent('gameNotification', {
      title: 'Dev Warn',
      message: 'Dev warn msg',
      type: 'warning',
    });
    expect(screen.getByText('Dev Warn')).toBeInTheDocument();
  });

  const getCardCount = () => document.querySelectorAll('.notification-card').length;

  it('only shows market micro-events in dev mode and deduplicates repeats', async () => {
    (import.meta.env as any).DEV = false;
    render(<NotificationSystem />);

    await emitEvent('gameMarketEvent', {
      type: 'FLASH_CRASH',
      intensity: 1,
      durationMs: 2000,
    });
    expect(getCardCount()).toBe(0);

    (import.meta.env as any).DEV = true;
    await emitEvent('gameMarketEvent', {
      type: 'FLASH_CRASH',
      intensity: 1,
      durationMs: 2000,
    });
    await emitEvent('gameMarketEvent', {
      type: 'FLASH_CRASH',
      intensity: 1,
      durationMs: 2000,
    });
    expect(getCardCount()).toBe(1);
  });

  it('caps visible notifications to prevent render storms', async () => {
    render(<NotificationSystem />);

    for (let i = 0; i < 6; i += 1) {
      await emitEvent('gameNotification', {
        title: `Notice ${i}`,
        message: `Message ${i}`,
        type: 'info',
      });
    }

    expect(getCardCount()).toBe(5);
    expect(screen.queryByText('Notice 0')).not.toBeInTheDocument();
    expect(screen.getByText('Notice 5')).toBeInTheDocument();
  });

  it('clears notifications immediately on game reset', async () => {
    (import.meta.env as any).DEV = true;
    render(<NotificationSystem />);

    await emitEvent('gameNotification', {
      title: 'Save Complete',
      message: 'All good',
    });
    await emitEvent('rsiStateChanged', { state: 'OVERSOLD', rsi: 20 });
    await emitEvent('gameMarketEvent', {
      type: 'FLASH_CRASH',
      intensity: 1,
      durationMs: 2000,
    });
    expect(screen.getByText('Save Complete')).toBeInTheDocument();
    expect(screen.getByText(/hud\.announcer\.oversold/i)).toBeInTheDocument();
    expect(screen.getByText('hud.announcer.flash_crash')).toBeInTheDocument();

    await emitEvent('gameReset');
    expect(screen.queryByText('Save Complete')).not.toBeInTheDocument();
    expect(screen.queryByText(/hud\.announcer\.oversold/i)).not.toBeInTheDocument();
    expect(screen.queryByText('hud.announcer.flash_crash')).not.toBeInTheDocument();
  });
});
