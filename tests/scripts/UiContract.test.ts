import { describe, expect, test } from 'vitest';
import {
  auditUiContractSource,
  isProductionUiFile,
  matchesUiContractPath,
  shouldEnforceUiFile,
  type UiContractAllowlist,
} from '../../scripts/check-ui-contract';

describe('UI contract audit', () => {
  test('matches nested production paths in an enforced glob', () => {
    expect(
      matchesUiContractPath(
        'components/screens/**/*.tsx',
        'components/screens/landing/Hero.tsx'
      )
    ).toBe(true);
  });

  test('enforces every production file introduced after the baseline', () => {
    const allowlist: UiContractAllowlist = {
      baselineCommit: 'baseline',
      enforcedPaths: ['components/themed/**'],
      entries: [],
    };

    expect(
      shouldEnforceUiFile('components/screens/NewScreen.tsx', allowlist, false)
    ).toBe(true);
    expect(
      shouldEnforceUiFile('components/screens/LegacyScreen.tsx', allowlist, true)
    ).toBe(false);
  });

  test('includes player-facing surfaces while excluding admin and debug tools', () => {
    expect(isProductionUiFile('components/screens/MainMenu.tsx')).toBe(true);
    expect(isProductionUiFile('components/hud/GameHUD.tsx')).toBe(true);
    expect(isProductionUiFile('components/admin/AdminDashboard.tsx')).toBe(false);
    expect(isProductionUiFile('components/DevPerformanceOverlay.tsx')).toBe(false);
  });

  test('rejects raw interactive elements in production source', () => {
    const violations = auditUiContractSource({
      content: '<button type="button">Launch</button>',
      relativePath: 'components/screens/NewScreen.tsx',
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'raw-interactive-element', line: 1 }),
      ])
    );
  });

  test('rejects a direct theme branch in a production component', () => {
    const violations = auditUiContractSource({
      content: "const className = isRetro ? 'bg-black' : 'bg-slate-950';",
      relativePath: 'components/screens/NewScreen.tsx',
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'direct-theme-branch', line: 1 }),
      ])
    );
  });

  test('rejects an isRetro conditional statement in a production component', () => {
    const violations = auditUiContractSource({
      content: "if (isRetro) return 'pixel';",
      relativePath: 'components/screens/NewScreen.tsx',
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'direct-theme-branch', line: 1 }),
      ])
    );
  });

  test('rejects visual class overrides on themed primitives', () => {
    const violations = auditUiContractSource({
      content: '<ThemedButton className="bg-red-500 px-6">Exit</ThemedButton>',
      relativePath: 'components/screens/NewScreen.tsx',
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'themed-visual-override', line: 1 }),
      ])
    );
  });

  test('permits an unexpired legacy exemption and fails it after expiry', () => {
    const allowlist: UiContractAllowlist = {
      entries: [
        {
          expiresOn: '2026-10-31',
          owner: 'UI',
          path: 'components/screens/LegacyScreen.tsx',
          reason: 'Scheduled for CS-UI-DS-V1 cutover.',
          rules: ['raw-interactive-element'],
        },
      ],
    };

    expect(
      auditUiContractSource({
        allowlist,
        content: '<button type="button">Legacy</button>',
        now: new Date('2026-07-17T00:00:00.000Z'),
        relativePath: 'components/screens/LegacyScreen.tsx',
      })
    ).toHaveLength(0);

    expect(
      auditUiContractSource({
        allowlist,
        content: '<button type="button">Legacy</button>',
        now: new Date('2026-11-01T00:00:00.000Z'),
        relativePath: 'components/screens/LegacyScreen.tsx',
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'expired-legacy-allowlist' }),
      ])
    );
  });
});
