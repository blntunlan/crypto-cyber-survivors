[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/SpatialGrid](../README.md) / SpatialGrid

# Class: SpatialGrid\<T\>

Defined in: [services/SpatialGrid.ts:11](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/SpatialGrid.ts#L11)

## Type Parameters

### T

`T` *extends* `object`

## Constructors

### Constructor

> **new SpatialGrid**\<`T`\>(`cellSize`): `SpatialGrid`\<`T`\>

Defined in: [services/SpatialGrid.ts:15](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/SpatialGrid.ts#L15)

#### Parameters

##### cellSize

`number` = `100`

#### Returns

`SpatialGrid`\<`T`\>

## Methods

### clear()

> **clear**(): `void`

Defined in: [services/SpatialGrid.ts:23](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/SpatialGrid.ts#L23)

Clear the grid for a new frame

#### Returns

`void`

***

### insert()

> **insert**(`entity`): `void`

Defined in: [services/SpatialGrid.ts:39](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/SpatialGrid.ts#L39)

Insert an entity into the grid

#### Parameters

##### entity

`T`

#### Returns

`void`

***

### insertAll()

> **insertAll**(`entities`): `void`

Defined in: [services/SpatialGrid.ts:55](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/SpatialGrid.ts#L55)

Insert multiple entities into the grid

#### Parameters

##### entities

`T`[]

#### Returns

`void`

***

### getNearby()

> **getNearby**(`x`, `y`): `T`[]

Defined in: [services/SpatialGrid.ts:64](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/SpatialGrid.ts#L64)

Get all entities in the same cell and neighboring cells

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

`T`[]
