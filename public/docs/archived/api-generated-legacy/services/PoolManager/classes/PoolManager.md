[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/PoolManager](../README.md) / PoolManager

# Class: PoolManager

Defined in: [services/PoolManager.ts:21](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L21)

## Constructors

### Constructor

> **new PoolManager**(): `PoolManager`

Defined in: [services/PoolManager.ts:45](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L45)

#### Returns

`PoolManager`

## Properties

### activeEnemies

> **activeEnemies**: `GameEnemy`[] = `[]`

Defined in: [services/PoolManager.ts:23](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L23)

***

### activeBullets

> **activeBullets**: `Bullet`[] = `[]`

Defined in: [services/PoolManager.ts:24](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L24)

***

### activeGems

> **activeGems**: `Gem`[] = `[]`

Defined in: [services/PoolManager.ts:25](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L25)

***

### activeParticles

> **activeParticles**: `Particle`[] = `[]`

Defined in: [services/PoolManager.ts:26](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L26)

***

### activeFloatingTexts

> **activeFloatingTexts**: `FloatingText`[] = `[]`

Defined in: [services/PoolManager.ts:27](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L27)

## Methods

### preWarm()

> **preWarm**(`config?`): `void`

Defined in: [services/PoolManager.ts:51](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L51)

Pre-warm pools to prevent allocation stutters during gameplay.
Call this before the game starts (e.g., during loading screen).

#### Parameters

##### config?

###### enemies?

`number`

###### bullets?

`number`

###### particles?

`number`

###### gems?

`number`

###### texts?

`number`

#### Returns

`void`

***

### release()

> **release**\<`T`\>(`obj`, `activeList`, `freeList`): `void`

Defined in: [services/PoolManager.ts:130](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L130)

Helper to move object back to free list

#### Type Parameters

##### T

`T` *extends* `Activatable`

#### Parameters

##### obj

`T`

##### activeList

`T`[]

##### freeList

`T`[]

#### Returns

`void`

***

### getEnemy()

> **getEnemy**(`x`, `y`, `difficulty`, `position`): `GameEnemy`

Defined in: [services/PoolManager.ts:139](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L139)

#### Parameters

##### x

`number`

##### y

`number`

##### difficulty

`number`

##### position

`MarketPosition`

#### Returns

`GameEnemy`

***

### getBullet()

> **getBullet**(`x`, `y`, `vx`, `vy`, `damage`, `radius`, `color`, `isCrit`, `isSuperCrit`): `Bullet`

Defined in: [services/PoolManager.ts:152](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L152)

#### Parameters

##### x

`number`

##### y

`number`

##### vx

`number`

##### vy

`number`

##### damage

`number`

##### radius

`number`

##### color

`string`

##### isCrit

`boolean`

##### isSuperCrit

`boolean`

#### Returns

`Bullet`

***

### getGem()

> **getGem**(`x`, `y`, `value`, `radius`, `color`, `isRare`): `Gem`

Defined in: [services/PoolManager.ts:183](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L183)

#### Parameters

##### x

`number`

##### y

`number`

##### value

`number`

##### radius

`number`

##### color

`string`

##### isRare

`boolean`

#### Returns

`Gem`

***

### getParticle()

> **getParticle**(`x`, `y`, `vx`, `vy`, `color`): `Particle`

Defined in: [services/PoolManager.ts:195](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L195)

#### Parameters

##### x

`number`

##### y

`number`

##### vx

`number`

##### vy

`number`

##### color

`string`

#### Returns

`Particle`

***

### getFloatingText()

> **getFloatingText**(`x`, `y`, `text`, `color`, `size`): `FloatingText`

Defined in: [services/PoolManager.ts:216](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L216)

#### Parameters

##### x

`number`

##### y

`number`

##### text

`string`

##### color

`string`

##### size

`number`

#### Returns

`FloatingText`

***

### cleanup()

> **cleanup**(): `void`

Defined in: [services/PoolManager.ts:232](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L232)

Efficiently cleanup inactive objects from active lists
Should be called at the end of each update loop

#### Returns

`void`

***

### clearAll()

> **clearAll**(): `void`

Defined in: [services/PoolManager.ts:250](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L250)

#### Returns

`void`

***

### trimFreeLists()

> **trimFreeLists**(`maxPoolSize`): `void`

Defined in: [services/PoolManager.ts:273](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/PoolManager.ts#L273)

Trim free lists to prevent unbounded memory growth.
Keeps a reasonable pool size for recycling while freeing excess memory.

#### Parameters

##### maxPoolSize

`number` = `50`

#### Returns

`void`
