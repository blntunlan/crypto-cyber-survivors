/**
 * MarketAudioReactor — Crypto-Cyberpunk Procedural Music Engine
 *
 * Creates a dynamic, layered soundtrack that reacts to PriceMomentumEngine:
 *
 * Audio Layers (introduced by intensity threshold):
 *   0.0+ : Ambient pad (detuned triangle oscillators)
 *   0.2+ : Deep 808-style kick (4-on-floor)
 *   0.3+ : Filtered saw bass (walks through scale notes)
 *   0.4+ : Tight hi-hat (offbeat 8ths, pre-allocated noise)
 *   0.5+ : Digital clap on beats 2 & 4
 *   0.7+ : Square-wave arpeggio (16th-note style)
 *
 * Architecture:
 *   Nodes → per-layer GainNode → DynamicsCompressor → masterGain
 *
 * Performance:
 *   - Single pre-allocated noise buffer (reused for hat + clap)
 *   - Zero GC allocation in scheduler hot path
 *   - All nodes cleaned up via onended → disconnect()
 *   - Compressor prevents clipping at any intensity level
 *
 * All nodes are created through SynthEngine for proper lifecycle management.
 * Uses Web Audio API's native timing (scheduleAheadTime + nextNoteTime pattern).
 */

import { synthEngine } from './SynthEngine';
import { PriceMomentumEngine, type MomentumPhase } from '../market/PriceMomentumEngine';
import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';

// ─── Configuration ───────────────────────────────────────────
const CFG = {
  /** How far ahead to schedule audio events (seconds) */
  SCHEDULE_AHEAD_TIME: 0.1,
  /** How often the scheduler runs (ms) */
  SCHEDULER_INTERVAL_MS: 25,
  /** Steps per pattern (16 = two bars of 4/4 in 8th notes) */
  PATTERN_LENGTH: 16,

  // ── Per-layer volumes (intentionally low — compressor lifts) ──
  KICK_VOL: 0.025,
  CLAP_VOL: 0.012,
  HAT_VOL: 0.008,
  BASS_VOL: 0.015,
  ARP_VOL: 0.01,
  PAD_VOL: 0.006,

  // ── Pad ──
  PAD_BASE_FREQ: 110, // A2
  PAD_DETUNE: 6, // cents — subtle width
  PAD_INTENSITY_RANGE: 40, // Hz shift with intensity

  // ── Compressor ──
  COMP_THRESHOLD: -18, // dB
  COMP_RATIO: 4,
  COMP_ATTACK: 0.003,
  COMP_RELEASE: 0.15,
  COMP_KNEE: 6,

  // ── Phase stinger ──
  STINGER_VOL: 0.018,
  STINGER_DURATION: 0.22,

  // ── BPM smoothing ──
  BPM_LERP: 0.04,
} as const;

// ─── Scales (frequency ratios from root) ─────────────────────
// Each scale provides 5 notes for melodic variety
const SCALES = {
  // Major pentatonic — confident, bullish (TRENDING / SURGING)
  MAJOR: [1.0, 1.122, 1.26, 1.498, 1.682] as readonly number[],
  // Minor pentatonic — tense, bearish (DRIFTING / CRASHING)
  MINOR: [1.0, 1.189, 1.335, 1.498, 1.782] as readonly number[],
  // Root + 5th only — ambient, stagnant
  NEUTRAL: [1.0, 1.498, 2.0, 1.498, 1.0] as readonly number[],
};

// ─── Phase-to-scale + pitch offset mapping ───────────────────
interface PhaseAudioConfig {
  scale: readonly number[];
  pitchOffset: number;
}

const DEFAULT_PHASE_CFG: PhaseAudioConfig = { scale: SCALES.NEUTRAL, pitchOffset: 0 };

const PHASE_CONFIG: Record<string, PhaseAudioConfig> = {
  STAGNANT: { scale: SCALES.NEUTRAL, pitchOffset: 0 },
  DRIFTING: { scale: SCALES.MINOR, pitchOffset: 4 },
  TRENDING: { scale: SCALES.MAJOR, pitchOffset: 10 },
  SURGING: { scale: SCALES.MAJOR, pitchOffset: 20 },
  CRASHING: { scale: SCALES.MINOR, pitchOffset: -8 },
};

// ─── Rhythmic patterns (1 = hit, 0 = rest) ──────────────────
// 16 steps = 2 bars of 4/4 at 8th note resolution
//                                 1 . 2 . 3 . 4 . | 1 . 2 . 3 . 4 .
const KICK_PATTERN = /* */ [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1] as const;
const CLAP_PATTERN = /* */ [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] as const;
const HAT_PATTERN = /* */ [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] as const;
const BASS_PATTERN = /* */ [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0] as const;
const BASS_NOTE_IDX = /* */ [0, 0, 0, 2, 0, 0, 3, 0, 0, 0, 0, 4, 0, 1, 0, 0] as const;

// ─── Pre-allocated scheduler state ───────────────────────────
const _state = {
  nextNoteTime: 0,
  step: 0, // 0..15 pattern position
  currentBPM: 120,
  lastPhase: 'STAGNANT' as MomentumPhase,
  isRunning: false,
  schedulerTimer: 0 as unknown as ReturnType<typeof setInterval>,
};

// ─── Audio node references ───────────────────────────────────
let _noiseBuffer: AudioBuffer | null = null;
let _compressor: DynamicsCompressorNode | null = null;
let _compressorGain: GainNode | null = null; // output of compressor
let _padOsc1: OscillatorNode | null = null;
let _padOsc2: OscillatorNode | null = null;
let _padGain: GainNode | null = null;

// ─── Helpers ─────────────────────────────────────────────────
/** Safely disconnect an AudioNode (no-op if already disconnected) */
function safeDisconnect(node: AudioNode | null): void {
  if (!node) return;
  try {
    node.disconnect();
  } catch {
    /* already disconnected */
  }
}

/** Get the music category volume multiplier */
function musicVol(): number {
  return synthEngine.getCategoryVolume('music');
}

// ═════════════════════════════════════════════════════════════
// MarketAudioReactor Singleton
// ═════════════════════════════════════════════════════════════
export const MarketAudioReactor = {
  // ─── Public API ────────────────────────────────────────────

  /**
   * Start the market audio reactor.
   * Creates the shared noise buffer, compressor chain, and ambient pad.
   * Begins scheduling rhythmic layers synced to PriceMomentumEngine's BPM.
   */
  start(): void {
    if (_state.isRunning) return;

    const context = synthEngine.getContext();
    if (!context) {
      Logger.warn('[MarketAudioReactor] No audio context, skipping start');
      return;
    }

    const { ctx, masterGain } = context;

    // ── 1. Create shared noise buffer (once) ──
    if (!_noiseBuffer) {
      const len = ctx.sampleRate; // 1 second of noise
      _noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = _noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    // ── 2. Create compressor chain ──
    _compressor = ctx.createDynamicsCompressor();
    _compressor.threshold.setValueAtTime(CFG.COMP_THRESHOLD, ctx.currentTime);
    _compressor.ratio.setValueAtTime(CFG.COMP_RATIO, ctx.currentTime);
    _compressor.attack.setValueAtTime(CFG.COMP_ATTACK, ctx.currentTime);
    _compressor.release.setValueAtTime(CFG.COMP_RELEASE, ctx.currentTime);
    _compressor.knee.setValueAtTime(CFG.COMP_KNEE, ctx.currentTime);

    _compressorGain = ctx.createGain();
    _compressorGain.gain.setValueAtTime(1.0, ctx.currentTime);

    _compressor.connect(_compressorGain);
    _compressorGain.connect(masterGain);

    // ── 3. Reset state ──
    _state.isRunning = true;
    _state.nextNoteTime = ctx.currentTime + 0.1;
    _state.step = 0;
    _state.currentBPM = 120;
    _state.lastPhase = 'STAGNANT';

    // ── 4. Start ambient pad ──
    this._startPad(ctx);

    // ── 5. Start scheduler ──
    _state.schedulerTimer = setInterval(
      () => this._scheduler(),
      CFG.SCHEDULER_INTERVAL_MS
    );

    Logger.info('[MarketAudioReactor] Started (crypto-cyberpunk engine)');
  },

  /**
   * Stop the market audio reactor.
   * Gracefully fades out the pad, disconnects compressor chain.
   */
  stop(): void {
    if (!_state.isRunning) return;
    _state.isRunning = false;

    clearInterval(_state.schedulerTimer);

    // Fade pad out
    this._stopPad();

    // Disconnect compressor chain
    safeDisconnect(_compressor);
    safeDisconnect(_compressorGain);
    _compressor = null;
    _compressorGain = null;

    Logger.info('[MarketAudioReactor] Stopped');
  },

  /**
   * Check if the reactor is currently running.
   */
  isRunning(): boolean {
    return _state.isRunning;
  },

  // ─── Internal: Scheduler ─────────────────────────────────

  /**
   * Look-ahead scheduler: schedules beats that fall within
   * the scheduling window ahead of current audio time.
   */
  _scheduler(): void {
    const context = synthEngine.getContext();
    if (!context || !_state.isRunning || !_compressor) return;

    const mom = PriceMomentumEngine.getLatest();
    const targetBPM = mom.suggestedBPM;
    const intensity = mom.intensity;
    const phase = mom.phase;

    // Smooth BPM transitions (no sudden jumps)
    _state.currentBPM += (targetBPM - _state.currentBPM) * CFG.BPM_LERP;

    // Phase transition stinger
    if (phase !== _state.lastPhase) {
      this._playPhaseStinger(context.ctx, phase, intensity);
      _state.lastPhase = phase;
    }

    const scheduleEnd = context.ctx.currentTime + CFG.SCHEDULE_AHEAD_TIME;

    while (_state.nextNoteTime < scheduleEnd) {
      this._scheduleStep(context.ctx, _state.nextNoteTime, intensity, phase);

      // Advance pattern position
      _state.step = (_state.step + 1) % CFG.PATTERN_LENGTH;

      // Update pad pitch every 8 steps (1 bar)
      if (_state.step % 8 === 0) {
        this._updatePadPitch(context.ctx, intensity, phase);
      }

      // Advance time by one 8th note
      const secondsPer8th = 30.0 / _state.currentBPM;
      _state.nextNoteTime += secondsPer8th;
    }
  },

  // ─── Internal: Step Orchestration ────────────────────────

  /**
   * Schedule all active layers for one pattern step.
   * Each layer is gated by an intensity threshold and smoothly
   * fades in/out via gain scaling.
   */
  _scheduleStep(
    ctx: AudioContext,
    time: number,
    intensity: number,
    phase: MomentumPhase
  ): void {
    const mv = musicVol();
    if (mv <= 0 || !_compressor) return;

    const step = _state.step;
    const config = PHASE_CONFIG[phase] ?? DEFAULT_PHASE_CFG;

    // Layer 1: Kick (intensity > 0.2)
    if (intensity > 0.2 && KICK_PATTERN[step]) {
      const fade = Math.min(1, (intensity - 0.2) / 0.15); // 0→1 over 0.2-0.35
      this._scheduleKick(ctx, time, intensity, mv * fade);
    }

    // Layer 2: Bass (intensity > 0.3)
    if (intensity > 0.3 && BASS_PATTERN[step]) {
      const fade = Math.min(1, (intensity - 0.3) / 0.15);
      const noteIdx = (BASS_NOTE_IDX[step] ?? 0) % config.scale.length;
      this._scheduleBass(ctx, time, config.scale[noteIdx] ?? 1.0, mv * fade);
    }

    // Layer 3: Hat (intensity > 0.4)
    if (intensity > 0.4 && HAT_PATTERN[step]) {
      const fade = Math.min(1, (intensity - 0.4) / 0.15);
      this._scheduleHat(ctx, time, intensity, mv * fade);
    }

    // Layer 4: Clap (intensity > 0.5)
    if (intensity > 0.5 && CLAP_PATTERN[step]) {
      const fade = Math.min(1, (intensity - 0.5) / 0.15);
      this._scheduleClap(ctx, time, mv * fade);
    }

    // Layer 5: Arp (intensity > 0.7)
    if (intensity > 0.7) {
      const fade = Math.min(1, (intensity - 0.7) / 0.2);
      const noteIdx = step % config.scale.length;
      this._scheduleArp(ctx, time, config.scale[noteIdx] ?? 1.0, mv * fade);
    }
  },

  // ─── Internal: Kick (Deep 808) ───────────────────────────

  _scheduleKick(ctx: AudioContext, time: number, intensity: number, vol: number): void {
    if (!_compressor) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 808-style pitch sweep: start high, sweep down fast
    const startFreq = 150 + intensity * 30;
    const endFreq = 35;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.06);

    // Sub-bass tail
    osc.frequency.setTargetAtTime(endFreq * 0.8, time + 0.06, 0.08);

    const peakVol = CFG.KICK_VOL * vol;
    gain.gain.setValueAtTime(peakVol, time);
    gain.gain.setTargetAtTime(0, time + 0.04, 0.06); // smooth decay

    osc.connect(gain);
    gain.connect(_compressor);

    osc.start(time);
    osc.stop(time + 0.25);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  },

  // ─── Internal: Clap (Digital Noise Burst) ────────────────

  _scheduleClap(ctx: AudioContext, time: number, vol: number): void {
    if (!_compressor || !_noiseBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = _noiseBuffer;
    // Offset into the buffer randomly to avoid repetition
    const offset = Math.random() * 0.5;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.setValueAtTime(2, time);

    const gain = ctx.createGain();
    const peakVol = CFG.CLAP_VOL * vol;
    gain.gain.setValueAtTime(peakVol, time);
    gain.gain.setTargetAtTime(0, time + 0.01, 0.03); // tight envelope

    source.connect(filter);
    filter.connect(gain);
    gain.connect(_compressor);

    source.start(time, offset, 0.12);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  },

  // ─── Internal: Hi-Hat (Filtered Noise) ───────────────────

  _scheduleHat(ctx: AudioContext, time: number, intensity: number, vol: number): void {
    if (!_compressor || !_noiseBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = _noiseBuffer;
    const offset = Math.random() * 0.8;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    // Keep between 6kHz-9kHz — avoids painful 12kHz+
    filter.frequency.setValueAtTime(6000 + intensity * 3000, time);

    const gain = ctx.createGain();
    const peakVol = CFG.HAT_VOL * vol;
    gain.gain.setValueAtTime(peakVol, time);
    gain.gain.setTargetAtTime(0, time, 0.015); // very short — tight hat

    source.connect(filter);
    filter.connect(gain);
    gain.connect(_compressor);

    source.start(time, offset, 0.05);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  },

  // ─── Internal: Bass (Filtered Saw, Scale Movement) ──────

  _scheduleBass(
    ctx: AudioContext,
    time: number,
    scaleRatio: number,
    vol: number
  ): void {
    if (!_compressor) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // Root at one octave below pad (A1 = 55 Hz)
    const freq = 55 * scaleRatio;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Filter sweep: opens with attack, closes on decay
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.02); // attack
    filter.frequency.setTargetAtTime(120, time + 0.02, 0.08); // decay
    filter.Q.setValueAtTime(4, time); // resonance for that synth bite

    const peakVol = CFG.BASS_VOL * vol;
    gain.gain.setValueAtTime(peakVol, time);
    gain.gain.setTargetAtTime(0, time + 0.05, 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(_compressor);

    osc.start(time);
    osc.stop(time + 0.22);

    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  },

  // ─── Internal: Arp (Square Wave Digital Synth) ──────────

  _scheduleArp(ctx: AudioContext, time: number, scaleRatio: number, vol: number): void {
    if (!_compressor) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Arp plays 2 octaves above pad root for that icy digital feel
    const freq = CFG.PAD_BASE_FREQ * 2 * scaleRatio;

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    const peakVol = CFG.ARP_VOL * vol;
    gain.gain.setValueAtTime(peakVol, time);
    gain.gain.setTargetAtTime(0, time + 0.01, 0.03); // staccato pluck

    osc.connect(gain);
    gain.connect(_compressor);

    osc.start(time);
    osc.stop(time + 0.12);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  },

  // ─── Internal: Ambient Pad ──────────────────────────────

  /**
   * Two slightly-detuned triangle oscillators for a warm ambient bed.
   * Fades in over 3 seconds.
   */
  _startPad(ctx: AudioContext): void {
    if (!_compressor) return;

    const now = ctx.currentTime;

    _padOsc1 = ctx.createOscillator();
    _padOsc2 = ctx.createOscillator();
    _padGain = ctx.createGain();

    _padOsc1.type = 'triangle';
    _padOsc2.type = 'triangle';

    _padOsc1.frequency.setValueAtTime(CFG.PAD_BASE_FREQ, now);
    _padOsc2.frequency.setValueAtTime(CFG.PAD_BASE_FREQ, now);
    _padOsc1.detune.setValueAtTime(-CFG.PAD_DETUNE, now);
    _padOsc2.detune.setValueAtTime(CFG.PAD_DETUNE, now);

    // Fade in over 3 seconds
    const mv = musicVol();
    _padGain.gain.setValueAtTime(0, now);
    _padGain.gain.linearRampToValueAtTime(CFG.PAD_VOL * mv, now + 3.0);

    _padOsc1.connect(_padGain);
    _padOsc2.connect(_padGain);
    _padGain.connect(_compressor);

    _padOsc1.start(now);
    _padOsc2.start(now);
  },

  /**
   * Gracefully fade out and stop the ambient pad.
   */
  _stopPad(): void {
    const context = synthEngine.getContext();
    if (!context) {
      // Hard stop if no context
      try {
        _padOsc1?.stop();
      } catch {
        /* */
      }
      try {
        _padOsc2?.stop();
      } catch {
        /* */
      }
      safeDisconnect(_padOsc1);
      safeDisconnect(_padOsc2);
      safeDisconnect(_padGain);
      _padOsc1 = null;
      _padOsc2 = null;
      _padGain = null;
      return;
    }

    const now = context.ctx.currentTime;

    if (_padGain) {
      _padGain.gain.cancelScheduledValues(now);
      _padGain.gain.setValueAtTime(_padGain.gain.value, now);
      _padGain.gain.setTargetAtTime(0, now, 0.2); // ~600ms fade
    }

    const stopTime = now + 0.8;

    try {
      _padOsc1?.stop(stopTime);
    } catch {
      /* */
    }
    try {
      _padOsc2?.stop(stopTime);
    } catch {
      /* */
    }

    // Schedule cleanup
    setTimeout(() => {
      safeDisconnect(_padOsc1);
      safeDisconnect(_padOsc2);
      safeDisconnect(_padGain);
      _padOsc1 = null;
      _padOsc2 = null;
      _padGain = null;
    }, 1000);
  },

  /**
   * Smoothly shift pad pitch based on market intensity and phase.
   */
  _updatePadPitch(ctx: AudioContext, intensity: number, phase: MomentumPhase): void {
    if (!_padOsc1 || !_padOsc2) return;

    const config = PHASE_CONFIG[phase] ?? DEFAULT_PHASE_CFG;
    const targetFreq =
      CFG.PAD_BASE_FREQ + intensity * CFG.PAD_INTENSITY_RANGE + config.pitchOffset;
    const safeFreq = Math.max(20, targetFreq);

    // Smooth glide over ~1 second
    _padOsc1.frequency.setTargetAtTime(safeFreq, ctx.currentTime, 0.3);
    _padOsc2.frequency.setTargetAtTime(safeFreq, ctx.currentTime, 0.3);

    // Adjust pad volume with intensity (louder pad at low intensity, quieter when drums come in)
    if (_padGain) {
      const mv = musicVol();
      const padScale = 0.6 + (1.0 - intensity) * 0.4; // louder when calm
      const targetVol = CFG.PAD_VOL * padScale * mv;
      _padGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.3);
    }
  },

  // ─── Internal: Phase Transition Stinger ──────────────────

  /**
   * Short tonal stinger when market phase changes.
   * Rising sweep for bullish, descending for bearish.
   * Filtered for smoothness.
   */
  _playPhaseStinger(
    ctx: AudioContext,
    newPhase: MomentumPhase,
    intensity: number
  ): void {
    if (!_compressor) return;

    const now = ctx.currentTime;
    const isAscending = newPhase === 'SURGING' || newPhase === 'TRENDING';
    const startFreq = isAscending ? 200 : 400;
    const endFreq = isAscending ? 400 : 200;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + CFG.STINGER_DURATION);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600 + intensity * 1500, now);
    filter.frequency.setTargetAtTime(200, now + CFG.STINGER_DURATION * 0.5, 0.05);

    const mv = musicVol();
    const vol = CFG.STINGER_VOL * (0.3 + intensity * 0.7) * mv;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.setTargetAtTime(0, now + CFG.STINGER_DURATION * 0.3, 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(_compressor);

    osc.start(now);
    osc.stop(now + CFG.STINGER_DURATION + 0.05);

    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    // Emit event for other systems
    EventBus.emit('priceMomentumUpdate', {
      phase: newPhase,
      intensity,
      direction: isAscending ? 'up' : 'down',
      suggestedBPM: _state.currentBPM,
      isFavorable: isAscending,
    });

    Logger.info(
      `[MarketAudioReactor] Phase → ${newPhase} (intensity: ${intensity.toFixed(2)})`
    );
  },

  /**
   * Reset for testing.
   */
  resetForTesting(): void {
    this.stop();
    _state.step = 0;
    _state.currentBPM = 120;
    _state.lastPhase = 'STAGNANT';
    _noiseBuffer = null;
  },
};
