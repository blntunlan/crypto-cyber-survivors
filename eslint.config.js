import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tailwindcss from 'eslint-plugin-tailwindcss';

import globals from 'globals';

export default tseslint.config(
  // ============================================
  // IGNORE PATTERNS
  // ============================================
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '*.config.js',
      '*.config.ts',
      '*.config.cjs',
      '*.cjs',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.gemini/**',
      '.claude/**',
      '.agent/**',
      '.agents/**',
      '.windsurf/**',
      '.github/skills/**', // Skill templates - not part of main project
      'supabase/functions/**', // Deno environment - different runtime
      'railway-market-server/**',
      'scripts/**',
      'e2e/**', // Playwright tests - separate environment
      'remotion-video/**',
    ],
  },

  // ============================================
  // BASE CONFIGURATIONS
  // ============================================
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ============================================
  // TYPESCRIPT + REACT RULES
  // ============================================
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      tailwindcss: tailwindcss,
    },
    rules: {
      // ========== TAILWIND CSS UI CONSISTENCY ==========
      'tailwindcss/classnames-order': 'warn', // Consistent class ordering
      'tailwindcss/no-custom-classname': 'off', // Allow custom classes (font-cyber, etc.)
      'tailwindcss/no-contradicting-classname': 'error', // Prevent conflicting classes

      // ========== REACT ==========
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'useMarket',
            'useGameState',
            'usePlayer',
            'useGameStatus',
            'usePnL',
            'useDifficulty',
            'usePrice',
            'lerp',
          ],
        },
      ],

      // ========== TYPESCRIPT BEST PRACTICES ==========
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // Turn off base rules that conflict
      'no-unused-vars': 'off',

      // ========== CODE QUALITY ==========
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'multi-line'],
      'no-throw-literal': 'error',
      'no-return-await': 'error',

      // ========== GAME-SPECIFIC RELAXATIONS ==========
      // Performance-critical code may use bitwise operations
      'no-bitwise': 'off',
      // Game loops often use labels
      'no-labels': 'off',
      // Allow ++ in for loops
      'no-plusplus': 'off',
    },
  },

  // ============================================
  // TEST FILES (RELAXED RULES)
  // ============================================
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'tests/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.node,
      },
    },
  }
);
