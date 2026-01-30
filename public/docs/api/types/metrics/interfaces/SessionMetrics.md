[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [types/metrics](../README.md) / SessionMetrics

# Interface: SessionMetrics

Defined in: [types/metrics.ts:122](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L122)

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/metrics.ts:123](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L123)

***

### sessionTimestamp

> **sessionTimestamp**: `number`

Defined in: [types/metrics.ts:124](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L124)

***

### gameEndReason

> **gameEndReason**: [`GameEndReason`](../enumerations/GameEndReason.md)

Defined in: [types/metrics.ts:125](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L125)

***

### pair

> **pair**: [`CryptoPair`](../../crypto/type-aliases/CryptoPair.md)

Defined in: [types/metrics.ts:126](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L126)

***

### bitcoin

> **bitcoin**: [`BitcoinMetrics`](BitcoinMetrics.md)

Defined in: [types/metrics.ts:127](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L127)

***

### difficulty

> **difficulty**: [`DifficultyMetrics`](DifficultyMetrics.md)

Defined in: [types/metrics.ts:128](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L128)

***

### player

> **player**: [`PlayerMetrics`](PlayerMetrics.md)

Defined in: [types/metrics.ts:129](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L129)

***

### combo

> **combo**: [`ComboMetrics`](ComboMetrics.md)

Defined in: [types/metrics.ts:130](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L130)

***

### card

> **card**: [`CardMetrics`](CardMetrics.md)

Defined in: [types/metrics.ts:131](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L131)

***

### enemy

> **enemy**: [`EnemyMetrics`](EnemyMetrics.md)

Defined in: [types/metrics.ts:132](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L132)

***

### performance?

> `optional` **performance**: `object`

Defined in: [types/metrics.ts:135](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L135)

#### avgFps

> **avgFps**: `number`

#### minFps

> **minFps**: `number`

#### maxFps?

> `optional` **maxFps**: `number`

#### fpsSamples?

> `optional` **fpsSamples**: `number`

#### frameDrops?

> `optional` **frameDrops**: `number`

#### memoryUsedMb?

> `optional` **memoryUsedMb**: `number`

#### memoryPeakMb?

> `optional` **memoryPeakMb**: `number`

#### enemyCountMax?

> `optional` **enemyCountMax**: `number`

#### optimizationProfile?

> `optional` **optimizationProfile**: `string`

#### deviceFingerprint

> **deviceFingerprint**: `string`
