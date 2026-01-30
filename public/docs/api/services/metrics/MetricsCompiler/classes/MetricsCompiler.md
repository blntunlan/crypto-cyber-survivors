[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/metrics/MetricsCompiler](../README.md) / MetricsCompiler

# Class: MetricsCompiler

Defined in: [services/metrics/MetricsCompiler.ts:42](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsCompiler.ts#L42)

## Constructors

### Constructor

> **new MetricsCompiler**(): `MetricsCompiler`

#### Returns

`MetricsCompiler`

## Methods

### compileBitcoinMetrics()

> `static` **compileBitcoinMetrics**(`state`, `finalData`): [`BitcoinMetrics`](../../../../types/metrics/interfaces/BitcoinMetrics.md)

Defined in: [services/metrics/MetricsCompiler.ts:46](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsCompiler.ts#L46)

Compile Bitcoin/Market metrics

#### Parameters

##### state

[`MetricsState`](../../../../types/metrics/interfaces/MetricsState.md) | `null`

##### finalData

[`BitcoinFinalData`](../interfaces/BitcoinFinalData.md)

#### Returns

[`BitcoinMetrics`](../../../../types/metrics/interfaces/BitcoinMetrics.md)

***

### compileDifficultyMetrics()

> `static` **compileDifficultyMetrics**(`state`, `finalDifficulty`): [`DifficultyMetrics`](../../../../types/metrics/interfaces/DifficultyMetrics.md)

Defined in: [services/metrics/MetricsCompiler.ts:84](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsCompiler.ts#L84)

Compile Difficulty metrics

#### Parameters

##### state

[`MetricsState`](../../../../types/metrics/interfaces/MetricsState.md) | `null`

##### finalDifficulty

`number`

#### Returns

[`DifficultyMetrics`](../../../../types/metrics/interfaces/DifficultyMetrics.md)

***

### compilePlayerMetrics()

> `static` **compilePlayerMetrics**(`state`, `finalData`, `survivalTime`): [`PlayerMetrics`](../../../../types/metrics/interfaces/PlayerMetrics.md)

Defined in: [services/metrics/MetricsCompiler.ts:116](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsCompiler.ts#L116)

Compile Player metrics

#### Parameters

##### state

[`MetricsState`](../../../../types/metrics/interfaces/MetricsState.md) | `null`

##### finalData

[`PlayerFinalData`](../interfaces/PlayerFinalData.md)

##### survivalTime

`number`

#### Returns

[`PlayerMetrics`](../../../../types/metrics/interfaces/PlayerMetrics.md)

***

### compileComboMetrics()

> `static` **compileComboMetrics**(`state`): [`ComboMetrics`](../../../../types/metrics/interfaces/ComboMetrics.md)

Defined in: [services/metrics/MetricsCompiler.ts:141](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsCompiler.ts#L141)

Compile Combo metrics

#### Parameters

##### state

[`MetricsState`](../../../../types/metrics/interfaces/MetricsState.md) | `null`

#### Returns

[`ComboMetrics`](../../../../types/metrics/interfaces/ComboMetrics.md)

***

### compileCardMetrics()

> `static` **compileCardMetrics**(`state`): [`CardMetrics`](../../../../types/metrics/interfaces/CardMetrics.md)

Defined in: [services/metrics/MetricsCompiler.ts:159](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsCompiler.ts#L159)

Compile Card/Upgrade metrics

#### Parameters

##### state

[`MetricsState`](../../../../types/metrics/interfaces/MetricsState.md) | `null`

#### Returns

[`CardMetrics`](../../../../types/metrics/interfaces/CardMetrics.md)

***

### compileEnemyMetrics()

> `static` **compileEnemyMetrics**(`state`): [`EnemyMetrics`](../../../../types/metrics/interfaces/EnemyMetrics.md)

Defined in: [services/metrics/MetricsCompiler.ts:181](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsCompiler.ts#L181)

Compile Enemy metrics

#### Parameters

##### state

[`MetricsState`](../../../../types/metrics/interfaces/MetricsState.md) | `null`

#### Returns

[`EnemyMetrics`](../../../../types/metrics/interfaces/EnemyMetrics.md)

***

### compilePerformanceMetrics()

> `static` **compilePerformanceMetrics**(`perfData`): \{ `avgFps`: `number`; `minFps`: `number`; `maxFps?`: `number`; `fpsSamples?`: `number`; `frameDrops?`: `number`; `memoryUsedMb?`: `number`; `memoryPeakMb?`: `number`; `enemyCountMax?`: `number`; `optimizationProfile?`: `string`; `deviceFingerprint`: `string`; \} \| `undefined`

Defined in: [services/metrics/MetricsCompiler.ts:198](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsCompiler.ts#L198)

Compile Performance metrics

#### Parameters

##### perfData

###### avgFps

`number`

###### minFps

`number`

###### deviceFingerprint

`string`

#### Returns

\{ `avgFps`: `number`; `minFps`: `number`; `maxFps?`: `number`; `fpsSamples?`: `number`; `frameDrops?`: `number`; `memoryUsedMb?`: `number`; `memoryPeakMb?`: `number`; `enemyCountMax?`: `number`; `optimizationProfile?`: `string`; `deviceFingerprint`: `string`; \} \| `undefined`
