[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/PhysicsSystem](../README.md) / PhysicsSystem

# Class: PhysicsSystem

Defined in: [services/PhysicsSystem.ts:17](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PhysicsSystem.ts#L17)

## Constructors

### Constructor

> **new PhysicsSystem**(): `PhysicsSystem`

#### Returns

`PhysicsSystem`

## Methods

### updateEntities()

> `static` **updateEntities**(`p`, `dtFactor`, `width`, `height`): `void`

Defined in: [services/PhysicsSystem.ts:18](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PhysicsSystem.ts#L18)

#### Parameters

##### p

[`PoolManager`](../../PoolManager/classes/PoolManager.md)

##### dtFactor

`number`

##### width

`number`

##### height

`number`

#### Returns

`void`

***

### handleCollisions()

> `static` **handleCollisions**(`p`, `player`, `s`, `dtFactor`, `width`, `height`, `onGameOver`): `void`

Defined in: [services/PhysicsSystem.ts:65](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PhysicsSystem.ts#L65)

Main collision handler - orchestrates all collision checks

#### Parameters

##### p

[`PoolManager`](../../PoolManager/classes/PoolManager.md)

##### player

`Player`

##### s

`GameState`

##### dtFactor

`number`

##### width

`number`

##### height

`number`

##### onGameOver

() => `void`

#### Returns

`void`
