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

// Lazy load heavy components for performance optimization
import { ErrorBoundary } from './components/ErrorBoundary';
import { LazyMotionProvider } from './components/LazyMotionProvider';
import { LandingPage } from './components/screens/LandingPage';
import { DocScreen } from './components/screens/DocScreen';
import { GameAppShell } from './components/GameAppShell';

// Lazy-load feature screens
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
import { PrivacyPolicy, TermsOfService } from './components/screens/LegalModals';

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
    isIdentityReady,
    hasNickname,
    setHubScreen,
    setShowSettings,
    patchLegalRoute,
    patchIdentityState,
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
          className={cn(
            'relative h-screen w-full font-mono',
            showLanding ? 'bg-transparent' : 'bg-slate-950',
            gameStatus === GameStatus.PLAYING && !showLanding
              ? 'overflow-hidden'
              : 'overflow-y-auto'
          )}
        >
          <ErrorBoundary>
            {/* Dynamic 2026 SEO & AI Discovery Meta Tags */}
            {showLanding ? (
              <SEO
                title={
                  (t('landing.hero.title_top') as string) +
                  ' ' +
                  (t('landing.hero.title_highlight') as string)
                }
                description={t('landing.hero.description') as string}
                canonicalPath="/"
                lang={language}
                themeColor={isRetro ? '#334155' : '#020617'}
                structuredData={{
                  '@context': 'https://schema.org',
                  '@type': 'VideoGame',
                  name: 'Crypto Survivors',
                  description: t('landing.hero.description') as string,
                  genre: ['Survival', 'Rogue-lite', 'Simulation', 'Arcade'],
                  gamePlatform: ['Web Browser', 'Mobile Browser', 'PWA'],
                  applicationCategory: 'Game',
                  operatingSystem: 'Any',
                  playMode: 'SinglePlayer',
                  author: {
                    '@type': 'Person',
                    name: 'blntunlan',
                  },
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                  },
                }}
                breadcrumbs={[{ name: 'Home', item: '/' }]}
              />
            ) : showDocs ? (
              <SEO
                title={t('landing.nav.docs') as string}
                description="Complete technical protocol documentation for the Crypto Survivors engine, mechanics, and architecture."
                canonicalPath="/docs"
                lang={language}
                breadcrumbs={[
                  { name: 'Home', item: '/' },
                  { name: 'Documentation', item: '/docs' },
                ]}
              />
            ) : showPrivacy ? (
              <SEO
                title={t('landing.footer.privacy') as string}
                description="Our commitment to protecting your privacy and gaming data."
                canonicalPath="/privacy"
                lang={language}
                breadcrumbs={[
                  { name: 'Home', item: '/' },
                  { name: 'Privacy', item: '/privacy' },
                ]}
              />
            ) : showTerms ? (
              <SEO
                title={t('landing.footer.terms') as string}
                description="Official terms and conditions for playing Crypto Survivors."
                canonicalPath="/terms"
                lang={language}
                breadcrumbs={[
                  { name: 'Home', item: '/' },
                  { name: 'Terms', item: '/terms' },
                ]}
              />
            ) : (
              <SEO
                title={
                  gameStatus === GameStatus.PLAYING
                    ? '🔴 LIVE SESSION'
                    : (t('hub.play') as string)
                }
                noindex={true}
                lang={language}
              />
            )}

            {showLanding ? (
              <LandingPage
                onLaunch={handleLaunchGame}
                onViewPrivacy={() => {
                  patchLegalRoute({
                    showPrivacy: true,
                    showTerms: false,
                  });
                  window.history.pushState(null, '', '/privacy');
                }}
                onViewTerms={() => {
                  patchLegalRoute({
                    showTerms: true,
                    showPrivacy: false,
                  });
                  window.history.pushState(null, '', '/terms');
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
                isIdentityReady={isIdentityReady}
                hasNickname={hasNickname}
                showDocs={showDocs}
                showPrivacy={showPrivacy}
                showTerms={showTerms}
                patchIdentityState={patchIdentityState}
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
              <PrivacyPolicy
                onClose={() => {
                  patchLegalRoute({ showPrivacy: false });
                  if (window.location.pathname === '/privacy') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                onViewTerms={() => {
                  patchLegalRoute({
                    showPrivacy: false,
                    showTerms: true,
                  });
                  window.history.pushState(null, '', '/terms');
                }}
              />
            )}
            {showTerms && (
              <TermsOfService
                onClose={() => {
                  patchLegalRoute({ showTerms: false });
                  if (window.location.pathname === '/terms') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                onViewPrivacy={() => {
                  patchLegalRoute({
                    showTerms: false,
                    showPrivacy: true,
                  });
                  window.history.pushState(null, '', '/privacy');
                }}
              />
            )}
            {showDocs && (
              <DocScreen
                onClose={() => {
                  patchLegalRoute({ showDocs: false });
                  window.location.hash = '';
                  if (window.location.pathname === '/docs') {
                    window.history.pushState(null, '', '/');
                  }
                }}
              />
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
