[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [hooks/useMarketData](../README.md) / useMarketData

# Function: useMarketData()

> **useMarketData**(`gameStatus`, `position`, `entryPrice`, `leverage`, `playerRef`, `pair`): `object`

Defined in: [hooks/useMarketData.ts:23](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/hooks/useMarketData.ts#L23)

## Parameters

### gameStatus

`GameStatus`

### position

`MarketPosition`

### entryPrice

`number`

### leverage

`LeverageOption`

### playerRef

`RefObject`\<`Player`\>

### pair

[`CryptoPair`](../../../types/crypto/type-aliases/CryptoPair.md) = `'BTC'`

## Returns

`object`

### marketData

> **marketData**: `MarketData`

### priceHistory

> **priceHistory**: `number`[] = `_priceHistory`
