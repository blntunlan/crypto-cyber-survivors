[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/admin/PriceAnalyzerService](../README.md) / PriceAnalyzerService

# Class: PriceAnalyzerService

Defined in: [services/admin/PriceAnalyzerService.ts:47](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L47)

## Methods

### getInstance()

> `static` **getInstance**(): `PriceAnalyzerService`

Defined in: [services/admin/PriceAnalyzerService.ts:70](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L70)

#### Returns

`PriceAnalyzerService`

***

### loadHistoryFromSupabase()

> **loadHistoryFromSupabase**(): `Promise`\<`void`\>

Defined in: [services/admin/PriceAnalyzerService.ts:82](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L82)

Load historical price data from Supabase price_logs table
Call this when Admin Dashboard opens

#### Returns

`Promise`\<`void`\>

***

### isHistoryLoaded()

> **isHistoryLoaded**(): `boolean`

Defined in: [services/admin/PriceAnalyzerService.ts:160](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L160)

Check if history has been loaded from Supabase

#### Returns

`boolean`

***

### addPrice()

> **addPrice**(`pair`, `price`, `source`): `void`

Defined in: [services/admin/PriceAnalyzerService.ts:171](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L171)

Add a new price point and recalculate analysis

#### Parameters

##### pair

[`CryptoPair`](../../../../types/admin/type-aliases/CryptoPair.md)

##### price

`number`

##### source

[`PriceSource`](../../../../types/admin/type-aliases/PriceSource.md) = `'binance'`

#### Returns

`void`

***

### getAnalysis()

> **getAnalysis**(`pair`): [`PriceAnalysis`](../../../../types/admin/interfaces/PriceAnalysis.md) \| `null`

Defined in: [services/admin/PriceAnalyzerService.ts:197](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L197)

Get the latest analysis for a pair

#### Parameters

##### pair

[`CryptoPair`](../../../../types/admin/type-aliases/CryptoPair.md)

#### Returns

[`PriceAnalysis`](../../../../types/admin/interfaces/PriceAnalysis.md) \| `null`

***

### getAllAnalyses()

> **getAllAnalyses**(): `Record`\<[`CryptoPair`](../../../../types/admin/type-aliases/CryptoPair.md), [`PriceAnalysis`](../../../../types/admin/interfaces/PriceAnalysis.md) \| `null`\>

Defined in: [services/admin/PriceAnalyzerService.ts:204](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L204)

Get analyses for all pairs

#### Returns

`Record`\<[`CryptoPair`](../../../../types/admin/type-aliases/CryptoPair.md), [`PriceAnalysis`](../../../../types/admin/interfaces/PriceAnalysis.md) \| `null`\>

***

### subscribe()

> **subscribe**(`callback`): () => `void`

Defined in: [services/admin/PriceAnalyzerService.ts:215](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L215)

Subscribe to analysis updates

#### Parameters

##### callback

(`pair`, `analysis`) => `void`

#### Returns

> (): `void`

##### Returns

`void`

***

### getHistory()

> **getHistory**(`pair`, `limit?`): [`PriceSnapshot`](../../../../types/admin/interfaces/PriceSnapshot.md)[]

Defined in: [services/admin/PriceAnalyzerService.ts:223](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L223)

Get price history for a pair

#### Parameters

##### pair

[`CryptoPair`](../../../../types/admin/type-aliases/CryptoPair.md)

##### limit?

`number`

#### Returns

[`PriceSnapshot`](../../../../types/admin/interfaces/PriceSnapshot.md)[]

***

### reset()

> **reset**(): `void`

Defined in: [services/admin/PriceAnalyzerService.ts:234](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/admin/PriceAnalyzerService.ts#L234)

Clear all data (for testing)

#### Returns

`void`
