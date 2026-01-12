/**
 * Admin Dashboard Shell
 *
 * Main container component for the Admin Dashboard
 * Provides the layout structure and navigation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  TrendingUp,
  Activity,
  Sliders,
  Package,
  Palette,
  Download,
  RotateCcw,
  Save,
  ShieldAlert,
  Terminal,
  Upload,
  X,
} from 'lucide-react';
import { useAdminConfigStore } from '../../stores/admin/configStore';
import { priceAnalyzer } from '../../services/admin/PriceAnalyzerService';
import { adminPriceFeed } from '../../services/admin/AdminPriceFeedService';
import {
  adminAnalytics,
  type MarketHealth,
  type ErrorOccurence,
} from '../../services/admin/AdminAnalyticsService';
import type { CryptoPair, PriceAnalysis, TrendDirection } from '../../types/admin';

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'price' | 'difficulty' | 'spawn' | 'items' | 'visuals' | 'analytics';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface AdminDashboardProps {
  onClose: () => void;
}

// =============================================================================
// TAB CONFIG
// =============================================================================

const TABS: Tab[] = [
  { id: 'price', label: 'Price Analysis', icon: <TrendingUp size={18} /> },
  { id: 'difficulty', label: 'Difficulty', icon: <Activity size={18} /> },
  { id: 'spawn', label: 'Spawn Config', icon: <Settings size={18} /> },
  { id: 'items', label: 'Items & Drops', icon: <Package size={18} /> },
  { id: 'visuals', label: 'Visuals', icon: <Palette size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <Activity size={18} /> },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('price');

  // Start background price feeds for all pairs when dashboard opens
  // Also load historical data from Supabase for accurate change calculations
  useEffect(() => {
    adminPriceFeed.start();

    // Load historical price data from Supabase
    void priceAnalyzer.loadHistoryFromSupabase();

    return () => {
      // Don't stop on unmount - keep feeds running for next open
      // adminPriceFeed.stop();
    };
  }, []);

  const { config, isDirty, saveConfig, resetToDefaults, exportConfig, importConfig } =
    useAdminConfigStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
      // Ctrl+S to save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveConfig();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saveConfig]);

  // Export handler
  const handleExport = () => {
    const json = exportConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import handler
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const success = importConfig(text);
      if (!success) {
        alert('Failed to import config. Please check the file format.');
      }
    };
    input.click();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Sliders className="text-cyan-400" size={24} />
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              {isDirty && (
                <span className="px-2 py-0.5 text-xs font-medium text-amber-400 bg-amber-400/10 rounded">
                  Unsaved Changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Action buttons */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Export Config"
              >
                <Download size={16} />
                Export
              </button>

              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Import Config"
              >
                <Upload size={16} />
                Import
              </button>

              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset to Defaults"
              >
                <RotateCcw size={16} />
                Reset
              </button>

              <button
                onClick={saveConfig}
                disabled={!isDirty}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDirty
                    ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save size={16} />
                Save
              </button>

              <div className="w-px h-8 bg-slate-700 mx-2" />

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex px-6 gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-slate-400 border-transparent hover:text-white hover:border-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'price' && <PricePanel />}
              {activeTab === 'difficulty' && <DifficultyPanel />}
              {activeTab === 'spawn' && <SpawnPanel />}
              {activeTab === 'items' && <ItemsPanel />}
              {activeTab === 'visuals' && <VisualsPanel />}
              {activeTab === 'analytics' && <AnalyticsPanel />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-slate-800 bg-slate-900/50 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Config Version: {config.version}</span>
            <span>Last Modified: {new Date(config.lastModified).toLocaleString()}</span>
          </div>
        </footer>
      </div>
    </motion.div>
  );
};

// =============================================================================
// PRICE PANEL - Live Price Analysis
// =============================================================================

const PricePanel: React.FC = () => {
  const [analyses, setAnalyses] = useState<Record<CryptoPair, PriceAnalysis | null>>({
    BTC: null,
    ETH: null,
    SOL: null,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const analyzer = priceAnalyzer;

    // Subscribe to price updates
    const unsubscribe = analyzer.subscribe((pair, analysis) => {
      setAnalyses(prev => ({ ...prev, [pair]: analysis }));
      setIsConnected(true);
    });

    // Initial load
    setAnalyses(analyzer.getAllAnalyses());

    return () => unsubscribe();
  }, []);

  const formatPrice = (price: number): string => {
    if (price >= 10000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatChange = (change: number): { text: string; color: string } => {
    const sign = change >= 0 ? '+' : '';
    return {
      text: `${sign}${change.toFixed(2)}%`,
      color:
        change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-400',
    };
  };

  const getTrendIcon = (trend: TrendDirection): string => {
    switch (trend) {
      case 'bullish':
        return '📈';
      case 'bearish':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: TrendDirection): string => {
    switch (trend) {
      case 'bullish':
        return 'text-green-400';
      case 'bearish':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Price Analysis</h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          />
          <span className="text-sm text-slate-400">
            {isConnected ? 'Live Data' : 'Waiting for data...'}
          </span>
        </div>
      </div>

      {/* Price Cards */}
      <div className="grid grid-cols-3 gap-4">
        {(['BTC', 'ETH', 'SOL'] as CryptoPair[]).map(pair => {
          const analysis = analyses[pair];
          const change5m = analysis ? formatChange(analysis.change5m) : null;

          return (
            <div
              key={pair}
              className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-400">{pair}/USDT</span>
                {analysis && (
                  <span className={`text-lg ${getTrendColor(analysis.trend)}`}>
                    {getTrendIcon(analysis.trend)}
                  </span>
                )}
              </div>

              <div className="text-2xl font-bold text-white mb-2">
                {analysis ? `$${formatPrice(analysis.currentPrice)}` : '$--,---'}
              </div>

              {analysis ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">5m Change</span>
                    <span className={change5m?.color}>{change5m?.text}</span>
                  </div>

                  {/* Volatility Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Volatility</span>
                      <span>{(analysis.volatility * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          analysis.volatility > 0.7
                            ? 'bg-red-500'
                            : analysis.volatility > 0.4
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${analysis.volatility * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Trend Strength */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Trend: {analysis.trend}</span>
                      <span>{(analysis.trendStrength * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getTrendColor(analysis.trend).replace('text-', 'bg-')}`}
                        style={{ width: `${analysis.trendStrength * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 animate-pulse">
                  Connecting...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Analysis Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-slate-400">
              <th className="text-left px-4 py-3 font-medium">Pair</th>
              <th className="text-right px-4 py-3 font-medium">5m</th>
              <th className="text-right px-4 py-3 font-medium">10m</th>
              <th className="text-right px-4 py-3 font-medium">30m</th>
              <th className="text-right px-4 py-3 font-medium">1h</th>
              <th className="text-right px-4 py-3 font-medium">ATR</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(['BTC', 'ETH', 'SOL'] as CryptoPair[]).map(pair => {
              const a = analyses[pair];
              return (
                <tr
                  key={pair}
                  className="border-t border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 font-medium text-white">{pair}</td>
                  <td
                    className={`px-4 py-3 text-right ${a ? formatChange(a.change5m).color : 'text-slate-500'}`}
                  >
                    {a ? formatChange(a.change5m).text : '-'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${a ? formatChange(a.change10m).color : 'text-slate-500'}`}
                  >
                    {a ? formatChange(a.change10m).text : '-'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${a ? formatChange(a.change30m).color : 'text-slate-500'}`}
                  >
                    {a ? formatChange(a.change30m).text : '-'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${a ? formatChange(a.change1h).color : 'text-slate-500'}`}
                  >
                    {a ? formatChange(a.change1h).text : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {a ? `$${a.atr.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a ? (
                      a.isStale ? (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                          Stale
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                          Live
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-slate-500/20 text-slate-400 rounded">
                        --
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <span className="text-blue-400 text-lg">ℹ️</span>
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">Price data integration</p>
          <p className="text-blue-400/80">
            Connect the game's MarketService to PriceAnalyzerService for live updates.
            Currently showing cached/simulated data if available.
          </p>
        </div>
      </div>
    </div>
  );
};

const DifficultyPanel: React.FC = () => {
  const { config, updateDifficulty } = useAdminConfigStore();
  const { difficulty } = config;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Difficulty Settings</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Base Difficulty */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Base Difficulty
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={difficulty.base}
            onChange={e => updateDifficulty({ base: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-slate-500 mt-2">
            <span>Easy (1)</span>
            <span className="text-cyan-400 font-medium">{difficulty.base}</span>
            <span>Hard (10)</span>
          </div>
        </div>

        {/* Volatility Multiplier */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Volatility Multiplier
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={difficulty.volatilityMultiplier}
            onChange={e =>
              updateDifficulty({ volatilityMultiplier: parseFloat(e.target.value) })
            }
            className="w-full"
          />
          <div className="flex justify-between text-sm text-slate-500 mt-2">
            <span>0.5x</span>
            <span className="text-cyan-400 font-medium">
              {difficulty.volatilityMultiplier.toFixed(1)}x
            </span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Max Difficulty */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Max Difficulty Cap
          </label>
          <input
            type="number"
            min="5"
            max="20"
            value={difficulty.maxDifficulty}
            onChange={e =>
              updateDifficulty({ maxDifficulty: parseInt(e.target.value) })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        {/* Curve */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Difficulty Curve
          </label>
          <select
            value={difficulty.curve}
            onChange={e =>
              updateDifficulty({
                curve: e.target.value as 'linear' | 'exponential' | 'logarithmic',
              })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          >
            <option value="linear">Linear</option>
            <option value="exponential">Exponential</option>
            <option value="logarithmic">Logarithmic</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const SpawnPanel: React.FC = () => {
  const { config, updateSpawn } = useAdminConfigStore();
  const { spawn } = config;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Spawn Configuration</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Base Spawn Interval (ms)
          </label>
          <input
            type="number"
            min="500"
            max="5000"
            step="100"
            value={spawn.baseInterval}
            onChange={e => updateSpawn({ baseInterval: parseInt(e.target.value) })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Max Enemies
          </label>
          <input
            type="number"
            min="10"
            max="200"
            value={spawn.maxEnemies}
            onChange={e => updateSpawn({ maxEnemies: parseInt(e.target.value) })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Wave Intensity
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={spawn.waveIntensity}
            onChange={e => updateSpawn({ waveIntensity: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="text-center text-sm text-cyan-400 mt-2">
            {(spawn.waveIntensity * 100).toFixed(0)}%
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Boss Spawn Time (seconds)
          </label>
          <input
            type="number"
            min="30"
            max="300"
            value={spawn.bossSpawnTime / 1000}
            onChange={e =>
              updateSpawn({ bossSpawnTime: parseInt(e.target.value) * 1000 })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>
      </div>
    </div>
  );
};

const ItemsPanel: React.FC = () => {
  const { config, updateItems } = useAdminConfigStore();
  const { items } = config;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Items & Drop Rates</h2>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Gem Drop Rate
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={items.gemDropRate}
            onChange={e => updateItems({ gemDropRate: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="text-center text-sm text-cyan-400 mt-2">
            {(items.gemDropRate * 100).toFixed(0)}%
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Health Drop Rate
          </label>
          <input
            type="range"
            min="0"
            max="0.2"
            step="0.01"
            value={items.healthDropRate}
            onChange={e => updateItems({ healthDropRate: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="text-center text-sm text-green-400 mt-2">
            {(items.healthDropRate * 100).toFixed(0)}%
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Power-up Drop Rate
          </label>
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.01"
            value={items.powerUpDropRate}
            onChange={e => updateItems({ powerUpDropRate: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="text-center text-sm text-purple-400 mt-2">
            {(items.powerUpDropRate * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
};

const VisualsPanel: React.FC = () => {
  const { config, updateVisuals } = useAdminConfigStore();
  const { visuals } = config;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Visual Settings</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">Theme</label>
          <select
            value={visuals.theme}
            onChange={e =>
              updateVisuals({
                theme: e.target.value as 'btc' | 'eth' | 'sol' | 'custom',
              })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          >
            <option value="btc">Bitcoin (Orange)</option>
            <option value="eth">Ethereum (Purple)</option>
            <option value="sol">Solana (Teal)</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Particle Density
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={visuals.particleDensity}
            onChange={e =>
              updateVisuals({ particleDensity: parseFloat(e.target.value) })
            }
            className="w-full"
          />
          <div className="text-center text-sm text-cyan-400 mt-2">
            {(visuals.particleDensity * 100).toFixed(0)}%
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={visuals.screenShake}
              onChange={e => updateVisuals({ screenShake: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600"
            />
            <span className="text-sm font-medium text-slate-300">Screen Shake</span>
          </label>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={visuals.glowEffects}
              onChange={e => updateVisuals({ glowEffects: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600"
            />
            <span className="text-sm font-medium text-slate-300">Glow Effects</span>
          </label>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// ANALYTICS PANEL - Market Health & Error Reports
// =============================================================================

const AnalyticsPanel: React.FC = () => {
  const [health, setHealth] = useState<MarketHealth | null>(null);
  const [errors, setErrors] = useState<ErrorOccurence[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [h, e] = await Promise.all([
        adminAnalytics.getMarketHealth(),
        adminAnalytics.getErrorSummary(),
      ]);
      setHealth(h);
      setErrors(e as ErrorOccurence[]);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleResolve = (type: string) => {
    void adminAnalytics.resolveError(type).then(success => {
      if (success) {
        setErrors(prev => prev.filter(e => e.error_type !== type));
      }
    });
  };

  if (isLoading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyan-400 animate-pulse font-mono">
          LOADING ANALYTICS...
        </div>
      </div>
    );
  }

  const currentHealth = health ?? {
    status: 'no_data',
    last_ping: null,
    delay_seconds: null,
  };

  return (
    <div className="space-y-8">
      {/* Market Health Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity size={20} className="text-cyan-400" />
            Market System Health
          </h2>
          <button
            onClick={() => {
              void fetchData();
            }}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Refresh Now
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="text-sm text-slate-500 mb-1">Status</div>
            <div
              className={`text-xl font-bold flex items-center gap-2 ${
                currentHealth.status === 'healthy'
                  ? 'text-green-400'
                  : currentHealth.status === 'stale'
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  currentHealth.status === 'healthy'
                    ? 'bg-green-500'
                    : currentHealth.status === 'stale'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
              />
              {currentHealth.status.toUpperCase() || 'OFFLINE'}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="text-sm text-slate-500 mb-1">Last Data Ping</div>
            <div className="text-xl font-bold text-white">
              {currentHealth.last_ping
                ? new Date(currentHealth.last_ping).toLocaleTimeString()
                : 'N/A'}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="text-sm text-slate-500 mb-1">Latency</div>
            <div className="text-xl font-bold text-white">
              {currentHealth.delay_seconds !== null
                ? `${currentHealth.delay_seconds}s`
                : '--'}
            </div>
          </div>
        </div>
      </section>

      {/* Error Reports Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-400" />
            Top Active Errors
          </h2>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-4 py-3">Error Type / Category</th>
                <th className="px-4 py-3 text-center">Severity</th>
                <th className="px-4 py-3 text-center">Count</th>
                <th className="px-4 py-3 text-right">Last Seen</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {errors.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500 italic"
                  >
                    No active errors reported. Everything is running smoothly!
                  </td>
                </tr>
              ) : (
                errors.map(err => (
                  <tr
                    key={err.error_type}
                    className="hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{err.error_type}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">
                        {err.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          err.severity === 'critical'
                            ? 'bg-red-500 text-white'
                            : err.severity === 'high'
                              ? 'bg-orange-500/20 text-orange-400'
                              : err.severity === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-500'
                                : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {err.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-cyan-400">
                      {err.occurrences}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {new Date(err.last_seen).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          handleResolve(err.error_type);
                        }}
                        className="px-3 py-1 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/20 rounded-lg text-xs transition-all"
                      >
                        Resolve All
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Monitoring Info */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex gap-3">
        <Terminal size={20} className="text-slate-500 mt-1" />
        <div className="text-xs text-slate-500 space-y-1">
          <p className="text-slate-400 font-medium">Monitoring System Status</p>
          <p>
            Railway Market Server is pushing data to Supabase. Edge Functions are
            verifying gameplay.
          </p>
          <p>
            Global error tracking is active. Offline reports will be queued until the
            next session.
          </p>
        </div>
      </div>
    </div>
  );
};
