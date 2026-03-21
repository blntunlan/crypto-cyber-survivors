[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [types/metrics](../README.md) / DifficultyMetrics

# Interface: DifficultyMetrics

Defined in: [types/metrics.ts:51](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L51)

## Properties

### averageDifficulty

> **averageDifficulty**: `number`

Defined in: [types/metrics.ts:52](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L52)

***

### maxDifficulty

> **maxDifficulty**: `number`

Defined in: [types/metrics.ts:53](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L53)

***

### difficultyAtDeath

> **difficultyAtDeath**: `number`

Defined in: [types/metrics.ts:54](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L54)

***

### timeInEachWavePhase

> **timeInEachWavePhase**: `Record`\<[`WavePhase`](../type-aliases/WavePhase.md), `number`\>

Defined in: [types/metrics.ts:55](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L55)

***

### timeInHighDifficulty

> **timeInHighDifficulty**: `number`

Defined in: [types/metrics.ts:56](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L56)

***

### timeInLowDifficulty

> **timeInLowDifficulty**: `number`

Defined in: [types/metrics.ts:57](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L57)

***

### nearDeathActivations

> **nearDeathActivations**: `number`

Defined in: [types/metrics.ts:58](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L58)

***

### difficultySamples

> **difficultySamples**: `number`[]

Defined in: [types/metrics.ts:59](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L59)

***

### wavePhaseTransitions

> **wavePhaseTransitions**: `object`[]

Defined in: [types/metrics.ts:60](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L60)

#### phase

> **phase**: [`WavePhase`](../type-aliases/WavePhase.md)

#### timestamp

> **timestamp**: `number`
