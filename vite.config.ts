import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const getManualChunk = (id: string): string | undefined => {
  const normalizedId = id.replace(/\\/g, '/');

  if (normalizedId.includes('/node_modules/')) {
    if (
      normalizedId.includes('/node_modules/react/') ||
      normalizedId.includes('/node_modules/react-dom/')
    ) {
      return 'vendor-react';
    }

    if (
      normalizedId.includes('/node_modules/framer-motion/') ||
      normalizedId.includes('/node_modules/lucide-react/')
    ) {
      return 'vendor-ui';
    }

    if (
      normalizedId.includes('/node_modules/zod/') ||
      normalizedId.includes('/node_modules/zustand/') ||
      normalizedId.includes('/node_modules/howler/') ||
      normalizedId.includes('/node_modules/nanoid/')
    ) {
      return 'vendor-utils';
    }

    return undefined;
  }

  return undefined;
};

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  const marketAggregatorUrl = (
    env.MARKET_AGGREGATOR_URL ||
    env.VITE_MARKET_AGGREGATOR_URL ||
    env.VITE_RAILWAY_API_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');
  const railwayApiUrl = (
    env.VITE_RAILWAY_API_URL ||
    env.VITE_MARKET_SERVER_URL ||
    marketAggregatorUrl
  )
    .trim()
    .replace(/\/+$/, '');

  const proxyConfig = {
    ...(marketAggregatorUrl
      ? {
          '/api/v1/market': {
            target: marketAggregatorUrl,
            changeOrigin: true,
            secure: true,
          },
        }
      : {}),
    ...(railwayApiUrl
      ? {
          '/api/v1': {
            target: railwayApiUrl,
            changeOrigin: true,
            secure: true,
          },
        }
      : {}),
  };

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: proxyConfig,
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
      proxy: proxyConfig,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // ==========================================================================
    // PRODUCTION BUILD OPTIMIZATIONS (Anti-Cheat Hardening)
    // ==========================================================================
    build: {
      minify: isProduction ? 'terser' : false,
      // SECURITY: Never expose source maps in production
      // - true: generates .map files (dev only)
      // - 'hidden': generates .map for error tracking but no reference in JS
      // - false: no source maps at all
      sourcemap: isProduction ? false : true,
      // Obfuscate asset directory name in production
      // /assets/ → /a/ (shorter, less obvious)
      assetsDir: isProduction ? 'a' : 'assets',
      modulePreload: false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
              pure_funcs: isProduction
                ? ['console.log', 'console.debug', 'console.info']
                : [],
              // Dead code elimination
              dead_code: true,
              // Reduce attack surface
              passes: 2,
            },
            mangle: {
              // Mangle variable names
              toplevel: true,
              // Mangle properties starting with underscore
              properties: {
                regex: /^_private_|^_internal_/,
              },
            },
            format: {
              // Remove comments
              comments: false,
            },
          }
        : undefined,
      rollupOptions: {
        output: {
          // Obfuscate chunk names (harder to identify critical files)
          // Production: /a/Xk9mN2pQ.js (minimal exposure)
          // Development: /assets/GameEngine-abc123.js (readable for debugging)
          chunkFileNames: isProduction ? 'a/[hash].js' : 'assets/[name]-[hash].js',
          entryFileNames: isProduction ? 'a/[hash].js' : 'assets/[name]-[hash].js',
          assetFileNames: isProduction
            ? 'a/[hash].[ext]'
            : 'assets/[name]-[hash].[ext]',
          manualChunks: getManualChunk,
        },
      },
      chunkSizeWarningLimit: 2000,
    },
    // Esbuild options for development (faster builds)
    esbuild: {
      // Remove console in production during esbuild step as well
      drop: isProduction ? ['console', 'debugger'] : [],
    },
  };
});
