import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
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
      sourcemap: isProduction ? false : true,
      terserOptions: isProduction
        ? {
            compress: {
              // Remove console.log and console.debug in production
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.debug', 'console.info'],
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
          chunkFileNames: isProduction ? 'assets/[hash].js' : 'assets/[name]-[hash].js',
          entryFileNames: isProduction ? 'assets/[hash].js' : 'assets/[name]-[hash].js',
          assetFileNames: isProduction
            ? 'assets/[hash].[ext]'
            : 'assets/[name]-[hash].[ext]',
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['framer-motion', 'lucide-react'],
            'vendor-utils': ['zod', 'zustand', 'howler', 'nanoid'],
          },
        },
      },
    },
    // Esbuild options for development (faster builds)
    esbuild: {
      // Remove console in production during esbuild step as well
      drop: isProduction ? ['console', 'debugger'] : [],
    },
  };
});
