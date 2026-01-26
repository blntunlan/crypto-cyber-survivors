import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '../../test-utils';
import { NotificationSystem } from '../../../components/hud/NotificationSystem';
import { EventBus } from '../../../services/EventBus';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock EventBus
vi.mock('../../../services/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../../../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('NotificationSystem', () => {
  let eventHandlers: Record<string, (data: any) => void> = {};

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
  });

  it('renders nothing initially', () => {
    render(<NotificationSystem />);
    const container = document.querySelector('.notification-system-container');
    expect(container).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('responds to gameNotification events', async () => {
    render(<NotificationSystem />);

    const handler = eventHandlers['gameNotification'];

    await act(async () => {
      handler?.({
        title: 'Test Notification',
        message: 'This is a test message',
        type: 'success',
      });
    });

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('responds to rsiStateChanged events', async () => {
    render(<NotificationSystem />);

    const handler = eventHandlers['rsiStateChanged'];

    await act(async () => {
      handler?.({ state: 'OVERSOLD', rsi: 25.5 });
    });

    // In test environment, it might show the i18n key or a mock translation
    // From logs it seems it shows "hud.announcer.oversold"
    expect(screen.getByText(/oversold/i)).toBeInTheDocument();
    // Message should be there too
    expect(screen.getByText(/rsi_message/i)).toBeInTheDocument();
  });

  it('responds to whaleTierChanged events', async () => {
    render(<NotificationSystem />);

    const handler = eventHandlers['whaleTierChanged'];

    await act(async () => {
      handler?.({ tier: 2 }); // MEGA whale
    });

    // Should find the title with whale in it
    expect(screen.getAllByText(/whale/i).length).toBeGreaterThan(0);
  });

  it('removes notification after duration', async () => {
    render(<NotificationSystem />);

    const handler = eventHandlers['gameNotification'];

    await act(async () => {
      handler?.({
        title: 'Temporary',
        message: 'Bye bye',
        duration: 1000,
      });
    });

    expect(screen.getByText('Temporary')).toBeInTheDocument();

    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
  });

  it('removes notification when close button is clicked', async () => {
    render(<NotificationSystem />);

    const handler = eventHandlers['gameNotification'];

    await act(async () => {
      handler?.({
        title: 'Closable',
        message: 'Click me',
      });
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

    const handler = eventHandlers['gameNotification'];

    await act(async () => {
      handler?.({ title: 'First', message: '1' });
      handler?.({ title: 'Second', message: '2' });
    });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
