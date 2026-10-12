export type AppSurface = 'legacy' | 'game-v2';

export const resolveAppSurface = (pathname: string): AppSurface =>
  pathname === '/game-v2' || pathname === '/game-v2/' ? 'game-v2' : 'legacy';
