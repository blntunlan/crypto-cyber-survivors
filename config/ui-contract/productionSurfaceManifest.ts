export type ProductionUiFlowId =
  | 'landing'
  | 'hub'
  | 'main-menu'
  | 'settings'
  | 'game-hud'
  | 'level-up'
  | 'game-over';

export type ProductionUiFlow = {
  id: ProductionUiFlowId;
  sourcePaths: readonly string[];
  title: string;
};

const PRODUCTION_UI_PATHS = [
  'components/auth/',
  'components/hub/',
  'components/hud/',
  'components/screens/',
  'components/settings/',
  'components/themed/',
  'components/ui/',
] as const;

const EXEMPT_PATH_FRAGMENTS = [
  '/admin/',
  '/preview-lab/',
  '/vfx-lab/',
  'DevPerformanceOverlay.tsx',
  'DebugPanel.tsx',
] as const;

export const PRODUCTION_UI_SURFACE_MANIFEST = {
  criticalFlows: [
    {
      id: 'landing',
      sourcePaths: ['components/screens/LandingPage.tsx'],
      title: 'Landing',
    },
    {
      id: 'hub',
      sourcePaths: ['components/hub/HubMenu.tsx', 'components/hub/HubMenuV2.tsx'],
      title: 'Hub',
    },
    {
      id: 'main-menu',
      sourcePaths: ['components/screens/MainMenu.tsx'],
      title: 'Main menu',
    },
    {
      id: 'settings',
      sourcePaths: ['components/settings/SettingsPanel.tsx'],
      title: 'Settings',
    },
    {
      id: 'game-hud',
      sourcePaths: ['components/hud/', 'components/GameEngine.tsx'],
      title: 'Game HUD',
    },
    {
      id: 'level-up',
      sourcePaths: ['components/screens/LevelUpScreen/LevelUpScreen.tsx'],
      title: 'Level-up selection',
    },
    {
      id: 'game-over',
      sourcePaths: ['components/screens/GameOverScreen.tsx'],
      title: 'Game-over result',
    },
  ] as const satisfies readonly ProductionUiFlow[],
  excludedPaths: EXEMPT_PATH_FRAGMENTS,
  productionPaths: PRODUCTION_UI_PATHS,
} as const;

export function isProductionUiSurface(filePath: string): boolean {
  const normalizedPath = filePath.replaceAll('\\', '/').replace(/^\.\//, '');

  return (
    normalizedPath.endsWith('.tsx') &&
    PRODUCTION_UI_SURFACE_MANIFEST.productionPaths.some(prefix =>
      normalizedPath.startsWith(prefix)
    ) &&
    !PRODUCTION_UI_SURFACE_MANIFEST.excludedPaths.some(fragment =>
      normalizedPath.includes(fragment)
    )
  );
}
