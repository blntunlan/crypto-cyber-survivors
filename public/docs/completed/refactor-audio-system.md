---
description: Refactor Audio System to a Data-Driven Preset Registry [COMPLETED]
---

This workflow guides the refactoring of the imperative Web Audio logic in the game to a data-driven "Sound Preset" system. The goal is to separate the sound *definition* (frequencies, oscillator types, envelopes) from the *playback logic*.

## Phase 1: Analysis & Schema Definition

1.  **Audit Imperative Sounds** [DONE]
    -   Examine `services/audio/GameSounds.ts`.
    -   Document the parameters for each sound (e.g., `playShoot` uses fireRate).
    -   Identify common Web Audio nodes: Oscillators (`sine`, `square`, etc.), Gain envelopes, and BiquadFilters.

2.  **Define Sound Preset Types** [DONE]
    -   In `services/audio/types.ts`, define a schema for a "Sound Preset":
        ```typescript
        export interface SoundEnvelope {
          initial: number;
          peak: number;
          duration: number; // seconds
          ramp: 'linear' | 'exponential';
        }

        export interface SynthComponent {
          type: OscillatorType | 'noise';
          frequency: number;
          frequencyEnd?: number; // for sweeps
          envelope: SoundEnvelope;
          filter?: { type: BiquadFilterType; frequency: number };
        }
        ```

## Phase 2: Registry & Universal Player

3.  **Create Audio Registry** [DONE]
    -   Create `config/AudioRegistry.ts`.
    -   Populate it with declarative versions of the sounds in `GameSounds.ts`.
    -   *Example*:
        ```typescript
        export const AUDIO_PRESETS: Record<string, AudioPreset> = {
          gem: {
            components: [{
              type: 'sine',
              frequency: 1600,
              frequencyEnd: 2200,
              envelope: { initial: 0.02, peak: 0.02, duration: 0.06, ramp: 'linear' }
            }]
          }
        };
        ```

4.  **Build the Universal Synth Player** [DONE]
    -   Modify `services/audio/SynthEngine.ts` to add a `playPreset(preset: AudioPreset)` method.
    -   This method should iterate over components and construct the Web Audio nodes automatically.

## Phase 3: Migration & Integration

5.  **Migrate Simple Sounds** [DONE]
    -   Update `GameSounds.ts` to call `synthEngine.playPreset(AUDIO_PRESETS.id)` instead of manual node creation.

6.  **Handle Dynamic Sounds (Shoot/Combo)** [DONE]
    -   Some sounds (like `shoot`) depend on external variables (`fireRate`).
    -   Update the player to accept an optional `overrides` or `multiplier` parameter to adjust pitch/duration at runtime.

7.  **Update AudioService Facade** [DONE]
    -   Ensure `AudioService` remains the main entry point, but now delegates to the registry-based player.

## Phase 4: Verification & Cleanup

8.  **Verification** [DONE]
    -   Play the game and trigger various sounds (shooting, hitting, gems).
    -   Verify that pitch variation and volume levels match the original feel.
    -   Check for "clicking" artifacts (ensure gain always ramps to 0).

9.  **Cleanup** [DONE]
    -   Remove duplicated Web Audio setup code.
    -   Run `npm run lint` to ensure type consistency.
