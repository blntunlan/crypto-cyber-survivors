[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/MarketService](../README.md) / MarketServiceConfig

# Interface: MarketServiceConfig

Defined in: [services/MarketService.ts:31](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L31)

## Properties

### pair

> **pair**: [`CryptoPair`](../../../types/crypto/type-aliases/CryptoPair.md)

Defined in: [services/MarketService.ts:32](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L32)

***

### onData()

> **onData**: (`update`) => `void`

Defined in: [services/MarketService.ts:33](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L33)

#### Parameters

##### update

[`MarketUpdate`](MarketUpdate.md)

#### Returns

`void`

***

### onStatusChange()?

> `optional` **onStatusChange**: (`status`) => `void`

Defined in: [services/MarketService.ts:34](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L34)

#### Parameters

##### status

[`ConnectionStatus`](ConnectionStatus.md)

#### Returns

`void`

***

### wsFactory?

> `optional` **wsFactory**: [`WebSocketFactory`](../type-aliases/WebSocketFactory.md)

Defined in: [services/MarketService.ts:35](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MarketService.ts#L35)
