# AIDirector (Deprecated Doc Alias)

This file remains only to preserve older links.

The live runtime does not use the older neural `AIDirector` design. Use `/docs/services/UnifiedDirector` for the current rule-based difficulty pipeline.

Key changes:

- no MLP or `synaptic.js` model in the live client path
- deterministic rule execution with reusable shared state
- smoothing and output mapping handled by `UnifiedDirector` plus `DifficultyManager`
