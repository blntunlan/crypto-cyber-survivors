[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/GameRenderer](../README.md) / GameRenderer

# Class: GameRenderer

Defined in: [services/GameRenderer.ts:11](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/GameRenderer.ts#L11)

## Constructors

### Constructor

> **new GameRenderer**(): `GameRenderer`

Defined in: [services/GameRenderer.ts:17](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/GameRenderer.ts#L17)

#### Returns

`GameRenderer`

## Methods

### render()

> **render**(`ctx`, `width`, `height`, `state`, `player`, `pool`, `status`, `graphics`): `void`

Defined in: [services/GameRenderer.ts:24](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/GameRenderer.ts#L24)

#### Parameters

##### ctx

`CanvasRenderingContext2D`

##### width

`number`

##### height

`number`

##### state

`GameState`

##### player

`Player`

##### pool

[`PoolManager`](../../PoolManager/classes/PoolManager.md)

##### status

`GameStatus`

##### graphics

[`GraphicsConfig`](../../renderers/types/interfaces/GraphicsConfig.md) = `...`

#### Returns

`void`

***

### updateBackgroundCandles()

> **updateBackgroundCandles**(`state`, `pnl`, `difficulty`, `dtFactor`, `width`, `height`): `void`

Defined in: [services/GameRenderer.ts:63](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/GameRenderer.ts#L63)

Update background candle positions based on market trend.
Delegates logic to BackgroundRenderer.

#### Parameters

##### state

`GameState`

##### pnl

`number`

##### difficulty

`number`

##### dtFactor

`number`

##### width

`number`

##### height

`number`

#### Returns

`void`
