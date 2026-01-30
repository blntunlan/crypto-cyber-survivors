[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [types/metrics](../README.md) / DifficultyInsights

# Interface: DifficultyInsights

Defined in: [types/metrics.ts:234](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L234)

## Properties

### deathsByDifficultyRange

> **deathsByDifficultyRange**: `Record`\<`string`, `number`\>

Defined in: [types/metrics.ts:235](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L235)

***

### nearDeathUsage

> **nearDeathUsage**: `object`

Defined in: [types/metrics.ts:236](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L236)

#### totalActivations

> **totalActivations**: `number`

#### avgPerGame

> **avgPerGame**: `number`

#### survivalRateAfter

> **survivalRateAfter**: `number`

***

### wavePhaseStats

> **wavePhaseStats**: `Record`\<[`WavePhase`](../type-aliases/WavePhase.md), \{ `avgTime`: `number`; `deathRate`: `number`; \}\>

Defined in: [types/metrics.ts:241](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L241)

***

### optimalDifficultyRange

> **optimalDifficultyRange**: `object`

Defined in: [types/metrics.ts:248](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L248)

#### min

> **min**: `number`

#### max

> **max**: `number`

#### avgSurvival

> **avgSurvival**: `number`
