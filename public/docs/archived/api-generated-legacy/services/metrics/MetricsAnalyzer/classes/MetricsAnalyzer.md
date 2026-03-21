[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/metrics/MetricsAnalyzer](../README.md) / MetricsAnalyzer

# Class: MetricsAnalyzer

Defined in: [services/metrics/MetricsAnalyzer.ts:21](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsAnalyzer.ts#L21)

## Constructors

### Constructor

> **new MetricsAnalyzer**(`sessions`): `MetricsAnalyzer`

Defined in: [services/metrics/MetricsAnalyzer.ts:24](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsAnalyzer.ts#L24)

#### Parameters

##### sessions

[`SessionMetrics`](../../../../types/metrics/interfaces/SessionMetrics.md)[]

#### Returns

`MetricsAnalyzer`

## Methods

### getInsights()

> **getInsights**(): [`GameInsights`](../../../../types/metrics/interfaces/GameInsights.md)

Defined in: [services/metrics/MetricsAnalyzer.ts:31](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsAnalyzer.ts#L31)

Get all insights combined

#### Returns

[`GameInsights`](../../../../types/metrics/interfaces/GameInsights.md)

***

### getBitcoinInsights()

> **getBitcoinInsights**(): [`BitcoinInsights`](../../../../types/metrics/interfaces/BitcoinInsights.md)

Defined in: [services/metrics/MetricsAnalyzer.ts:43](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsAnalyzer.ts#L43)

Bitcoin/Market-related insights

#### Returns

[`BitcoinInsights`](../../../../types/metrics/interfaces/BitcoinInsights.md)

***

### getDifficultyInsights()

> **getDifficultyInsights**(): [`DifficultyInsights`](../../../../types/metrics/interfaces/DifficultyInsights.md)

Defined in: [services/metrics/MetricsAnalyzer.ts:158](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsAnalyzer.ts#L158)

Difficulty-related insights

#### Returns

[`DifficultyInsights`](../../../../types/metrics/interfaces/DifficultyInsights.md)

***

### getPlayerExperienceInsights()

> **getPlayerExperienceInsights**(): [`PlayerExperienceInsights`](../../../../types/metrics/interfaces/PlayerExperienceInsights.md)

Defined in: [services/metrics/MetricsAnalyzer.ts:221](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsAnalyzer.ts#L221)

Player experience insights

#### Returns

[`PlayerExperienceInsights`](../../../../types/metrics/interfaces/PlayerExperienceInsights.md)

***

### generateRecommendations()

> **generateRecommendations**(): `string`[]

Defined in: [services/metrics/MetricsAnalyzer.ts:298](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsAnalyzer.ts#L298)

Generate improvement recommendations

#### Returns

`string`[]
