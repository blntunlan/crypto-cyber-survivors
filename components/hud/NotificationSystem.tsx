import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventBus } from '../../services/core/EventBus';
import { useLanguage } from '../../contexts/LanguageContext';
import { Z_LAYERS } from '../../constants/ZIndex';
import './hud-animations.css';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'market';
  title: string;
  message: string;
  color: string;
  icon: string;
  duration?: number;
}

const text = (value: string | string[]): string =>
  Array.isArray(value) ? value.join(' ') : value;

export const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { t } = useLanguage();

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newNotification = { ...notification, id };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after specified duration or 5 seconds default
    const duration = notification.duration ?? 5000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);

    if (notification.type === 'error') {
      // Logic removed to prevent infinite loop.
      // Errors are already logged before reaching here via the Logger -> App -> Notification bridge.
    }
  }, []);

  const lastRSINotificationTime = useRef<number>(0);
  const lastWhaleNotificationTime = useRef<number>(0);
  const RSI_NOTIFICATION_COOLDOWN = 10000; // 10 seconds
  const WHALE_NOTIFICATION_COOLDOWN = 5000; // 5 seconds

  useEffect(() => {
    // Handle Market RSI Events
    const handleRSI = (data: { state: string; rsi: number }) => {
      // Only show market sentiment changes in development mode
      if (!import.meta.env.DEV) return;

      const now = Date.now();
      if (now - lastRSINotificationTime.current < RSI_NOTIFICATION_COOLDOWN) {
        return;
      }

      if (data.state === 'OVERSOLD' || data.state === 'OVERBOUGHT') {
        lastRSINotificationTime.current = now;
        addNotification({
          type: 'market',
          title:
            data.state === 'OVERSOLD'
              ? text(t('hud.announcer.oversold'))
              : text(t('hud.announcer.overbought')),
          message: text(
            t('hud.announcer.rsi_message', {
              sentiment:
                data.state === 'OVERSOLD'
                  ? text(t('hud.announcer.bullish'))
                  : text(t('hud.announcer.bearish')),
              rsi: data.rsi.toFixed(1),
            })
          ),
          color: data.state === 'OVERSOLD' ? '#4ade80' : '#f87171',
          icon: data.state === 'OVERSOLD' ? '📈' : '📉',
        });
      }
    };

    // Handle Whale Events
    const handleWhale = (data: { tier: number }) => {
      // Only show whale detection notifications in development mode
      if (!import.meta.env.DEV) return;

      const now = Date.now();
      if (now - lastWhaleNotificationTime.current < WHALE_NOTIFICATION_COOLDOWN) {
        return;
      }

      if (data.tier > 0) {
        lastWhaleNotificationTime.current = now;
        const tierKeys = ['', 'baby', 'mega', 'giga'];
        const tierKey = tierKeys[data.tier];
        const tierName = text(t(`hud.announcer.tiers.${tierKey}`));
        addNotification({
          type: 'market',
          title: text(t('hud.announcer.whale_spotted', { tier: tierName })),
          message: text(t('hud.announcer.whale_volume')),
          color: '#fbbf24',
          icon: '🐋',
        });
      }
    };

    // Handle Generic Notifications
    const handleNotification = (data: {
      title: string;
      message: string;
      type?: 'error' | 'success' | 'info' | 'warning';
      duration?: number;
    }) => {
      const type = data.type ?? 'info';

      // Only show error and warning popups in development to avoid spamming production users
      // with technical system errors. Market events are already handled below.
      if (!import.meta.env.DEV && (type === 'error' || type === 'warning')) {
        return;
      }
      const colors = {
        error: '#f87171',
        success: '#4ade80',
        warning: '#fbbf24',
        info: '#60a5fa',
        market: '#fbbf24',
      };
      const icons = {
        error: '❌',
        success: '✅',
        warning: '⚠️',
        info: 'ℹ️',
        market: '📊',
      };

      addNotification({
        type: type as 'info' | 'success' | 'warning' | 'error' | 'market',
        title: data.title,
        message: data.message,
        color: colors[type as keyof typeof colors],
        icon: icons[type as keyof typeof icons],
        duration: data.duration,
      });
    };

    // Handle Market Micro-Events (Layer 1)
    const handleMarketEvent = (data: {
      type:
        | 'VOLUME_SPIKE'
        | 'PRICE_BREAKOUT'
        | 'WHALE_ALERT'
        | 'CONSOLIDATION'
        | 'FLASH_CRASH';
      intensity: number;
      durationMs: number;
    }) => {
      // Only show these frequent market micro-events in DEV mode to avoid spamming players
      if (!import.meta.env.DEV) return;

      const configs = {
        VOLUME_SPIKE: {
          title: text(t('hud.announcer.volume_spike')) || 'Volume Spike',
          icon: '🔥',
          color: '#f59e0b',
        },
        PRICE_BREAKOUT: {
          title: text(t('hud.announcer.breakout')) || 'Trend Breakout',
          icon: '🚀',
          color: '#10b981',
        },
        WHALE_ALERT: {
          title: text(t('hud.announcer.whale_alert')) || 'Whale Arrival',
          icon: '🐋',
          color: '#8b5cf6',
        },
        CONSOLIDATION: {
          title: text(t('hud.announcer.consolidation')) || 'Consolidation',
          icon: '💤',
          color: '#64748b',
        },
        FLASH_CRASH: {
          title: text(t('hud.announcer.flash_crash')) || 'FLASH CRASH',
          icon: '🚨',
          color: '#ef4444',
        },
      };

      const config = configs[data.type];
      addNotification({
        type: 'market',
        title: config.title,
        message:
          text(t(`hud.announcer.${data.type.toLowerCase()}_msg`)) ||
          `Market volatility detected: ${data.type}`,
        color: config.color,
        icon: config.icon,
        duration: data.durationMs,
      });
    };

    const unsubRSI = EventBus.on('rsiStateChanged', handleRSI);
    const unsubWhale = EventBus.on('whaleTierChanged', handleWhale);
    const unsubNotify = EventBus.on('gameNotification', handleNotification);
    const unsubMarketEvent = EventBus.on('gameMarketEvent', handleMarketEvent);
    const unsubReset = EventBus.on('gameReset', () => setNotifications([]));

    return () => {
      unsubRSI();
      unsubWhale();
      unsubNotify();
      unsubMarketEvent();
      unsubReset();
    };
  }, [t, addNotification]);

  return (
    <div className="notification-system-container">
      <AnimatePresence>
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
            className={`notification-card type-${notification.type}`}
            style={{ borderLeft: `4px solid ${notification.color}` }}
          >
            <div className="notification-icon">{notification.icon}</div>
            <div className="notification-content">
              <div className="notification-title" style={{ color: notification.color }}>
                {notification.title}
              </div>
              <div className="notification-message">{notification.message}</div>
            </div>
            <button
              className="notification-close"
              onClick={() =>
                setNotifications(prev => prev.filter(n => n.id !== notification.id))
              }
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        .notification-system-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: ${Z_LAYERS.TOAST};
          display: flex;
          flex-direction: column;
          gap: 12px;
          pointer-events: none;
          max-width: 90vw;
        }

        .notification-card {
          pointer-events: auto;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          padding: 14px 18px;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: flex-start;
          gap: 14px;
          width: 340px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
        }

        .notification-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03));
          pointer-events: none;
        }

        .notification-icon {
          font-size: 20px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          letter-spacing: 0.03em;
          font-size: 13px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .notification-message {
          color: #cbd5e1;
          font-size: 12px;
          line-height: 1.4;
          word-break: break-word;
        }

        .notification-close {
          color: #64748b;
          font-size: 18px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0 4px;
          line-height: 1;
          transition: color 0.2s;
          margin-top: -2px;
        }

        .notification-close:hover {
          color: #f1f5f9;
        }

        @media (max-width: 640px) {
          .notification-system-container {
            top: auto;
            bottom: 20px;
            right: 10px;
            left: 10px;
            max-width: none;
          }
          
          .notification-card {
            width: auto;
          }
        }
      `}</style>
    </div>
  );
};
