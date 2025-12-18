/**
 * GameContext - State Context Splitting
 *
 * Separates game state into different contexts to prevent unnecessary re-renders.
 * Components only subscribe to the context they actually need.
 */

import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { Player, MarketData, GameStatus, MarketPosition } from '../types';
import { PLAYER_INITIAL_HP, INITIAL_FIRE_RATE } from '../constants';

// =============================================================================
// MARKET CONTEXT - Updates frequently (every price tick)
// =============================================================================

interface MarketContextType {
  marketData: MarketData;
  setMarketData: React.Dispatch<React.SetStateAction<MarketData>>;
}

const MarketContext = createContext<MarketContextType | null>(null);

export const useMarket = () => {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
};

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

export const useGameState = () => {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameProvider');
  return ctx;
};

// =============================================================================
// PLAYER CONTEXT - Updates on player changes
// =============================================================================

interface PlayerContextType {
  player: Player;
  playerRef: React.MutableRefObject<Player>;
  updatePlayer: (updates: Partial<Player>) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};

// =============================================================================
// COMBINED PROVIDER
// =============================================================================

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  // Market State (high frequency updates)
  const [marketData, setMarketData] = useState<MarketData>({
    price: 0,
    volume: 0,
    pnl: 0,
    rsi: 50,
    difficulty: 1,
  });

  // Game State (event-based updates)
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);
  const [entryPrice, setEntryPrice] = useState<number>(0);

  // Player State
  const playerRef = useRef<Player>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 12,
    color: '',
    hp: PLAYER_INITIAL_HP,
    maxHp: PLAYER_INITIAL_HP,
    level: 1,
    exp: 0,
    nextLevelExp: 100,
    speed: 4,
    fireRate: INITIAL_FIRE_RATE,
    critChance: 0.05,
    baseDamage: 25,
    luck: 0,
    magnet: 0,
    armor: 0,
    area: 1,
    projectiles: 1,
  });

  const [player, setPlayer] = useState<Player>(playerRef.current);

  const updatePlayer = useCallback((updates: Partial<Player>) => {
    playerRef.current = { ...playerRef.current, ...updates };
    setPlayer({ ...playerRef.current });
  }, []);

  return (
    <MarketContext.Provider value={{ marketData, setMarketData }}>
      <GameStateContext.Provider
        value={{
          gameStatus,
          setGameStatus,
          position,
          setPosition,
          entryPrice,
          setEntryPrice,
        }}
      >
        <PlayerContext.Provider value={{ player, playerRef, updatePlayer }}>
          {children}
        </PlayerContext.Provider>
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
