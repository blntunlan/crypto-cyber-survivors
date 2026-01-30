[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/CombatSystem](../README.md) / CombatSystem

# Class: CombatSystem

Defined in: [services/CombatSystem.ts:20](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/CombatSystem.ts#L20)

CombatSystem handles all firing and combat-related logic.
Extracted from GameEngine for better separation of concerns.

## Constructors

### Constructor

> **new CombatSystem**(): `CombatSystem`

#### Returns

`CombatSystem`

## Methods

### processAutoFire()

> `static` **processAutoFire**(`pool`, `player`, `state`, `deltaMs`, `screenWidth?`, `screenHeight?`): `void`

Defined in: [services/CombatSystem.ts:31](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/CombatSystem.ts#L31)

Process auto-fire logic for the player.
Finds nearest enemy and fires projectiles at it.

#### Parameters

##### pool

[`PoolManager`](../../PoolManager/classes/PoolManager.md)

The pool manager containing active entities

##### player

`Player`

The player entity

##### state

`GameState`

Current game state

##### deltaMs

`number`

##### screenWidth?

`number`

##### screenHeight?

`number`

#### Returns

`void`

Updated lastFireTime if fired, otherwise returns current value
