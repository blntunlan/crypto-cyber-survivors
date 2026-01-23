import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventBus } from '../../services/EventBus';
import { Logger } from '../../services/Logger';
import { useLanguage } from '../../contexts/LanguageContext';
import './hud-animations.css';

interface MarketAlert {
  id: string;
  type: 'RSI' | 'WHALE' | 'VOLATILITY';
  title: string;
  message: string;
  color: string;
  icon: string;
}

export const MarketAnnouncer: React.FC = () => {
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    const handleRSI = (data: { state: string; rsi: number }) => {
      if (data.state === 'OVERSOLD' || data.state === 'OVERBOUGHT') {
        addAlert({
          type: 'RSI',
          title:
            data.state === 'OVERSOLD'
              ? t('hud.announcer.oversold')
              : t('hud.announcer.overbought'),
          message: t('hud.announcer.rsi_message', {
            sentiment:
              data.state === 'OVERSOLD'
                ? t('hud.announcer.bullish')
                : t('hud.announcer.bearish'),
            rsi: data.rsi.toFixed(1),
          }),
          color: data.state === 'OVERSOLD' ? '#4ade80' : '#f87171',
          icon: data.state === 'OVERSOLD' ? '📈' : '📉',
        });
      }
    };

    const handleWhale = (data: { tier: number }) => {
      if (data.tier > 0) {
        const tierKeys = ['', 'baby', 'mega', 'giga'];
        const tierKey = tierKeys[data.tier];
        const tierName = t(`hud.announcer.tiers.${tierKey}`);
        addAlert({
          type: 'WHALE',
          title: t('hud.announcer.whale_spotted', { tier: tierName }),
          message: t('hud.announcer.whale_volume'),
          color: '#fbbf24',
          icon: '🐋',
        });
      }
    };

    const handleNotification = (data: {
      title: string;
      message: string;
      type?: 'error' | 'success' | 'info' | 'warning';
    }) => {
      addAlert({
        type: 'VOLATILITY', // Reuse volatility style for generic notifications
        title: data.title,
        message: data.message,
        color:
          data.type === 'error'
            ? '#f87171'
            : data.type === 'success'
              ? '#4ade80'
              : data.type === 'warning'
                ? '#fbbf24'
                : '#60a5fa',
        icon:
          data.type === 'error'
            ? '❌'
            : data.type === 'success'
              ? '✅'
              : data.type === 'warning'
                ? '⚠️'
                : 'ℹ️',
      });
    };

    const unsubRSI = EventBus.on('rsiStateChanged', handleRSI);
    const unsubWhale = EventBus.on('whaleTierChanged', handleWhale);
    const unsubNotify = EventBus.on('gameNotification', handleNotification);

    return () => {
      unsubRSI();
      unsubWhale();
      unsubNotify();
    };
  }, [t]);

  const addAlert = (alert: Omit<MarketAlert, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newAlert = { ...alert, id };

    setAlerts(prev => [...prev, newAlert]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);

    Logger.info(`[MarketAnnouncer] Alert: ${alert.title}`);
  };

  return (
    <div className="market-announcer-container">
      <AnimatePresence>
        {alerts.map(alert => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
            className="market-alert-card"
            style={{ borderLeft: `4px solid ${alert.color}` }}
          >
            <div className="market-alert-icon">{alert.icon}</div>
            <div className="market-alert-content">
              <div className="market-alert-title" style={{ color: alert.color }}>
                {alert.title}
              </div>
              <div className="market-alert-message">{alert.message}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        .market-announcer-container {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }

        .market-alert-card {
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(8px);
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 280px;
          max-width: 400px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .market-alert-icon {
          font-size: 24px;
        }

        .market-alert-title {
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          letter-spacing: 0.05em;
          font-size: 14px;
        }

        .market-alert-message {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
};
