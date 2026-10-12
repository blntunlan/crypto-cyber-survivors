import React from 'react';
import { type AppSurface } from './AppSurface';

const LegacyAppEntry = React.lazy(() => import('./LegacyAppEntry'));
const GameV2App = React.lazy(() => import('../game-v2/GameV2App'));

type RootEntryProps = {
  surface: AppSurface;
};

export const RootEntry = ({ surface }: RootEntryProps): React.ReactElement => (
  <React.StrictMode>
    <React.Suspense fallback={null}>
      {surface === 'game-v2' ? <GameV2App /> : <LegacyAppEntry />}
    </React.Suspense>
  </React.StrictMode>
);
