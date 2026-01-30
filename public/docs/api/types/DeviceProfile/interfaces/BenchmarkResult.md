[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [types/DeviceProfile](../README.md) / BenchmarkResult

# Interface: BenchmarkResult

Defined in: [types/DeviceProfile.ts:53](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L53)

## Properties

### gpuScore

> **gpuScore**: `number`

Defined in: [types/DeviceProfile.ts:55](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L55)

GPU rendering score (higher = better)

***

### cpuScore

> **cpuScore**: `number`

Defined in: [types/DeviceProfile.ts:58](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L58)

CPU computation score (higher = better)

***

### combinedScore

> **combinedScore**: `number`

Defined in: [types/DeviceProfile.ts:61](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L61)

Combined weighted score

***

### profile

> **profile**: [`DeviceProfile`](../enumerations/DeviceProfile.md)

Defined in: [types/DeviceProfile.ts:64](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L64)

Detected device profile

***

### deviceMemory

> **deviceMemory**: `number` \| `null`

Defined in: [types/DeviceProfile.ts:67](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L67)

Device memory in GB (if available)

***

### hardwareConcurrency

> **hardwareConcurrency**: `number`

Defined in: [types/DeviceProfile.ts:70](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L70)

CPU core count

***

### gpuRenderer

> **gpuRenderer**: `string` \| `null`

Defined in: [types/DeviceProfile.ts:73](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L73)

WebGL renderer string

***

### timestamp

> **timestamp**: `number`

Defined in: [types/DeviceProfile.ts:76](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L76)

Benchmark timestamp

***

### version

> **version**: `string`

Defined in: [types/DeviceProfile.ts:79](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/DeviceProfile.ts#L79)

Benchmark version (for cache invalidation)
