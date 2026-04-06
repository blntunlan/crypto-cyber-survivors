# :Headphones: Audio Architecture

> **Status** live

> Owner: Audio Engineering

## Overview

The Crypto Survivors audio system is a high-performance hybrid engine that combines **Procedural Synthesis** (via the Web Audio API) with **Sample-based Playback** (via Howler.js). 

To ensure the game loop remains GC-free and 60 FPS stable, the audio architecture completely separates *sound definitions* from *playback execution*, utilizing a Facade pattern.

## Architecture 

The audio system is structured across several specialized modules:

- **`config/AudioRegistry.ts`**: The static configuration for all procedurally generated sounds.
- **`services/audio/AudioService.ts`**: The Unified Facade. This is the only file the rest of the game interacts with.
- **`services/audio/SynthEngine.ts`**: The low-level Web Audio API wrapper that plays sounds based on `AUDIO_PRESETS`.
- **`services/audio/HowlerManager.ts`**: The manager for playing pre-rendered `.mp3` or `.wav` files via Howler.js.

**Procedural Synthesis (The Registry)**

Most combat sounds (lasers, impacts, UI clicks, gem pickups) are procedurally generated in real-time. This saves network bandwidth (no assets to download) and allows for dynamic pitch shifting (e.g., combo ascending chimes).

These sounds are defined in `AUDIO_PRESETS`:

```typescript
// Example from config/AudioRegistry.ts
export const AUDIO_PRESETS: Record<string, AudioPreset> = {
  shoot: {
    components: [
      {
        type: 'sine',
        frequency: 500,
        frequencyEnd: 180,
        envelope: { initial: 0.015, peak: 0.018, duration: 0.05, ramp: 'linear' },
      }
    ],
    cooldown: 50, // Internal debounce in ms
  }
};
```

**The Facade Pattern**

Game logic (like `CombatSystem` or `WeaponSystem`) never interacts directly with the Web Audio API or Howler. Instead, they call semantic methods on the `AudioService` singleton.

```typescript
import { audio } from '../services/audio';

// ❌ BAD: Direct instantiation
new Howl({ src: ['laser.mp3'] }).play();

// ✅ GOOD: Facade Pattern
audio.playShoot(fireRate, projectileCount);
audio.playGem();
audio.playDeath();
```

## Performance Controls

**Internal Debouncing (`cooldown`)**
Because a player might fire 30 bullets in a single frame, playing 30 simultaneous sounds would cause clipping and audio engine stalls.

The `AudioRegistry` allows defining a `cooldown` property on any preset. The `SynthEngine` respects this cooldown, dropping play requests if the sound was played too recently, effectively limiting audio polyphony to safe levels without blocking the game thread.

**Volume Categorization**
The `AudioService` exposes granular volume controls for different sound categories (`SoundCategory`), allowing the player to independently adjust Music, SFX, and UI volumes.

## Adding a New Sound

1. **Procedural (Synth)**: Add a new entry to `AUDIO_PRESETS` in `config/AudioRegistry.ts`. Define the oscillators, envelopes, and filters.
2. **Sample-based (Howler)**: Add the asset to the public folder and register it with `HowlerManager`.
3. **Facade API**: Add a strongly-typed method (e.g., `playMyNewSound()`) to `IAudioService` and implement it in `AudioService.ts`.
