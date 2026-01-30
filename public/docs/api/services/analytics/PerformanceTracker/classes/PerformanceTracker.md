[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/analytics/PerformanceTracker](../README.md) / PerformanceTracker

# Class: PerformanceTracker

Defined in: [services/analytics/PerformanceTracker.ts:13](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PerformanceTracker.ts#L13)

## Methods

### getInstance()

> `static` **getInstance**(): `PerformanceTracker`

Defined in: [services/analytics/PerformanceTracker.ts:29](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PerformanceTracker.ts#L29)

#### Returns

`PerformanceTracker`

***

### start()

> **start**(): `void`

Defined in: [services/analytics/PerformanceTracker.ts:34](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PerformanceTracker.ts#L34)

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [services/analytics/PerformanceTracker.ts:48](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PerformanceTracker.ts#L48)

#### Returns

`void`

***

### getStats()

> **getStats**(): `object`

Defined in: [services/analytics/PerformanceTracker.ts:99](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PerformanceTracker.ts#L99)

#### Returns

`object`

##### avgFps

> **avgFps**: `number` = `60`

##### minFps

> **minFps**: `number` = `60`

##### maxFps

> **maxFps**: `number` = `60`

##### sampleCount

> **sampleCount**: `number` = `0`

***

### getOnePercentLow()

> **getOnePercentLow**(): `number`

Defined in: [services/analytics/PerformanceTracker.ts:124](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PerformanceTracker.ts#L124)

Get 1% Low FPS (more representative of stutter than absolute min)

#### Returns

`number`

***

### resetForTesting()

> `static` **resetForTesting**(): `void`

Defined in: [services/analytics/PerformanceTracker.ts:137](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PerformanceTracker.ts#L137)

Reset for testing purposes.

#### Returns

`void`
