import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MarketPosition, MarketData, Player, GameStatus } from './types';
import { MarketService, MarketUpdate } from './services/marketService';
import { GameEngine } from './components/GameEngine';
import { GameUI } from './components/GameUI';
import { PLAYER_INITIAL_HP, MAX_CHART_POINTS, INITIAL_FIRE_RATE, COLORS } from './constants';
import { audio } from './services/audioService';
import { CardSystem, Card, TIER_CONFIG } from './services/CardSystem';
import { DifficultyManager } from './services/DifficultyManager';
import { CheatManager } from './services/CheatManager';
import { EventBus } from './services/EventBus';
import { ComboSystem } from './services/ComboSystem';

const ATR_PERIOD = 14;

const App: React.FC = () => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [_priceHistory, setPriceHistory] = useState<number[]>([]);
  const [upgradeChoices, setUpgradeChoices] = useState<Card[]>([]);
  const [finalPnl, setFinalPnl] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(audio.getMuted());
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [marketData, setMarketData] = useState<MarketData>({
    price: 0,
    volume: 0,
    pnl: 0,
    rsi: 50,
    difficulty: 1,
  });

  const playerRef = useRef<Player>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 12,
    color: COLORS.ELECTRIC_BLUE,
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

  const [uiStats, setUiStats] = useState<Player>(playerRef.current);
  const trHistoryRef = useRef<number[]>([]);
  const prevCloseRef = useRef<number | null>(null);

  // Refs for state to avoid stale closures in market service
  const gameStatusRef = useRef<GameStatus>(gameStatus);
  const positionRef = useRef<MarketPosition>(position);
  const entryPriceRef = useRef<number>(entryPrice);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
    positionRef.current = position;
    entryPriceRef.current = entryPrice;
  }, [gameStatus, position, entryPrice]);

  useEffect(() => {
    const service = new MarketService((update: MarketUpdate) => {
      setMarketData(prev => {
        const currentStatus = gameStatusRef.current;
        const currentEntryPrice = entryPriceRef.current;
        const currentPosition = positionRef.current;
        const price = update.price;

        setPriceHistory(prevHistory => {
          const newHistory = [...prevHistory, price];
          if (newHistory.length > MAX_CHART_POINTS) return newHistory.slice(1);
          return newHistory;
        });

        let currentTR = 0;
        if (update.high !== undefined && update.low !== undefined) {
          const h_l = update.high - update.low;
          const h_pc = prevCloseRef.current ? Math.abs(update.high - prevCloseRef.current) : 0;
          const l_pc = prevCloseRef.current ? Math.abs(update.low - prevCloseRef.current) : 0;
          currentTR = Math.max(h_l, h_pc, l_pc);
          trHistoryRef.current.push(currentTR);
          if (trHistoryRef.current.length > ATR_PERIOD) trHistoryRef.current.shift();
        }
        prevCloseRef.current = price;

        const atr =
          trHistoryRef.current.length > 0
            ? trHistoryRef.current.reduce((a, b) => a + b) / trHistoryRef.current.length
            : 0;

        if (currentStatus === GameStatus.MENU) {
          return { ...prev, price };
        }

        let pnl = 0;
        if (currentEntryPrice > 0) {
          pnl = (price - currentEntryPrice) / currentEntryPrice;
          if (currentPosition === MarketPosition.SHORT) pnl = -pnl;
        }

        const atrPercent = price > 0 ? atr / price : 0;
        const hpPercent = (playerRef.current.hp / playerRef.current.maxHp) * 100;
        const playerLevel = playerRef.current.level;

        // Use DifficultyManager for comprehensive difficulty calculation
        const difficultyOutput = DifficultyManager.calculate(
          pnl,
          atrPercent,
          playerLevel,
          hpPercent,
          16.67 // approximate frame time
        );

        return {
          price,
          volume: update.volume || prev.volume,
          pnl,
          rsi: prev.rsi,
          difficulty: difficultyOutput.total,
        };
      });
    });

    service.connect();
    return () => service.disconnect();
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (gameStatus === GameStatus.PLAYING) setGameStatus(GameStatus.PAUSED);
    else if (gameStatus === GameStatus.PAUSED) setGameStatus(GameStatus.PLAYING);
  }, [gameStatus]);

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p') handlePauseToggle();
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [handlePauseToggle]);

  // Level up handler (moved before CheatManager init)
  const handleLevelUp = useCallback(() => {
    setGameStatus(GameStatus.LEVEL_UP);
    const choices = CardSystem.generateChoices(playerRef.current.luck, playerRef.current.level);
    setUpgradeChoices(choices);
    audio.playLevelUp();
  }, []);

  // Reset game handler
  const resetGame = useCallback(() => {
    setGameStatus(GameStatus.MENU);
    setEntryPrice(0);
    setFinalPnl(0);
    setSessionStartTime(0);
    playerRef.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      radius: 12,
      color: COLORS.ELECTRIC_BLUE,
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
    };
    setUiStats({ ...playerRef.current });
  }, []);

  // Reference to latest functions for CheatManager
  const handleLevelUpRef = useRef(handleLevelUp);
  const resetGameRef = useRef(resetGame);
  handleLevelUpRef.current = handleLevelUp;
  resetGameRef.current = resetGame;

  // Initialize CheatManager for development testing
  useEffect(() => {
    CheatManager.init({
      onLevelUp: () => {
        if (gameStatusRef.current === GameStatus.PLAYING) {
          handleLevelUpRef.current();
        }
      },
      onHeal: () => {
        if (gameStatusRef.current === GameStatus.PLAYING) {
          playerRef.current.hp = playerRef.current.maxHp;
          setUiStats({ ...playerRef.current });
        }
      },
      onKillAll: () => {
        if (gameStatusRef.current === GameStatus.PLAYING) {
          EventBus.emit('killAll', {});
        }
      },
      onToggleGodMode: () => {
        // God mode checked in GameEngine
      },
      onSetLuck: (luck: number) => {
        playerRef.current.luck = luck;
        setUiStats({ ...playerRef.current });
      },
      onAddExp: (amount: number) => {
        if (
          gameStatusRef.current === GameStatus.PLAYING ||
          gameStatusRef.current === GameStatus.LEVEL_UP
        ) {
          playerRef.current.exp += amount;
          setUiStats({ ...playerRef.current });
          if (
            playerRef.current.exp >= playerRef.current.nextLevelExp &&
            gameStatusRef.current === GameStatus.PLAYING
          ) {
            handleLevelUpRef.current();
          }
        }
      },
      onRestart: () => {
        resetGameRef.current();
      },
    });
    return () => CheatManager.destroy();
  }, []);

  const startGame = (choice: MarketPosition) => {
    if (marketData.price === 0) return;
    setPosition(choice);
    setEntryPrice(marketData.price);
    playerRef.current.color = choice === MarketPosition.LONG ? '#22c55e' : '#ef4444';

    // Initialize DifficultyManager for new game
    DifficultyManager.startGame();

    setSessionStartTime(Date.now());
    setGameStatus(GameStatus.PLAYING);
    audio.playLevelUp();
  };

  const selectUpgrade = (card: Card) => {
    const p = playerRef.current;
    const nextP = card.effect(p);
    nextP.level += 1;
    nextP.exp -= nextP.nextLevelExp;
    nextP.nextLevelExp = Math.floor(nextP.nextLevelExp * 1.5);

    playerRef.current = nextP;
    setUiStats({ ...nextP });

    // Logic Fix: Check if still has enough XP for another level
    if (nextP.exp >= nextP.nextLevelExp) {
      handleLevelUp();
    } else {
      setGameStatus(GameStatus.PLAYING);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-mono">
      {/* Background UI always active or contextual */}
      {gameStatus !== GameStatus.MENU && (
        <GameUI
          position={position}
          entryPrice={entryPrice}
          marketData={marketData}
          player={uiStats}
        />
      )}

      <GameEngine
        status={gameStatus}
        position={position}
        marketData={marketData}
        onGameOver={() => {
          setFinalPnl(marketData.pnl);
          setGameStatus(GameStatus.GAMEOVER);
        }}
        onLevelUp={handleLevelUp}
        updatePlayerStats={setUiStats}
        playerRef={playerRef}
        width={dimensions.width}
        height={dimensions.height}
      />

      {/* States UI Overlays */}
      {gameStatus === GameStatus.MENU && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
          <div className="max-w-xl w-full text-center space-y-12">
            <header className="space-y-4">
              <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
                CRYPTO
                <br />
                <span className="text-yellow-500">SURVIVORS</span>
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">
                Market Sentiment Engine
              </p>
            </header>
            <div className="bg-slate-900/40 border border-white/5 p-8 rounded-2xl space-y-8">
              <div className="text-5xl font-black text-white tracking-tighter">
                {marketData.price > 0
                  ? `$${marketData.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : 'CONNECTING...'}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <button
                  onClick={() => startGame(MarketPosition.LONG)}
                  className="flex flex-col items-center p-6 bg-green-500/10 border border-green-500/20 rounded-xl hover:border-green-500 transition-all hover:bg-green-500/20"
                >
                  <div className="text-4xl mb-2">📈</div>
                  <span className="font-black text-green-500 text-lg uppercase">Long</span>
                </button>
                <button
                  onClick={() => startGame(MarketPosition.SHORT)}
                  className="flex flex-col items-center p-6 bg-red-500/10 border border-red-500/20 rounded-xl hover:border-red-500 transition-all hover:bg-red-500/20"
                >
                  <div className="text-4xl mb-2">📉</div>
                  <span className="font-black text-red-500 text-lg uppercase">Short</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameStatus === GameStatus.LEVEL_UP && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-10">
              <h3 className="text-5xl font-black italic text-white tracking-tighter">LEVEL UP</h3>
              <p className="font-bold uppercase text-xs mt-2" style={{ color: COLORS.ELECTRIC_BLUE }}>
                Choose your upgrade - Luck affects rarity!
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upgradeChoices.map(card => {
                const tierConfig = TIER_CONFIG[card.tier];
                return (
                  <button
                    key={card.id}
                    onClick={() => selectUpgrade(card)}
                    className="group flex flex-col items-center text-center p-8 rounded-2xl transition-all hover:scale-105"
                    style={{
                      backgroundColor: tierConfig.bgColor,
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: tierConfig.borderColor,
                      boxShadow:
                        card.tier !== 'common' ? `0 0 20px ${tierConfig.glowColor}40` : 'none',
                    }}
                  >
                    <div
                      className="text-[10px] font-black uppercase tracking-widest mb-2"
                      style={{ color: tierConfig.color }}
                    >
                      {tierConfig.name}
                    </div>
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform flex items-center justify-center w-24 h-24">
                      {card.icon.startsWith('/') ? (
                        <img
                          src={card.icon}
                          alt={card.name}
                          className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                        />
                      ) : (
                        card.icon
                      )}
                    </div>
                    <div
                      className="text-lg font-black mb-2 uppercase"
                      style={{ color: tierConfig.color }}
                    >
                      {card.name}
                    </div>
                    <div className="text-xs text-slate-400 font-bold">{card.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {gameStatus === GameStatus.PAUSED && (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm w-full px-6">
            <h2 className="text-6xl font-black text-white italic tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
              MARKET HALTED
            </h2>

            {/* Run Stats */}
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4">
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Run Duration</p>
                <p className="text-lg font-bold text-white font-mono">
                  {Math.floor((Date.now() - sessionStartTime) / 60000)}:
                  {String(Math.floor(((Date.now() - sessionStartTime) % 60000) / 1000)).padStart(2, '0')}
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Total Kills</p>
                <p className="text-lg font-bold text-white font-mono">{ComboSystem.getTotalKills()}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Max Combo</p>
                <p className="text-lg font-bold text-white font-mono">{ComboSystem.getMaxStreak()}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Bonus XP</p>
                <p className="text-lg font-bold text-white font-mono">{Math.floor(ComboSystem.getState().totalBonusXp)}</p>
              </div>
            </div>

            <button
              onClick={() => setGameStatus(GameStatus.PLAYING)}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-lg hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Resume Session
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={resetGame}
                className="py-3 bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-lg border border-white/10 hover:bg-red-600 transition-all"
              >
                Restart
              </button>
              <button
                onClick={() => setGameStatus(GameStatus.MENU)}
                className="py-3 bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-lg border border-white/10 hover:bg-slate-700 transition-all"
              >
                Main Menu
              </button>
            </div>

            <button
              onClick={() => setIsMuted(audio.toggleMute())}
              className="w-full py-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all underline underline-offset-4 decoration-white/10"
            >
              Audio: {isMuted ? 'OFF' : 'ON'}
            </button>

            <p className="pt-4 text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">
              Session ID: {Math.random().toString(36).substring(7).toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {gameStatus === GameStatus.GAMEOVER && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center text-center p-6">
          <h2 className="text-8xl font-black text-white italic tracking-tighter mb-4">
            LIQUIDATED
          </h2>
          <div className="bg-slate-900/50 border border-red-500/30 p-10 rounded-2xl space-y-6 max-w-md w-full">
            <div className="grid grid-cols-2 gap-8 text-left">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase">Level</p>
                <p className="text-4xl font-black text-white">L{uiStats.level}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase">P&L</p>
                <p
                  className={`text-4xl font-black ${finalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}
                  style={{ color: finalPnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE }}
                >
                  {(finalPnl * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <button
              onClick={resetGame}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] rounded-lg hover:bg-yellow-500 transition-all"
            >
              Back to Terminal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
