/**
 * App.tsx - Main Application Component
 *
 * Owns top-level application surfaces (landing, legal/docs, SEO, global providers)
 * and delegates live gameplay/runtime state to `GameAppShell` so market ticks do not
 * re-render the entire root tree.
 *
 * Root hooks used:
 * - useWindowDimensions: Window resize handling
 * - useGameStatus: Game state machine subscription
 * - useAppInitialization: App startup logic
 * - useDevShortcuts: Developer keyboard shortcuts
 * - useCloudflareSession: Session protection bootstrap
 * - useSurfaceState: Landing/legal/settings navigation state
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GameStatus } from './types';
import { EventBus } from './services/core/EventBus';
import { ImagePreloader } from './services/system/ImagePreloader';
import { Logger } from './services/system/Logger';
import { UserSessionService } from './services/auth/UserSessionService';

// Custom hooks
import { useLanguage } from './contexts/LanguageContext';
import { useWindowDimensions } from './hooks/useWindowDimensions';
import { useGameStatus } from './hooks/useGameStatus';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useDevShortcuts } from './hooks/useDevShortcuts';
import { useTheme } from './contexts/useTheme';
import { useCloudflareSession } from './hooks/useCloudflareSession';
import { useTutorial } from './hooks/useTutorial';
import { useSurfaceState } from './hooks/useSurfaceState';
import { UserProvider } from './contexts/UserContext';
import { cn } from './utils/classnames';
import { SEO } from './components/SEO';
import { getMarketRuntimeConfig } from './config/marketRuntime';
import { getSeoContent } from './config/seo';
import {
  getLocalizedPath,
  getPublicRoutePath,
  SEO_BASE_URL,
  type PublicRoutePath,
} from './utils/seoRoutes';

// Lazy load heavy components for performance optimization
import { ErrorBoundary } from './components/ErrorBoundary';
import { LazyMotionProvider } from './components/LazyMotionProvider';
import { LandingPage } from './components/screens/LandingPage';
import { GameAppShell } from './components/GameAppShell';

// Lazy-load feature screens
const DocScreen = React.lazy(() =>
  import('./components/screens/DocScreen').then(m => ({
    default: m.DocScreen,
  }))
);
const MetaUpgradeScreen = React.lazy(() =>
  import('./components/screens/MetaUpgradeScreen').then(m => ({
    default: m.MetaUpgradeScreen,
  }))
);
const ChallengeScreen = React.lazy(() =>
  import('./components/screens/ChallengeScreen').then(m => ({
    default: m.ChallengeScreen,
  }))
);
const ReplayListScreen = React.lazy(() =>
  import('./components/screens/ReplayListScreen').then(m => ({
    default: m.ReplayListScreen,
  }))
);

const PrivacyPolicy = React.lazy(() =>
  import('./components/screens/LegalModals').then(m => ({
    default: m.PrivacyPolicy,
  }))
);
const TermsOfService = React.lazy(() =>
  import('./components/screens/LegalModals').then(m => ({
    default: m.TermsOfService,
  }))
);

// Lazy load Evolution Viewer for Project Darwin
const EvolutionViewer = React.lazy(() => import('./components/admin/EvolutionViewer'));

// DEV-only performance overlay
const DevPerformanceOverlay = import.meta.env.DEV
  ? React.lazy(() =>
      import('./components/DevPerformanceOverlay').then(m => ({
        default: m.DevPerformanceOverlay,
      }))
    )
  : null;

// DEV-only VFX preview lab (Ctrl+Shift+V)
const VfxLabScreen = import.meta.env.DEV
  ? React.lazy(() =>
      import('./components/vfx-lab/VfxLabScreen').then(m => ({
        default: m.VfxLabScreen,
      }))
    )
  : null;

const FallbackLoader = () => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#020617',
      color: '#eab308',
      fontFamily: 'monospace',
      fontSize: '14px',
      letterSpacing: '0.1em',
    }}
  >
    LOADING ENGINE...
  </div>
);

// Preload card images AFTER initial render (non-blocking)
setTimeout(() => {
  void ImagePreloader.preloadAll();
}, 1000);

const App: React.FC = () => {
  // ========================================
  // Custom Hooks
  // ========================================

  // URL Check for Darwin Mode (Moved inside Component logic but return happens later)
  const [isDarwinMode, setIsDarwinMode] = useState(false);
  useEffect(() => {
    // SECURE: Only allow in Dev environment
    if (import.meta.env.DEV && window.location.search.includes('mode=darwin')) {
      setIsDarwinMode(true);
    }
  }, []);

  const dimensions = useWindowDimensions();
  const { gameStatus, handlePauseToggle } = useGameStatus();

  const profileId = UserSessionService.getProfileId() || 'anonymous';
  useCloudflareSession(gameStatus, profileId, 'BTCUSDT');

  // ========================================
  // Local State
  // ========================================
  const [featureOverlay, setFeatureOverlay] = useState<
    'none' | 'upgrades' | 'challenges' | 'replays'
  >('none');
  const {
    showLanding,
    showSettings,
    hubScreen,
    showPrivacy,
    showTerms,
    showDocs,
    setHubScreen,
    setShowSettings,
    patchLegalRoute,
    handleLaunchGame,
    handleReturnToLanding,
  } = useSurfaceState();

  const marketRuntimeConfig = useMemo(() => getMarketRuntimeConfig(), []);

  // ========================================
  // Initialization & Utility Hooks
  // ========================================
  const { isInitialized } = useAppInitialization();
  const {
    showAnalytics: _showAnalytics,
    showAdminDashboard: _showAdminDashboard,
    showVfxLab,
    closeVfxLab,
  } = useDevShortcuts();
  const tutorial = useTutorial({ enabled: !showLanding });
  const { t, language } = useLanguage();
  const { isRetro } = useTheme();
  const homeSeo = getSeoContent('home', language);
  const docsSeo = getSeoContent('docs', language);
  const privacySeo = getSeoContent('privacy', language);
  const termsSeo = getSeoContent('terms', language);
  const getLocalizedPublicPath = (routePath: PublicRoutePath): string =>
    getLocalizedPath(routePath, language);
  const navigateToPublicRoute = (routePath: PublicRoutePath): void => {
    window.history.pushState(null, '', getLocalizedPublicPath(routePath));
  };
  const closePublicRoute = (routePath: PublicRoutePath): void => {
    if (getPublicRoutePath(window.location.pathname) === routePath) {
      window.history.pushState(null, '', getLocalizedPublicPath('/'));
    }
  };
  const isLiveGameSurface =
    !showLanding &&
    (gameStatus === GameStatus.PLAYING ||
      gameStatus === GameStatus.PAUSED ||
      gameStatus === GameStatus.LEVEL_UP);

  useEffect(() => {
    Logger.info('[MarketRuntime] Mode initialized', {
      mode: marketRuntimeConfig.mode,
      shadowRuntimeEnabled: marketRuntimeConfig.shouldRunShadowRuntime,
    });
  }, [marketRuntimeConfig.mode, marketRuntimeConfig.shouldRunShadowRuntime]);

  useEffect(() => {
    return Logger.onError((message, error) => {
      EventBus.emit('gameNotification', {
        title: 'System Error',
        message: message || String(error),
        type: 'error',
      });
    });
  }, []);

  // ========================================
  // Render Logic
  // ========================================

  // Darwin Spectator Mode
  if (isDarwinMode) {
    return (
      <React.Suspense
        fallback={
          <div className="bg-black p-4 text-green-500">Loading Project Darwin...</div>
        }
      >
        <EvolutionViewer />
      </React.Suspense>
    );
  }

  // App Loading
  if (!isInitialized) {
    return <FallbackLoader />;
  }

  const seoMetadata = showDocs ? (
    <SEO
      title={docsSeo.title}
      description={docsSeo.description}
      canonicalPath="/docs"
      lang={language}
      breadcrumbs={[
        { name: 'Home', item: getLocalizedPublicPath('/') },
        { name: 'Documentation', item: getLocalizedPublicPath('/docs') },
      ]}
    />
  ) : showPrivacy ? (
    <SEO
      title={privacySeo.title}
      description={privacySeo.description}
      canonicalPath="/privacy"
      lang={language}
      breadcrumbs={[
        { name: 'Home', item: getLocalizedPublicPath('/') },
        { name: 'Privacy', item: getLocalizedPublicPath('/privacy') },
      ]}
    />
  ) : showTerms ? (
    <SEO
      title={termsSeo.title}
      description={termsSeo.description}
      canonicalPath="/terms"
      lang={language}
      breadcrumbs={[
        { name: 'Home', item: getLocalizedPublicPath('/') },
        { name: 'Terms', item: getLocalizedPublicPath('/terms') },
      ]}
    />
  ) : showLanding ? (
    <SEO
      title={homeSeo.title}
      description={homeSeo.description}
      canonicalPath="/"
      lang={language}
      themeColor={isRetro ? '#334155' : '#020617'}
      structuredData={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${SEO_BASE_URL}/#website`,
            name: 'Crypto Survivors',
            url: `${SEO_BASE_URL}/`,
            inLanguage: language,
          },
          {
            '@type': 'Organization',
            '@id': `${SEO_BASE_URL}/#organization`,
            name: 'Crypto Survivors Team',
            url: `${SEO_BASE_URL}/`,
            logo: `${SEO_BASE_URL}/icons/icon-512.png`,
          },
          {
            '@type': ['VideoGame', 'SoftwareApplication', 'WebApplication'],
            '@id': `${SEO_BASE_URL}/#game`,
            name: 'Crypto Survivors',
            url: `${SEO_BASE_URL}${getLocalizedPublicPath('/')}`,
            description: homeSeo.description,
            genre: ['Survival', 'Rogue-lite', 'Simulation', 'Arcade'],
            gamePlatform: ['Web Browser', 'Mobile Browser', 'PWA'],
            applicationCategory: 'GameApplication',
            operatingSystem: 'Web Browser',
            playMode: 'SinglePlayer',
            publisher: {
              '@id': `${SEO_BASE_URL}/#organization`,
            },
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          },
        ],
      }}
      breadcrumbs={[{ name: 'Home', item: getLocalizedPublicPath('/') }]}
    />
  ) : (
    <SEO
      title={
        gameStatus === GameStatus.PLAYING
          ? 'Live Session | Crypto Survivors'
          : `${t('hub.play')} | Crypto Survivors`
      }
      noindex={true}
      lang={language}
    />
  );

  // Main Game App
  return (
    <UserProvider>
      <LazyMotionProvider>
        {DevPerformanceOverlay && (
          <React.Suspense fallback={null}>
            <DevPerformanceOverlay />
          </React.Suspense>
        )}
        <div
          data-runtime-gameplay-active={isLiveGameSurface ? 'true' : 'false'}
          className={cn(
            'relative h-screen w-full font-mono',
            showLanding ? 'bg-transparent' : 'bg-slate-950',
            gameStatus === GameStatus.PLAYING && !showLanding
              ? 'overflow-hidden'
              : 'overflow-y-auto'
          )}
        >
          <ErrorBoundary>
            {/* Dynamic public-route SEO metadata */}
            {seoMetadata}

            {showLanding ? (
              <LandingPage
                onLaunch={handleLaunchGame}
                onViewPrivacy={() => {
                  patchLegalRoute({
                    showPrivacy: true,
                    showTerms: false,
                    showDocs: false,
                  });
                  navigateToPublicRoute('/privacy');
                }}
                onViewTerms={() => {
                  patchLegalRoute({
                    showTerms: true,
                    showPrivacy: false,
                    showDocs: false,
                  });
                  navigateToPublicRoute('/terms');
                }}
                onViewDocs={() => {
                  patchLegalRoute({
                    showDocs: true,
                    showPrivacy: false,
                    showTerms: false,
                  });
                  navigateToPublicRoute('/docs');
                }}
              />
            ) : (
              <GameAppShell
                dimensions={dimensions}
                gameStatus={gameStatus}
                handlePauseToggle={handlePauseToggle}
                marketRuntimeMode={marketRuntimeConfig.mode}
                hubScreen={hubScreen}
                setHubScreen={setHubScreen}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                handleReturnToLanding={handleReturnToLanding}
                showDocs={showDocs}
                showPrivacy={showPrivacy}
                showTerms={showTerms}
                tutorial={tutorial}
                onOpenUpgrades={() => setFeatureOverlay('upgrades')}
                onOpenChallenges={() => setFeatureOverlay('challenges')}
                onOpenReplays={() => setFeatureOverlay('replays')}
              />
            )}

            {/* Feature Overlay Screens */}
            {featureOverlay === 'upgrades' && (
              <React.Suspense fallback={null}>
                <MetaUpgradeScreen onBack={() => setFeatureOverlay('none')} />
              </React.Suspense>
            )}
            {featureOverlay === 'challenges' && (
              <React.Suspense fallback={null}>
                <ChallengeScreen onBack={() => setFeatureOverlay('none')} />
              </React.Suspense>
            )}
            {featureOverlay === 'replays' && (
              <React.Suspense fallback={null}>
                <ReplayListScreen
                  onBack={() => setFeatureOverlay('none')}
                  onWatch={id => {
                    setFeatureOverlay('none');
                    Logger.info(`[App] Watch replay: ${id}`);
                  }}
                />
              </React.Suspense>
            )}

            {/* Legal Modals */}
            {showPrivacy && (
              <React.Suspense fallback={null}>
                <PrivacyPolicy
                  onClose={() => {
                    patchLegalRoute({ showPrivacy: false });
                    closePublicRoute('/privacy');
                  }}
                  onViewTerms={() => {
                    patchLegalRoute({
                      showPrivacy: false,
                      showTerms: true,
                    });
                    navigateToPublicRoute('/terms');
                  }}
                />
              </React.Suspense>
            )}
            {showTerms && (
              <React.Suspense fallback={null}>
                <TermsOfService
                  onClose={() => {
                    patchLegalRoute({ showTerms: false });
                    closePublicRoute('/terms');
                  }}
                  onViewPrivacy={() => {
                    patchLegalRoute({
                      showTerms: false,
                      showPrivacy: true,
                    });
                    navigateToPublicRoute('/privacy');
                  }}
                />
              </React.Suspense>
            )}
            {showDocs && (
              <React.Suspense fallback={null}>
                <DocScreen
                  onClose={() => {
                    patchLegalRoute({ showDocs: false });
                    window.location.hash = '';
                    closePublicRoute('/docs');
                  }}
                />
              </React.Suspense>
            )}

            {/* DEV-only VFX Preview Lab (Ctrl+Shift+V) */}
            {import.meta.env.DEV && showVfxLab && VfxLabScreen && (
              <React.Suspense fallback={null}>
                <VfxLabScreen onClose={closeVfxLab} />
              </React.Suspense>
            )}
          </ErrorBoundary>
        </div>
      </LazyMotionProvider>
    </UserProvider>
  );
};

export default App;
