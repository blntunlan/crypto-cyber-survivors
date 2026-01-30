[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/renderers/BackgroundRenderer](../README.md) / BackgroundRenderer

# Class: BackgroundRenderer

Defined in: [services/renderers/BackgroundRenderer.ts:7](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/renderers/BackgroundRenderer.ts#L7)

## Implements

- [`IRenderer`](../../types/interfaces/IRenderer.md)

## Constructors

### Constructor

> **new BackgroundRenderer**(): `BackgroundRenderer`

Defined in: [services/renderers/BackgroundRenderer.ts:16](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/renderers/BackgroundRenderer.ts#L16)

#### Returns

`BackgroundRenderer`

## Methods

### render()

> **render**(`ctx`, `_pool`, `state`, `_player`, `opts`): `void`

Defined in: [services/renderers/BackgroundRenderer.ts:20](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/renderers/BackgroundRenderer.ts#L20)

#### Parameters

##### ctx

`CanvasRenderingContext2D`

##### \_pool

[`PoolManager`](../../../PoolManager/classes/PoolManager.md)

##### state

`GameState`

##### \_player

`Player`

##### opts

[`RenderOptions`](../../types/interfaces/RenderOptions.md)

#### Returns

`void`

#### Implementation of

[`IRenderer`](../../types/interfaces/IRenderer.md).[`render`](../../types/interfaces/IRenderer.md#render)

***

### updateCandles()

> **updateCandles**(`state`, `pnl`, `difficulty`, `dtFactor`, `width`, `height`): `void`

Defined in: [services/renderers/BackgroundRenderer.ts:115](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/renderers/BackgroundRenderer.ts#L115)

Update background candle positions based on market trend.

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
