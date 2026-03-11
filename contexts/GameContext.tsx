/**
 * GameContext - State Context Splitting
 *
 * Separates game state into different contexts to prevent unnecessary re-renders.
 * Components only subscribe to the context they actually need.
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { type Player, type MarketData, GameStatus, MarketPosition } from '../types';
import { PLAYER_INITIAL_HP } from '../constants';

const createInitialMarketData = (): MarketData => ({
  price: 0,
  volume: 0,
  pnl: 0,
  effectivePnl: 0,
  leverage: 1,
  rsi: 50,
  difficulty: 1,
  momentum: 0,
});

const createInitialPlayer = (): Player => ({
  x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  radius: 12,
  color: '',
  hp: PLAYER_INITIAL_HP,
  maxHp: PLAYER_INITIAL_HP,
  level: 1,
  exp: 0,
  nextLevelExp: 100,
  speed: 5,
  fireRate: 400,
  critChance: 0.05,
  critDamage: 2.0,
  baseDamage: 25,
  luck: 0,
  area: 1.0,
  projectiles: 1,
  armor: 0,
  regen: 0,
  dodge: 0,
  lifesteal: 0,
  magnet: 0,
  invulnerabilityTimer: 0,
});

const useRequiredContext = <T,>(
  context: React.Context<T | null>,
  hookName: string,
  providerName: string
): T => {
  const ctx = useContext(context);
  if (!ctx) {
    throw new Error(`${hookName} must be used within ${providerName}`);
  }
  return ctx;
};

// =============================================================================
// MARKET CONTEXT - Updates frequently (every price tick)
// =============================================================================

interface MarketContextType {
  marketData: MarketData;
  setMarketData: React.Dispatch<React.SetStateAction<MarketData>>;
}

const MarketContext = createContext<MarketContextType | null>(null);

export const useMarket = (): MarketContextType =>
  useRequiredContext(MarketContext, 'useMarket', 'MarketProvider');

// =============================================================================
// GAME STATE CONTEXT - Updates on game events
// =============================================================================

interface GameStateContextType {
  gameStatus: GameStatus;
  setGameStatus: React.Dispatch<React.SetStateAction<GameStatus>>;
  position: MarketPosition;
  setPosition: React.Dispatch<React.SetStateAction<MarketPosition>>;
  entryPrice: number;
  setEntryPrice: React.Dispatch<React.SetStateAction<number>>;
}

const GameStateContext = createContext<GameStateContextType | null>(null);

export const useGameState = (): GameStateContextType =>
  useRequiredContext(GameStateContext, 'useGameState', 'GameProvider');

// =============================================================================
// PLAYER CONTEXT - Updates on player changes
// =============================================================================

interface PlayerContextType {
  player: Player;
  playerRef: React.RefObject<Player | null>;
  updatePlayer: (updates: Partial<Player>) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = (): PlayerContextType =>
  useRequiredContext(PlayerContext, 'usePlayer', 'PlayerProvider');

// =============================================================================
// COMBINED PROVIDER
// =============================================================================

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  // Market State (high frequency updates)
  const [marketData, setMarketData] = useState<MarketData>(() =>
    createInitialMarketData()
  );

  // Game State (event-based updates)
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);
  const [entryPrice, setEntryPrice] = useState<number>(0);

  // Player State
  const initialPlayer = useMemo(() => createInitialPlayer(), []);
  const playerRef = useRef<Player | null>(initialPlayer);
  const [player, setPlayer] = useState<Player>(initialPlayer);

  const updatePlayer = useCallback((updates: Partial<Player>) => {
    if (!playerRef.current) return;

    playerRef.current = { ...playerRef.current, ...updates };
    setPlayer({ ...playerRef.current });
  }, []);

  const marketValue = useMemo(() => ({ marketData, setMarketData }), [marketData]);

  const gameStateValue = useMemo(
    () => ({
      gameStatus,
      setGameStatus,
      position,
      setPosition,
      entryPrice,
      setEntryPrice,
    }),
    [gameStatus, position, entryPrice]
  );

  const playerValue = useMemo(
    () => ({ player, playerRef, updatePlayer }),
    [player, updatePlayer]
  );

  return (
    <MarketContext.Provider value={marketValue}>
      <GameStateContext.Provider value={gameStateValue}>
        <PlayerContext.Provider value={playerValue}>{children}</PlayerContext.Provider>
      </GameStateContext.Provider>
    </MarketContext.Provider>
  );
};

// =============================================================================
// SELECTOR HOOKS (for fine-grained subscriptions)
// =============================================================================

export const useGameStatus = () => {
  const { gameStatus } = useGameState();
  return gameStatus;
};

export const usePnL = () => {
  const { marketData } = useMarket();
  return marketData.pnl;
};

export const useDifficulty = () => {
  const { marketData } = useMarket();
  return marketData.difficulty;
};

export const usePrice = () => {
  const { marketData } = useMarket();
  return marketData.price;
};
