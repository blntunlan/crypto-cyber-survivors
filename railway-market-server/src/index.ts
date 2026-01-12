import 'dotenv/config';
import express from 'express';
import { BinanceService } from './services/binanceService';
import { SupabaseService } from './services/supabaseService';
import { PriceLogger } from './services/priceLogger';
import { CleanupCron } from './cron/cleanup';
import { Logger } from './utils/logger';
import { ErrorReporter } from './utils/errorReporter';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Health check endpoint (Railway için)
app.get('/health', (_req, res) => {
  const binance = BinanceService.getInstance();
  res.json({
    status: binance.isConnected() ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    binanceConnected: binance.isConnected(),
  });
});

// Stats endpoint (monitoring için)
app.get('/stats', (_req, res) => {
  const priceStats = PriceLogger.getInstance().getStats();
  const cleanupStats = CleanupCron.getInstance().getStats();
  res.json({
    price: priceStats,
    cleanup: cleanupStats,
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Railway Market Server',
    version: '1.1.0',
    description: 'Real-time crypto price logger for anti-cheat system',
    endpoints: {
      health: '/health',
      stats: '/stats',
    },
  });
});

// Manual cleanup trigger (admin only - can add auth later)
app.post('/cleanup', (_req, res) => {
  void CleanupCron.getInstance()
    .runCleanup()
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ error: (error as Error).message }));
});

async function startServer(): Promise<void> {
  // Initialize global error handlers first
  ErrorReporter.initGlobalHandlers();

  try {
    Logger.info('🚀 Starting Railway Market Server...');

    // Initialize services (validates env vars)
    SupabaseService.getInstance();
    BinanceService.getInstance();

    // Start price logging
    const priceLogger = PriceLogger.getInstance();
    await priceLogger.start();

    // Start cleanup cron
    const cleanupCron = CleanupCron.getInstance();
    cleanupCron.start();

    // Start HTTP server
    app.listen(PORT, () => {
      Logger.info(`🚀 Server ready at http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      Logger.info('SIGTERM received, shutting down gracefully...');
      cleanupCron.stop();
      void priceLogger.stop().finally(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      Logger.info('SIGINT received, shutting down gracefully...');
      cleanupCron.stop();
      void priceLogger.stop().finally(() => process.exit(0));
    });
  } catch (error) {
    Logger.error('Failed to start server:', error);
    await ErrorReporter.report({
      type: 'StartupError',
      message: (error as Error).message,
      stack: (error as Error).stack,
      severity: 'critical',
    });
    process.exit(1);
  }
}

startServer().catch(error => {
  Logger.error('Unhandled error during server startup:', error);
  process.exit(1);
});
