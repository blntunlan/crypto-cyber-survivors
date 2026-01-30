[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/analytics/DeviceProfiler](../README.md) / DeviceProfiler

# Class: DeviceProfiler

Defined in: [services/analytics/DeviceProfiler.ts:15](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/DeviceProfiler.ts#L15)

## Constructors

### Constructor

> **new DeviceProfiler**(): `DeviceProfiler`

#### Returns

`DeviceProfiler`

## Methods

### getFingerprint()

> `static` **getFingerprint**(): `string`

Defined in: [services/analytics/DeviceProfiler.ts:21](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/DeviceProfiler.ts#L21)

Get or create a unique device fingerprint.

#### Returns

`string`

***

### getProfile()

> `static` **getProfile**(): [`DeviceProfile`](../interfaces/DeviceProfile.md)

Defined in: [services/analytics/DeviceProfiler.ts:33](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/DeviceProfiler.ts#L33)

Collect full device metadata.

#### Returns

[`DeviceProfile`](../interfaces/DeviceProfile.md)

***

### syncToSupabase()

> `static` **syncToSupabase**(): `Promise`\<`void`\>

Defined in: [services/analytics/DeviceProfiler.ts:71](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/DeviceProfiler.ts#L71)

Sync profile to Supabase.

#### Returns

`Promise`\<`void`\>
