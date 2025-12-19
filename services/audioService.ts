/**
 * AudioService - Game Audio Management
 *
 * Dual audio system:
 * - Synthesized sounds via Web Audio API (shoot, crit, gem, etc.)
 * - Howler.js for future file-based audio (music, voice)
 *
 * Features:
 * - Volume control with persistence via GameStore
 * - Mute toggle
 * - Mobile audio unlock handling
 * - Multiple simultaneous sounds
 */

import { Howl, Howler } from 'howler';

// Sound type for synthesized effects
type SoundType = 'shoot' | 'crit' | 'hit' | 'gem' | 'levelUp' | 'dash' | 'combo' | 'death' | 'button';

// Sound configuration
interface SoundConfig {
  volume: number;
  rate?: number;
}

const SOUND_DEFAULTS: Record<SoundType, SoundConfig> = {
  shoot: { volume: 0.04 },
  crit: { volume: 0.06 },
  hit: { volume: 0.05 },
  gem: { volume: 0.02 },
  levelUp: { volume: 0.03 },
  dash: { volume: 0.05 },
  combo: { volume: 0.04 },
  death: { volume: 0.08 },
  button: { volume: 0.03 },
};

export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 1.0;

  // Howler sounds cache (for future file-based sounds)
  private howlCache: Map<string, Howl> = new Map();

  // Cooldowns to prevent sound spam
  private lastPlayTime: Map<SoundType, number> = new Map();
  private readonly COOLDOWN_MS: Partial<Record<SoundType, number>> = {
    shoot: 50,    // Allow rapid fire sound
    gem: 30,      // Rapid gem collection
    hit: 100,     // Damage cooldown
  };

  constructor() {
    // Sync with Howler global volume - Howler.volume returns overloaded type
    void Howler.volume(this.volume);
  }

  private init() {
    if (!this.ctx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Check if sound is on cooldown
   */
  private isOnCooldown(type: SoundType): boolean {
    const cooldown = this.COOLDOWN_MS[type];
    if (!cooldown) return false;

    const lastTime = this.lastPlayTime.get(type) || 0;
    const now = performance.now();

    if (now - lastTime < cooldown) {
      return true;
    }

    this.lastPlayTime.set(type, now);
    return false;
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateGain();
    Howler.mute(this.isMuted);
    return this.isMuted;
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.updateGain();
    void Howler.volume(this.volume);
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Get mute state
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  private updateGain(): void {
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
  }

  // ========================================
  // Synthesized Sounds (Web Audio API)
  // ========================================

  /**
   * Play shoot sound - quick laser pew
   */
  playShoot(): void {
    if (this.isOnCooldown('shoot')) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vol = SOUND_DEFAULTS.shoot.volume;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  /**
   * Play critical hit sound - impactful dual tone
   */
  playCrit(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vol = SOUND_DEFAULTS.crit.volume;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc2.start();
    osc.stop(this.ctx.currentTime + 0.15);
    osc2.stop(this.ctx.currentTime + 0.15);
  }

  /**
   * Play hit/damage sound - low thud
   */
  playHit(): void {
    if (this.isOnCooldown('hit')) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vol = SOUND_DEFAULTS.hit.volume;

    osc.type = 'square';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  /**
   * Play gem collection sound - sparkly ping
   */
  playGem(): void {
    if (this.isOnCooldown('gem')) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vol = SOUND_DEFAULTS.gem.volume;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2200, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  /**
   * Play level up sound - ascending arpeggio
   */
  playLevelUp(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const vol = SOUND_DEFAULTS.levelUp.volume;

    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(vol, this.ctx!.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + i * 0.08);
      osc.stop(this.ctx!.currentTime + i * 0.08 + 0.4);
    });
  }

  /**
   * Play dash sound - whoosh
   */
  playDash(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vol = SOUND_DEFAULTS.dash.volume;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  /**
   * Play combo sound - rising chime
   */
  playCombo(multiplier: number = 1): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const baseFreq = 600 + (multiplier * 50); // Higher pitch for higher combos
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vol = SOUND_DEFAULTS.combo.volume;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // ========================================
  // COMBO MILESTONE SOUNDS 🔥
  // ========================================

  /**
   * Play combo milestone sound based on level
   */
  playComboMilestone(sound: 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'combo5'): void {
    switch (sound) {
      case 'combo1':
        this.playCombo1();
        break;
      case 'combo2':
        this.playCombo2();
        break;
      case 'combo3':
        this.playCombo3();
        break;
      case 'combo4':
        this.playCombo4();
        break;
      case 'combo5':
        this.playCombo5();
        break;
    }
  }

  /**
   * COMBO! (5 kills) - Simple rising tone
   */
  private playCombo1(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  /**
   * SUPER COMBO! (10 kills) - Double tone
   */
  private playCombo2(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    [0, 0.1].forEach((delay, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      const freq = 600 + (i * 200);
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx!.currentTime + delay + 0.15);

      gain.gain.setValueAtTime(0.06, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.2);
    });
  }

  /**
   * MEGA COMBO! (25 kills) - Triple arpeggio
   */
  private playCombo3(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const delay = i * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + delay);

      gain.gain.setValueAtTime(0.06, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.3);
    });
  }

  /**
   * ULTRA COMBO! (50 kills) - Epic fanfare
   */
  private playCombo4(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const delay = i * 0.1;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + delay);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, this.ctx!.currentTime + delay);

      gain.gain.setValueAtTime(0.05, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.4);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + delay);
      osc2.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.4);
      osc2.stop(this.ctx!.currentTime + delay + 0.4);
    });
  }

  /**
   * JACKPOT! (100 kills) - Ultimate casino explosion 🎰💰
   */
  private playCombo5(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Ascending jackpot fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]; // C5 to G6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const delay = i * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + delay);

      // Shimmer LFO
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      lfo.frequency.setValueAtTime(20, this.ctx!.currentTime);
      lfoGain.gain.setValueAtTime(freq * 0.02, this.ctx!.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.5, this.ctx!.currentTime + delay);

      gain.gain.setValueAtTime(0.05, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.5);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain!);

      lfo.start(this.ctx!.currentTime + delay);
      osc.start(this.ctx!.currentTime + delay);
      osc2.start(this.ctx!.currentTime + delay);
      lfo.stop(this.ctx!.currentTime + delay + 0.5);
      osc.stop(this.ctx!.currentTime + delay + 0.5);
      osc2.stop(this.ctx!.currentTime + delay + 0.5);
    });

    // Casino "ding-ding-ding" finish
    [0.5, 0.6, 0.7, 0.8, 0.9].forEach((delay) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2500, this.ctx!.currentTime + delay);

      gain.gain.setValueAtTime(0.04, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.1);
    });
  }

  /**
   * Play death sound - descending doom
   */
  playDeath(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const vol = SOUND_DEFAULTS.death.volume;

    // Multiple descending tones
    [0, 0.1, 0.2].forEach((delay, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      const startFreq = 300 - (i * 50);
      osc.frequency.setValueAtTime(startFreq, this.ctx!.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.3, this.ctx!.currentTime + delay + 0.3);

      gain.gain.setValueAtTime(vol, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.4);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx!.currentTime);
      filter.frequency.linearRampToValueAtTime(200, this.ctx!.currentTime + delay + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.4);
    });
  }

  /**
   * Play button click sound - UI feedback
   */
  playButton(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vol = SOUND_DEFAULTS.button.volume;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // ========================================
  // SLOT MACHINE SOUNDS 🎰
  // ========================================

  /**
   * Play slot tick sound - single card change
   * Higher pitch = more anticipation
   */
  playSlotTick(pitch: number = 1): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Base frequency scaled by pitch (1.0 = normal, higher = more excited)
    osc.frequency.setValueAtTime(800 * pitch, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600 * pitch, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  /**
   * Play reel stop sound - satisfying "clunk"
   * reelNumber: 1, 2, or 3 - pitch increases for each
   */
  playReelStop(reelNumber: number = 1): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const baseFreq = 300 + (reelNumber * 100);

    // Main thud
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, this.ctx.currentTime + 0.15);

    gain1.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    // Metallic "ding" overlay
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 3, this.ctx.currentTime);

    gain2.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.2);
    osc2.stop(this.ctx.currentTime + 0.1);
  }

  /**
   * Play slot win fanfare - all reels stopped, dopamine explosion! 🎉
   */
  playSlotWin(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Ascending arpeggio with shimmer
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const delay = i * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + delay);

      // Shimmer effect
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      lfo.frequency.setValueAtTime(15, this.ctx!.currentTime);
      lfoGain.gain.setValueAtTime(freq * 0.02, this.ctx!.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.05, this.ctx!.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      lfo.start(this.ctx!.currentTime + delay);
      osc.start(this.ctx!.currentTime + delay);
      lfo.stop(this.ctx!.currentTime + delay + 0.5);
      osc.stop(this.ctx!.currentTime + delay + 0.5);
    });

    // Final "ding-ding-ding" casino effect
    [0.4, 0.5, 0.6].forEach((delay) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, this.ctx!.currentTime + delay);

      gain.gain.setValueAtTime(0.03, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.15);
    });
  }

  /**
   * Play anticipation rising tone - for slowing down phase
   */
  playAnticipation(intensity: number = 1): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400 * intensity, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800 * intensity, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // ========================================
  // Howler.js Methods (for file-based audio)
  // ========================================

  /**
   * Load a sound file (for future music/voice)
   */
  loadSound(id: string, src: string | string[], options?: { loop?: boolean; volume?: number }): Howl {
    if (this.howlCache.has(id)) {
      return this.howlCache.get(id)!;
    }

    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume: options?.volume ?? this.volume,
      loop: options?.loop ?? false,
    });

    this.howlCache.set(id, howl);
    return howl;
  }

  /**
   * Play a loaded sound
   */
  playSound(id: string): number | undefined {
    const howl = this.howlCache.get(id);
    if (howl) {
      return howl.play();
    }
    return undefined;
  }

  /**
   * Stop a sound
   */
  stopSound(id: string): void {
    const howl = this.howlCache.get(id);
    if (howl) {
      howl.stop();
    }
  }

  /**
   * Unload all sounds (cleanup)
   */
  unloadAll(): void {
    this.howlCache.forEach((howl) => howl.unload());
    this.howlCache.clear();
  }
}

// Singleton export
export const audio = new AudioService();
