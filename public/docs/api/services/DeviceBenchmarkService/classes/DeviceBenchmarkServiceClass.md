[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/DeviceBenchmarkService](../README.md) / DeviceBenchmarkServiceClass

# Class: DeviceBenchmarkServiceClass

Defined in: [services/DeviceBenchmarkService.ts:29](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L29)

## Constructors

### Constructor

> **new DeviceBenchmarkServiceClass**(): `DeviceBenchmarkServiceClass`

Defined in: [services/DeviceBenchmarkService.ts:44](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L44)

#### Returns

`DeviceBenchmarkServiceClass`

## Methods

### resetStateForTesting()

> **resetStateForTesting**(): `void`

Defined in: [services/DeviceBenchmarkService.ts:55](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L55)

Reset state for testing

#### Returns

`void`

***

### getState()

> **getState**(): [`BenchmarkState`](../../../types/DeviceProfile/interfaces/BenchmarkState.md)

Defined in: [services/DeviceBenchmarkService.ts:92](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L92)

Get current benchmark state

#### Returns

[`BenchmarkState`](../../../types/DeviceProfile/interfaces/BenchmarkState.md)

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Defined in: [services/DeviceBenchmarkService.ts:99](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L99)

Subscribe to state changes

#### Parameters

##### listener

(`state`) => `void`

#### Returns

> (): `void`

##### Returns

`void`

***

### isInManualMode()

> **isInManualMode**(): `boolean`

Defined in: [services/DeviceBenchmarkService.ts:107](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L107)

Check if user is in manual mode (has manually selected a profile)

#### Returns

`boolean`

***

### runBenchmark()

> **runBenchmark**(`forceRun`): `Promise`\<[`BenchmarkResult`](../../../types/DeviceProfile/interfaces/BenchmarkResult.md)\>

Defined in: [services/DeviceBenchmarkService.ts:118](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L118)

Run benchmark or return cached result

Benchmark always runs to establish baseline device capabilities.
However, if user has chosen a manual profile, that takes precedence
for the active config (but benchmark result is still stored).

#### Parameters

##### forceRun

`boolean` = `false`

#### Returns

`Promise`\<[`BenchmarkResult`](../../../types/DeviceProfile/interfaces/BenchmarkResult.md)\>

***

### getPerformanceConfig()

> **getPerformanceConfig**(): [`PerformanceConfig`](../../../types/DeviceProfile/interfaces/PerformanceConfig.md)

Defined in: [services/DeviceBenchmarkService.ts:190](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L190)

Get current performance config (after benchmark)

#### Returns

[`PerformanceConfig`](../../../types/DeviceProfile/interfaces/PerformanceConfig.md)

***

### setManualProfile()

> **setManualProfile**(`profile`): `void`

Defined in: [services/DeviceBenchmarkService.ts:206](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L206)

Force a specific profile (for settings override)

#### Parameters

##### profile

[`DeviceProfile`](../../../types/DeviceProfile/enumerations/DeviceProfile.md)

#### Returns

`void`

***

### resetToAuto()

> **resetToAuto**(): `void`

Defined in: [services/DeviceBenchmarkService.ts:242](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L242)

Reset to automatic profile (from benchmark result)

Removes manual profile override and switches back to using
the benchmark result for performance optimization.

#### Returns

`void`

***

### clearCache()

> **clearCache**(): `void`

Defined in: [services/DeviceBenchmarkService.ts:272](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/DeviceBenchmarkService.ts#L272)

Clear cached benchmark result

#### Returns

`void`
