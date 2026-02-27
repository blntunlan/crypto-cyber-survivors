import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
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
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['framer-motion', 'lucide-react'],
            'vendor-utils': ['zod', 'zustand', 'howler', 'nanoid'],
          },
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
