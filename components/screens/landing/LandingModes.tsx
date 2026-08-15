import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Zap, Skull } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

/**
 * The two modes are compared on the same two axes rather than listed as
 * separate feature bullets, so the actual trade-off is readable at a glance.
 */
const CASUAL_SPECS = [
  { label: 'Progress', value: 'Saved locally, playable offline' },
  { label: 'Payouts', value: 'None — no run reaches the leaderboard' },
] as const;

const COMPETITIVE_SPECS = [
  { label: 'Progress', value: 'Synced to your profile, recorded for replay' },
  { label: 'Payouts', value: 'Server-verified coins, ranked seasons' },
] as const;

const LEVERAGE_LEVELS = [
  {
    level: '1x',
    name: 'STANDARD',
    risk: 'LOW',
    reward: '1.0x',
    speed: '+0%',
    desc: 'Base survivor difficulty for chill farming runs.',
  },
  {
    level: '10x',
    name: 'LEVERAGED',
    risk: 'MEDIUM',
    reward: '2.5x',
    speed: '+20%',
    desc: 'Increased enemy density and faster wave progression.',
  },
  {
    level: '50x',
    name: 'VOLATILE',
    risk: 'HIGH',
    reward: '6.0x',
    speed: '+65%',
    desc: 'Elite adversaries spawn with cursed attack auras.',
  },
  {
    level: '100x',
    name: 'DEGEN',
    risk: 'EXTREME',
    reward: '15.0x',
    speed: '+120%',
    desc: 'Instant boss teleport, fatal contact damage, maximum payout.',
  },
] as const;

const ADVERSARIES = [
  {
    name: 'BULL RUNNER',
    role: 'PUMP ENFORCER',
    condition: 'Spawns heavily when RSI > 65',
    trait: 'Charges straight at the player; drops double gold bags.',
    tone: 'border-[#22c55e]/40 text-[#6ee7b7]',
  },
  {
    name: 'BEAR TRAPPER',
    role: 'DUMP HARVESTER',
    condition: 'Spawns heavily when RSI < 35',
    trait: 'Emits persistent slow zones that curse cashout portals.',
    tone: 'border-[#b22222]/45 text-[#ff7777]',
  },
  {
    name: 'WHALE LEVIATHAN',
    role: 'VOLATILITY APEX',
    condition: 'Triggered by high volume spikes',
    trait: 'Massive HP pool; splits into aggressive fractal mini-swarms on death.',
    tone: 'border-[#d6b85c]/45 text-[#ffd86a]',
  },
] as const;

export const LandingModes: React.FC = () => {
  const [selectedLeverage, setSelectedLeverage] = useState<string>('10x');
  const activeLevel =
    LEVERAGE_LEVELS.find(l => l.level === selectedLeverage) ?? LEVERAGE_LEVELS[0];

  return (
    <section className="relative z-10 border-t border-[#b22222]/10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            CHOOSE YOUR RISK TOLERANCE
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            GAME MODES &amp; RISK MULTIPLIERS
          </div>
        </motion.div>

        {/* Mode Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="mb-14 grid gap-6 md:grid-cols-2"
        >
          {/* Casual Mode */}
          <motion.div
            variants={fadeInUp}
            className="group relative border-2 border-[#d6b85c]/25 bg-[#070a14]/80 p-6 transition-all duration-300 hover:border-[#d6b85c]/50 sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gamepad2 className="h-8 w-8 text-[#d6b85c]" />
                <h3 className="font-cyber text-2xl font-black uppercase italic text-[#d6b85c]">
                  CASUAL MODE
                </h3>
              </div>
              <span className="border border-[#d6b85c]/30 bg-[#d6b85c]/10 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-[#ffd86a]">
                SANDBOX
              </span>
            </div>
            <p className="mb-6 font-mono text-sm leading-relaxed text-slate-300">
              Master weapon evolutions, learn enemy patterns, and test builds without
              leaderboard stress.
            </p>
            <dl className="space-y-2 border-t border-[#d6b85c]/20 pt-4 font-mono text-xs">
              {CASUAL_SPECS.map(spec => (
                <div key={spec.label} className="flex justify-between gap-4">
                  <dt className="uppercase tracking-wider text-slate-500">
                    {spec.label}
                  </dt>
                  <dd className="text-right text-slate-300">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Competitive Mode */}
          <motion.div
            variants={fadeInUp}
            className="group relative border-2 border-[#b22222]/30 bg-[#0c060a]/80 p-6 transition-all duration-300 hover:border-[#b22222]/60 sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-[#ff6b6b]" />
                <h3 className="font-cyber text-2xl font-black uppercase italic text-[#ff6b6b]">
                  COMPETITIVE MODE
                </h3>
              </div>
              <span className="border border-[#b22222]/40 bg-[#b22222]/20 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-[#ff8888]">
                RANKED LIVE
              </span>
            </div>
            <p className="mb-6 font-mono text-sm leading-relaxed text-slate-300">
              Battle live market swings with server verification. Cash out at the golden
              peak or risk total liquidation.
            </p>
            <dl className="space-y-2 border-t border-[#b22222]/25 pt-4 font-mono text-xs">
              {COMPETITIVE_SPECS.map(spec => (
                <div key={spec.label} className="flex justify-between gap-4">
                  <dt className="uppercase tracking-wider text-slate-500">
                    {spec.label}
                  </dt>
                  <dd className="text-right text-slate-300">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </motion.div>

        {/* Interactive Leverage Multiplier Matrix */}
        <div className="mb-14 border border-white/10 bg-[#05070f]/90 p-6 font-mono sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#ffd86a]" />
              <h4 className="text-sm font-black uppercase tracking-widest text-white">
                LEVERAGE DIFFICULTY MULTIPLIER (1x – 100x)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400">
              Interactive Run Risk Preview
            </span>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEVERAGE_LEVELS.map(level => (
              <button
                key={level.level}
                type="button"
                onClick={() => setSelectedLeverage(level.level)}
                className={`border p-3 text-left transition-all duration-200 ${
                  selectedLeverage === level.level
                    ? 'border-[#d6b85c] bg-[#d6b85c]/15 text-white shadow-[0_0_15px_rgba(214,184,92,0.25)]'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <div className="text-lg font-black text-[#ffd86a]">{level.level}</div>
                <div className="text-[9px] font-bold tracking-wider">{level.name}</div>
              </button>
            ))}
          </div>

          {/* Active Leverage Stats */}
          <div className="grid gap-4 border border-white/10 bg-black/40 p-4 sm:grid-cols-3">
            <div className="border-l-2 border-[#ff6b6b] pl-3">
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">
                RISK PROFILE
              </span>
              <span className="text-sm font-black text-white">{activeLevel.risk}</span>
            </div>
            <div className="border-l-2 border-[#d6b85c] pl-3">
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">
                REWARD YIELD
              </span>
              <span className="text-sm font-black text-[#ffd86a]">
                {activeLevel.reward} Payout
              </span>
            </div>
            <div className="border-l-2 border-emerald-400 pl-3">
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">
                ENEMY AGGRESSION
              </span>
              <span className="text-sm font-black text-emerald-300">
                {activeLevel.speed} Speed
              </span>
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
            {activeLevel.desc}
          </p>
        </div>

        {/* Market-Driven Adversaries Showcase */}
        <div>
          <div className="mb-6 flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.25em] text-[#d6b85c]">
            <Skull className="h-4 w-4" />
            <span>MARKET-REACTIVE ADVERSARIES</span>
          </div>

          <div className="grid gap-4 font-mono sm:grid-cols-3">
            {ADVERSARIES.map(adv => (
              <div key={adv.name} className={`border bg-[#05070e]/80 p-4 ${adv.tone}`}>
                <div className="mb-1 text-[9px] font-black tracking-widest opacity-70">
                  {adv.role}
                </div>
                <div className="mb-2 font-cyber text-lg font-black italic text-white">
                  {adv.name}
                </div>
                <div className="mb-2 border border-white/10 bg-black/30 p-1.5 text-[10px] font-bold text-slate-300">
                  {adv.condition}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  {adv.trait}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
