/**
 * SlotMachineSounds - Slot Machine Sound Effects
 *
 * Refactored to use declarative AudioPresets.
 */

import { synthEngine } from './SynthEngine';
import { AUDIO_PRESETS } from '../../config/AudioRegistry';

/**
 * Play slot tick sound - single card change
 */
export function playSlotTick(pitch: number = 1): void {
  if (synthEngine.isOnCooldown('slotTick')) return;
  synthEngine.recordPlay('slotTick');

  if (AUDIO_PRESETS.slotTick) {
    synthEngine.playPreset(AUDIO_PRESETS.slotTick, {
      frequencyMultiplier: pitch,
    });
  }
}

/**
 * Play reel stop sound - slotTick'in güçlendirilmiş "son" versiyonu
 * Aynı 800→400 Hz sine karakteri, daha uzun ve zengin
 */
export function playReelStop(reelNumber: number): void {
  // Her makarada yükselen pitch (heyecan artışı)
  const pitchMultiplier = 1 + reelNumber * 0.12; // 1.0, 1.12, 1.24

  // Her makarada artan ses
  const volume = 0.12 + reelNumber * 0.03; // 0.12, 0.15, 0.18

  // === Ana ses - slotTick ile aynı karakter ===
  // slotTick: 800→400 Hz, 0.03s
  // Bu:       800→400 Hz, 0.08s (daha uzun, daha doyurucu)
  synthEngine.playPreset(
    {
      components: [
        {
          type: 'sine',
          frequency: 800 * pitchMultiplier,
          frequencyEnd: 400 * pitchMultiplier,
          envelope: { initial: volume, peak: volume * 1.2, duration: 0.08, ramp: 'exponential' },
        },
      ],
    },
    { volumeMultiplier: 1.0 }
  );

  // === Hafif detune - zenginlik için ===
  synthEngine.playPreset(
    {
      components: [
        {
          type: 'sine',
          frequency: 804 * pitchMultiplier, // %0.5 detune
          frequencyEnd: 402 * pitchMultiplier,
          envelope: {
            initial: volume * 0.5,
            peak: volume * 0.6,
            duration: 0.07,
            ramp: 'exponential',
          },
        },
      ],
    },
    { volumeMultiplier: 0.8 }
  );
}

/**
 * Play slot win fanfare
 */
export function playSlotWin(): void {
  if (synthEngine.getMuted()) return;

  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6

  notes.forEach((freq, i) => {
    // We reuse the levelUpNote preset for the win fanfare as well
    if (AUDIO_PRESETS.levelUpNote) {
      synthEngine.playPreset(AUDIO_PRESETS.levelUpNote, {
        frequencyMultiplier: freq / 440,
        volumeMultiplier: 3.3, // Boost for fanfare
        delay: i * 0.08,
      });

      // Original had dual oscillators, we can simulate by playing a second slightly detuned note
      synthEngine.playPreset(AUDIO_PRESETS.levelUpNote, {
        frequencyMultiplier: (freq * 1.01) / 440,
        volumeMultiplier: 1.5,
        delay: i * 0.08,
      });
    }
  });
}

/**
 * Play anticipation rising tone
 */
export function playAnticipation(intensity: number = 1): void {
  synthEngine.playPreset({
    components: [
      {
        type: 'sine',
        frequency: 400 * intensity,
        frequencyEnd: 800 * intensity,
        envelope: { initial: 0.02, peak: 0.02, duration: 0.25, ramp: 'exponential' },
      },
    ],
  });
}

// ============================================================
// YENİ SLOT SESLERİ - Test için eklenmiştir, kaldırılabilir
// ============================================================

/**
 * Play coin shower sound - Para yağmuru efekti
 * Kazanma sonrası "cha-ching" hissi
 */
export function playCoinShower(): void {
  if (synthEngine.getMuted()) return;
  if (synthEngine.isOnCooldown('coinShower')) return;
  synthEngine.recordPlay('coinShower');

  // Metalik coin sesleri - rastgele aralıklarla
  const coinCount = 8;
  for (let i = 0; i < coinCount; i++) {
    const delay = i * 0.06 + Math.random() * 0.03;
    const pitch = 2000 + Math.random() * 1000; // 2000-3000 Hz metalik ses

    synthEngine.playPreset(
      {
        components: [
          {
            type: 'sine',
            frequency: pitch,
            frequencyEnd: pitch * 0.7,
            envelope: { initial: 0.08, peak: 0.1, duration: 0.05, ramp: 'exponential' },
          },
        ],
      },
      {
        volumeMultiplier: 0.4 + Math.random() * 0.2,
        delay,
      }
    );
  }
}

/**
 * Play near miss sound - Neredeyse kazanma gerilimi
 * Son makara "kayıp" durduğunda
 */
export function playNearMiss(): void {
  if (synthEngine.getMuted()) return;

  // Düşen, hayal kırıklığı yaratan ses
  synthEngine.playPreset(
    {
      components: [
        {
          type: 'sine',
          frequency: 600,
          frequencyEnd: 200,
          envelope: { initial: 0.15, peak: 0.15, duration: 0.3, ramp: 'exponential' },
        },
      ],
    },
    { volumeMultiplier: 0.6 }
  );
}

/**
 * Play multiplier chime - Çarpan artışı sesi
 * Her makarada artan heyecan için
 */
export function playMultiplierChime(level: number = 1): void {
  if (synthEngine.getMuted()) return;
  if (synthEngine.isOnCooldown('multiplierChime')) return;
  synthEngine.recordPlay('multiplierChime');

  // Yükselen arpeggio - level'a göre pitch artıyor
  const baseFreq = 523.25 * (1 + level * 0.2); // C5'ten başla, her level'da yüksel

  [0, 4, 7].forEach((semitone, i) => {
    const freq = baseFreq * Math.pow(2, semitone / 12);
    synthEngine.playPreset(
      {
        components: [
          {
            type: 'sine',
            frequency: freq,
            envelope: { initial: 0.08, peak: 0.1, duration: 0.15, ramp: 'exponential' },
          },
        ],
      },
      {
        volumeMultiplier: 0.5,
        delay: i * 0.05,
      }
    );
  });
}

/**
 * Play slowdown tension - Yavaşlama gerilimi
 * Makara yavaşlarken çalan hafif gergin ses
 */
export function playSlowdownTension(): void {
  if (synthEngine.getMuted()) return;
  if (synthEngine.isOnCooldown('slowdownTension')) return;
  synthEngine.recordPlay('slowdownTension');

  // Düşük frekanslı "drum roll" benzeri gerilim
  synthEngine.playPreset(
    {
      components: [
        {
          type: 'sine',
          frequency: 100,
          frequencyEnd: 80,
          envelope: { initial: 0.05, peak: 0.08, duration: 0.5, ramp: 'linear' },
        },
        {
          type: 'sine',
          frequency: 150,
          frequencyEnd: 120,
          envelope: { initial: 0.03, peak: 0.05, duration: 0.4, ramp: 'linear' },
        },
      ],
    },
    { volumeMultiplier: 0.4 }
  );
}
