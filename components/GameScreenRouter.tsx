/**
 * GameScreenRouter - In-game screen orchestration
 *
 * Renders the GameEngine canvas plus all overlay screens
 * (GameOver, Pause, LevelUp, CycleComplete, etc.) based on current game status.
 * Extracted from App.tsx to keep that file focused on hooks and state management.
 */

import React, { type Dispatch, type SetStateAction } from 'react';
import {
  GameStatus,
  type MarketData,
  type Player,
  type MarketPosition,
  type LeverageOption,
} from '../types';
import { type CryptoPair } from '../types/crypto';
import { type GameMode, type CycleCompleteData } from '../types/gameMode';
import { type Card } from '../services/cards/types';
import { type PauseBudgetState } from '../hooks/usePauseBudget';
import { type PauseMenuStats } from '../hooks/useGameFlowController';
import { type useTutorial } from '../hooks/useTutorial';
import GameEngine from './GameEngine';
import { GameUI } from './GameUI';
import { NicknameEntryScreen } from './screens/NicknameEntryScreen';
import { TutorialOverlay } from './screens/TutorialOverlay';
import { HubMenu, type HubScreen } from './hub';
import { MainMenu } from './screens/MainMenu';
import { CycleCompleteScreen } from './screens/CycleCompleteScreen';
import { MarketDisconnectedScreen } from './screens/MarketDisconnectedScreen';
import { LevelUpScreen } from './screens/LevelUpScreen';
import { NotificationSystem } from './hud';
import { UserSessionService } from '../services/auth/UserSessionService';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { CoinService } from '../services/gameplay/CoinService';
import { useDevice } from '../hooks/useDevice';
import { OverlayBackButton } from './ui/OverlayChrome';

const UIFallback = () => null;
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

const LeaderboardPanel = React.lazy(() =>
  import('./hud/LeaderboardPanel').then(m => ({ default: m.LeaderboardPanel }))
);
const PauseMenu = React.lazy(() =>
  import('./screens/PauseMenu').then(m => ({ default: m.PauseMenu }))
);
const GameOverScreen = React.lazy(() =>
  import('./screens/GameOverScreen').then(m => ({ default: m.GameOverScreen }))
);
const SettingsPanel = React.lazy(() =>
  import('./settings/SettingsPanel').then(m => ({ default: m.SettingsPanel }))
);

type TutorialState = ReturnType<typeof useTutorial>;

export interface GameScreenRouterProps {
  gameStatus: GameStatus;
  gameMode: GameMode;
  position: MarketPosition;
  entryPrice: number;
  selectedPair: CryptoPair;
  marketData: MarketData;
  playerRef: React.RefObject<Player>;
  uiStats: Player;
  setUiStats: Dispatch<SetStateAction<Player>>;
  dimensions: { width: number; height: number };

  handleGameOver: () => void;
  handleLevelUp: () => void;
  handlePauseToggle: () => void;
  handleCashOut: () => Promise<void>;
  handleContinue: () => void;
  selectUpgrade: (card: Card) => void;
  resetGame: () => void;
  startGame: (choice: MarketPosition, leverage: LeverageOption) => Promise<void>;

  upgradeChoices: Card[];
  cycleData: CycleCompleteData | null;
  pauseMenuStats: PauseMenuStats;
  frozenPnlRef: React.RefObject<number>;
  pauseBudget: PauseBudgetState;
  audioState: { isMuted: boolean };
  toggleMute: () => void;
  walletBalance: number;
  hubScreen: HubScreen;
  setHubScreen: (s: HubScreen) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  handleReturnToLanding: () => void;
  setSelectedPair: (p: CryptoPair) => void;
  setGameMode: (m: GameMode) => void;

  shouldShowNicknameEntry: boolean;
  patchIdentityState: (patch: { hasNickname: boolean }) => void;
  tutorial: TutorialState;
  onOpenUpgrades?: () => void;
  onOpenChallenges?: () => void;
  onOpenReplays?: () => void;
}

export const GameScreenRouter: React.FC<GameScreenRouterProps> = ({
  gameStatus,
  gameMode,
  position,
  entryPrice,
  selectedPair,
  marketData,
  playerRef,
  uiStats,
  setUiStats,
  dimensions,
  handleGameOver,
  handleLevelUp,
  handlePauseToggle,
  handleCashOut,
  handleContinue,
  selectUpgrade,
  resetGame,
  startGame,
  upgradeChoices,
  cycleData,
  pauseMenuStats,
  frozenPnlRef,
  pauseBudget,
  audioState,
  toggleMute,
  walletBalance,
  hubScreen,
  setHubScreen,
  showSettings,
  setShowSettings,
  handleReturnToLanding,
  setSelectedPair,
  setGameMode,
  shouldShowNicknameEntry,
  patchIdentityState,
  tutorial,
  onOpenUpgrades,
  onOpenChallenges,
  onOpenReplays,
}) => {
  const device = useDevice();
  const [useHubV2, setUseHubV2] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setUseHubV2(params.get('hubV2') === '1');
  }, []);

  return (
    <>
      <NotificationSystem />

      {shouldShowNicknameEntry && (
        <NicknameEntryScreen
          onComplete={() => patchIdentityState({ hasNickname: true })}
        />
      )}

      <React.Suspense fallback={<FallbackLoader />}>
        {tutorial.showTutorial &&
          gameStatus === GameStatus.MENU &&
          hubScreen === 'hub' && (
            <TutorialOverlay
              step={tutorial.currentStep}
              stepIndex={tutorial.currentStepIndex}
              totalSteps={tutorial.totalSteps}
              isFirstStep={tutorial.isFirstStep}
              isLastStep={tutorial.isLastStep}
              onNext={tutorial.nextStep}
              onPrev={tutorial.prevStep}
              onSkip={tutorial.skipTutorial}
              onComplete={tutorial.completeTutorial}
            />
          )}

        <React.Suspense fallback={<FallbackLoader />}>
          <GameEngine
            status={gameStatus}
            position={position}
            pair={selectedPair}
            marketData={marketData}
            onGameOver={handleGameOver}
            onLevelUp={handleLevelUp}
            updatePlayerStats={setUiStats}
            playerRef={playerRef}
            width={dimensions.width}
            height={dimensions.height}
            gameMode={gameMode}
          />
        </React.Suspense>

        {gameStatus !== GameStatus.MENU && (
          <React.Suspense fallback={<UIFallback />}>
            <GameUI
              position={position}
              entryPrice={entryPrice}
              marketData={marketData}
              player={uiStats}
              onTogglePause={handlePauseToggle}
              status={gameStatus}
            />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.GAMEOVER && (
          <React.Suspense fallback={<UIFallback />}>
            <GameOverScreen
              level={playerRef.current.level}
              finalPnl={frozenPnlRef.current}
              survivalTime={DifficultyManager.getTotalElapsedSeconds()}
              kills={pauseMenuStats.totalKills}
              onRestart={resetGame}
              coinsEarned={CoinService.getSessionCoins()}
            />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.PAUSED && (
          <React.Suspense fallback={<UIFallback />}>
            <PauseMenu
              runStats={pauseMenuStats}
              onResume={handlePauseToggle}
              onRestart={resetGame}
              onMainMenu={resetGame}
              onOpenSettings={() => setShowSettings(true)}
              isMuted={audioState.isMuted}
              onToggleMute={toggleMute}
              pauseSecondsRemaining={pauseBudget.remainingSeconds}
              pauseSecondsMax={pauseBudget.maxSeconds}
            />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.MENU && hubScreen === 'hub' && (
          <React.Suspense fallback={<UIFallback />}>
            {useHubV2 ? (
              <HubMenuV2
                nickname={UserSessionService.getNickname() ?? 'Survivor'}
                coins={walletBalance}
                onNavigate={screen => {
                  if (screen === 'gear') {
                    setShowSettings(true);
                  } else {
                    setHubScreen(screen);
                  }
                }}
                onBack={handleReturnToLanding}
              />
            ) : (
              <HubMenu
                nickname={UserSessionService.getNickname() ?? 'Survivor'}
                coins={walletBalance}
                onNavigate={screen => {
                  if (screen === 'gear') {
                    setShowSettings(true);
                  } else {
                    setHubScreen(screen);
                  }
                }}
                onBack={handleReturnToLanding}
              />
            )}
          </React.Suspense>
        )}

        {gameStatus === GameStatus.MENU && hubScreen === 'play' && (
          <React.Suspense fallback={<UIFallback />}>
            <MainMenu
              price={marketData.price}
              onStart={(c, l) => void startGame(c, l)}
              onOpenSettings={() => setShowSettings(true)}
              onOpenUpgrades={onOpenUpgrades}
              onOpenChallenges={onOpenChallenges}
              onOpenReplays={onOpenReplays}
              selectedPair={selectedPair}
              onPairChange={setSelectedPair}
              selectedMode={gameMode}
              onModeChange={setGameMode}
            />
            <OverlayBackButton
              onClick={() => setHubScreen('hub')}
              label={!device.isMobile ? 'Hub' : undefined}
            />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.CYCLE_COMPLETE && cycleData && (
          <React.Suspense fallback={<UIFallback />}>
            <CycleCompleteScreen
              data={cycleData}
              onCashOut={handleCashOut}
              onContinue={handleContinue}
            />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.DATA_DISCONNECTED && (
          <React.Suspense fallback={<UIFallback />}>
            <MarketDisconnectedScreen onBackToMenu={resetGame} />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.MENU &&
          (hubScreen === 'ranks' || hubScreen === 'play') && (
            <React.Suspense fallback={null}>
              <LeaderboardPanel />
            </React.Suspense>
          )}

        {showSettings && (
          <React.Suspense fallback={<UIFallback />}>
            <SettingsPanel
              onClose={() => setShowSettings(false)}
              isInGame={gameStatus !== GameStatus.MENU}
              onReplayTutorial={tutorial.startTutorial}
            />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.LEVEL_UP && (
          <React.Suspense fallback={<UIFallback />}>
            <LevelUpScreen
              upgradeChoices={upgradeChoices}
              onSelect={selectUpgrade}
              gameMode={gameMode}
            />
          </React.Suspense>
        )}
      </React.Suspense>
    </>
  );
};
