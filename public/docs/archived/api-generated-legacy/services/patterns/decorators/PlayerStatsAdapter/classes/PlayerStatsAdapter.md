[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../../modules.md) / [services/patterns/decorators/PlayerStatsAdapter](../README.md) / PlayerStatsAdapter

# Class: PlayerStatsAdapter

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:11](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L11)

IPlayerStats - Interface for player statistics

Used by the Decorator Pattern to wrap and modify player stats.
All stat modifiers (buffs/debuffs) implement this interface.

## Implements

- [`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md)

## Constructors

### Constructor

> **new PlayerStatsAdapter**(`player`): `PlayerStatsAdapter`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:12](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L12)

#### Parameters

##### player

`Player`

#### Returns

`PlayerStatsAdapter`

## Methods

### getDamage()

> **getDamage**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:14](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L14)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getDamage`](../../IPlayerStats/interfaces/IPlayerStats.md#getdamage)

***

### getSpeed()

> **getSpeed**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:18](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L18)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getSpeed`](../../IPlayerStats/interfaces/IPlayerStats.md#getspeed)

***

### getFireRate()

> **getFireRate**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:22](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L22)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getFireRate`](../../IPlayerStats/interfaces/IPlayerStats.md#getfirerate)

***

### getCritChance()

> **getCritChance**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:26](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L26)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getCritChance`](../../IPlayerStats/interfaces/IPlayerStats.md#getcritchance)

***

### getCritDamage()

> **getCritDamage**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:30](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L30)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getCritDamage`](../../IPlayerStats/interfaces/IPlayerStats.md#getcritdamage)

***

### getArmor()

> **getArmor**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:35](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L35)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getArmor`](../../IPlayerStats/interfaces/IPlayerStats.md#getarmor)

***

### getMagnet()

> **getMagnet**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:39](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L39)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getMagnet`](../../IPlayerStats/interfaces/IPlayerStats.md#getmagnet)

***

### getProjectiles()

> **getProjectiles**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:43](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L43)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getProjectiles`](../../IPlayerStats/interfaces/IPlayerStats.md#getprojectiles)

***

### getArea()

> **getArea**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:47](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L47)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getArea`](../../IPlayerStats/interfaces/IPlayerStats.md#getarea)

***

### getLuck()

> **getLuck**(): `number`

Defined in: [services/patterns/decorators/PlayerStatsAdapter.ts:51](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/PlayerStatsAdapter.ts#L51)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getLuck`](../../IPlayerStats/interfaces/IPlayerStats.md#getluck)
