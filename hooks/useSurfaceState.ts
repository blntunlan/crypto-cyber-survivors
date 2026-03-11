import { useReducer, useEffect, useCallback } from 'react';
import { type HubScreen } from '../components/hub';
import { UserPersistenceService } from '../services/auth/UserPersistenceService';
import { UserSessionService } from '../services/auth/UserSessionService';

const HUB_SCREEN_STORAGE_KEY = 'ui_hub_screen';
const ACTIVE_SURFACE_STORAGE_KEY = 'ui_active_surface';
const LEGAL_PATHS = new Set(['/privacy', '/terms', '/docs']);
const HUB_SCREENS: readonly HubScreen[] = [
  'hub',
  'play',
  'stash',
  'loot',
  'skins',
  'ranks',
  'gear',
];

interface LegalRouteState {
  showPrivacy: boolean;
  showTerms: boolean;
  showDocs: boolean;
}

interface IdentityState {
  isReady: boolean;
  hasNickname: boolean;
}

interface SurfaceState {
  showLanding: boolean;
  showSettings: boolean;
  hubScreen: HubScreen;
  legalRoute: LegalRouteState;
  identityState: IdentityState;
}

export type SurfaceAction =
  | { type: 'set_hub_screen'; hubScreen: HubScreen }
  | { type: 'set_show_settings'; showSettings: boolean }
  | { type: 'set_show_landing'; showLanding: boolean }
  | { type: 'set_legal_route'; legalRoute: LegalRouteState }
  | { type: 'patch_legal_route'; legalRoute: Partial<LegalRouteState> }
  | { type: 'set_identity_state'; identityState: IdentityState }
  | { type: 'patch_identity_state'; identityState: Partial<IdentityState> };

const isHubScreen = (value: string | null): value is HubScreen => {
  return value !== null && HUB_SCREENS.includes(value as HubScreen);
};

const readPersistedHubScreen = (): HubScreen => {
  try {
    const storedScreen = window.sessionStorage.getItem(HUB_SCREEN_STORAGE_KEY);
    return isHubScreen(storedScreen) ? storedScreen : 'hub';
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
    return 'hub';
  }
};

const persistHubScreen = (screen: HubScreen): void => {
  try {
    window.sessionStorage.setItem(HUB_SCREEN_STORAGE_KEY, screen);
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }
};

const persistActiveSurface = (surface: 'landing' | 'app'): void => {
  try {
    window.sessionStorage.setItem(ACTIVE_SURFACE_STORAGE_KEY, surface);
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }
};

const readInitialLandingVisibility = (): boolean => {
  const searchParams = new URLSearchParams(window.location.search);

  // Deep links to legal/docs routes should open their own page, not landing.
  if (LEGAL_PATHS.has(window.location.pathname) || window.location.hash === '#docs') {
    return false;
  }

  // Dev/QA override: force landing with ?landing=1
  if (searchParams.get('landing') === '1') {
    return true;
  }

  // If user has already completed landing, always skip it by default.
  // Explicit query params (e.g. ?landing=1) still override this.
  if (localStorage.getItem('has_seen_landing') === 'true') {
    return false;
  }

  try {
    if (window.sessionStorage.getItem(ACTIVE_SURFACE_STORAGE_KEY) === 'landing') {
      return true;
    }
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }

  return true;
};

const createInitialSurfaceState = (): SurfaceState => ({
  showLanding: readInitialLandingVisibility(),
  showSettings: false,
  hubScreen: readPersistedHubScreen(),
  legalRoute: {
    showPrivacy: false,
    showTerms: false,
    showDocs: false,
  },
  identityState: {
    isReady: false,
    hasNickname: false,
  },
});

const surfaceReducer = (state: SurfaceState, action: SurfaceAction): SurfaceState => {
  switch (action.type) {
    case 'set_hub_screen':
      return { ...state, hubScreen: action.hubScreen };
    case 'set_show_settings':
      return { ...state, showSettings: action.showSettings };
    case 'set_show_landing':
      return { ...state, showLanding: action.showLanding };
    case 'set_legal_route':
      return { ...state, legalRoute: action.legalRoute };
    case 'patch_legal_route':
      return {
        ...state,
        legalRoute: { ...state.legalRoute, ...action.legalRoute },
      };
    case 'set_identity_state':
      return { ...state, identityState: action.identityState };
    case 'patch_identity_state':
      return {
        ...state,
        identityState: { ...state.identityState, ...action.identityState },
      };
    default:
      return state;
  }
};

interface UseSurfaceStateResult {
  showLanding: boolean;
  showSettings: boolean;
  hubScreen: HubScreen;
  showPrivacy: boolean;
  showTerms: boolean;
  showDocs: boolean;
  isIdentityReady: boolean;
  hasNickname: boolean;
  setHubScreen: (hubScreen: HubScreen) => void;
  setShowSettings: (showSettings: boolean) => void;
  patchLegalRoute: (legalRoute: Partial<LegalRouteState>) => void;
  patchIdentityState: (identityState: Partial<IdentityState>) => void;
  handleLaunchGame: () => void;
  handleReturnToLanding: () => void;
}

const getLegalRouteFromLocation = (): LegalRouteState => {
  const isHashDocs = window.location.hash === '#docs';
  const path = window.location.pathname;

  return {
    showDocs: isHashDocs || path === '/docs',
    showPrivacy: path === '/privacy',
    showTerms: path === '/terms',
  };
};

export const useSurfaceState = (): UseSurfaceStateResult => {
  const [surfaceState, dispatchSurface] = useReducer(
    surfaceReducer,
    undefined,
    createInitialSurfaceState
  );

  const { showLanding, showSettings, hubScreen, legalRoute, identityState } =
    surfaceState;
  const { showPrivacy, showTerms, showDocs } = legalRoute;
  const { isReady: isIdentityReady, hasNickname } = identityState;
  const setHubScreen = useCallback((nextHubScreen: HubScreen) => {
    dispatchSurface({ type: 'set_hub_screen', hubScreen: nextHubScreen });
  }, []);

  const setShowSettings = useCallback((nextShowSettings: boolean) => {
    dispatchSurface({ type: 'set_show_settings', showSettings: nextShowSettings });
  }, []);

  const patchLegalRoute = useCallback((nextLegalRoute: Partial<LegalRouteState>) => {
    dispatchSurface({ type: 'patch_legal_route', legalRoute: nextLegalRoute });
  }, []);

  const patchIdentityState = useCallback(
    (nextIdentityState: Partial<IdentityState>) => {
      dispatchSurface({
        type: 'patch_identity_state',
        identityState: nextIdentityState,
      });
    },
    []
  );

  useEffect(() => {
    const handleNavigation = () => {
      dispatchSurface({
        type: 'set_legal_route',
        legalRoute: getLegalRouteFromLocation(),
      });
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    handleNavigation();

    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initIdentity = async () => {
      let hasNicknameVal = false;
      try {
        const user = await UserPersistenceService.initialize();
        if (!cancelled) {
          hasNicknameVal = Boolean(user?.nickname);
        }
      } catch {
        if (!cancelled) {
          hasNicknameVal = Boolean(UserSessionService.getNickname());
        }
      } finally {
        if (!cancelled) {
          dispatchSurface({
            type: 'set_identity_state',
            identityState: { isReady: true, hasNickname: hasNicknameVal },
          });
        }
      }
    };

    void initIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLaunchGame = useCallback(() => {
    persistActiveSurface('app');
    dispatchSurface({ type: 'set_show_landing', showLanding: false });
    localStorage.setItem('has_seen_landing', 'true');
  }, []);

  const handleReturnToLanding = useCallback(() => {
    // User explicitly requested landing; keep it sticky across refresh.
    localStorage.removeItem('has_seen_landing');
    persistActiveSurface('landing');
    dispatchSurface({ type: 'set_show_landing', showLanding: true });
    dispatchSurface({
      type: 'set_legal_route',
      legalRoute: { showDocs: false, showPrivacy: false, showTerms: false },
    });

    if (window.location.pathname !== '/' || window.location.hash) {
      window.history.pushState(null, '', '/');
    }
  }, []);

  useEffect(() => {
    persistHubScreen(hubScreen);
  }, [hubScreen]);

  useEffect(() => {
    persistActiveSurface(showLanding ? 'landing' : 'app');
  }, [showLanding]);

  return {
    showLanding,
    showSettings,
    hubScreen,
    showPrivacy,
    showTerms,
    showDocs,
    isIdentityReady,
    hasNickname,
    setHubScreen,
    setShowSettings,
    patchLegalRoute,
    patchIdentityState,
    handleLaunchGame,
    handleReturnToLanding,
  };
};
