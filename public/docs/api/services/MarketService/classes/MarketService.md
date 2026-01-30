[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/MarketService](../README.md) / MarketService

# Class: MarketService

Defined in: [services/MarketService.ts:53](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L53)

## Constructors

### Constructor

> **new MarketService**(`config`): `MarketService`

Defined in: [services/MarketService.ts:90](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L90)

#### Parameters

##### config

[`MarketServiceConfig`](../interfaces/MarketServiceConfig.md)

#### Returns

`MarketService`

## Methods

### connect()

> **connect**(): `void`

Defined in: [services/MarketService.ts:103](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L103)

Connect to price feeds
Primary: Binance Futures
Fallback: Coinbase (only if Binance fails)

#### Returns

`void`

***

### getStatus()

> **getStatus**(): [`ConnectionStatus`](../interfaces/ConnectionStatus.md)

Defined in: [services/MarketService.ts:162](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L162)

Get current connection status

#### Returns

[`ConnectionStatus`](../interfaces/ConnectionStatus.md)

***

### getLastKnownPrice()

> **getLastKnownPrice**(): `number` \| `null`

Defined in: [services/MarketService.ts:173](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L173)

Get last known price (for offline fallback)

#### Returns

`number` \| `null`

***

### getPrice()

> **getPrice**(): `number`

Defined in: [services/MarketService.ts:181](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L181)

Get current price with fallback support
Returns last known price, or fallback price if never connected

#### Returns

`number`

***

### isOfflineMode()

> **isOfflineMode**(): `boolean`

Defined in: [services/MarketService.ts:188](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L188)

Check if running in offline mode (using fallback prices)

#### Returns

`boolean`

***

### isConnected()

> **isConnected**(): `boolean`

Defined in: [services/MarketService.ts:195](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L195)

Check if any price feed is connected

#### Returns

`boolean`

***

### disconnect()

> **disconnect**(): `void`

Defined in: [services/MarketService.ts:404](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L404)

Disconnect from all price feeds

#### Returns

`void`

***

### reconnect()

> **reconnect**(): `void`

Defined in: [services/MarketService.ts:436](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L436)

Force reconnect to all feeds

#### Returns

`void`

***

### destroy()

> **destroy**(): `void`

Defined in: [services/MarketService.ts:453](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L453)

Cleanup all resources (call on unmount)

#### Returns

`void`
