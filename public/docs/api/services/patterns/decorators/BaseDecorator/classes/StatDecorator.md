[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../../modules.md) / [services/patterns/decorators/BaseDecorator](../README.md) / StatDecorator

# Abstract Class: StatDecorator

Defined in: [services/patterns/decorators/BaseDecorator.ts:10](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L10)

IPlayerStats - Interface for player statistics

Used by the Decorator Pattern to wrap and modify player stats.
All stat modifiers (buffs/debuffs) implement this interface.

## Extended by

- [`BerserkDecorator`](../../buffs/BerserkDecorator/classes/BerserkDecorator.md)
- [`DiamondHandsDecorator`](../../buffs/DiamondHandsDecorator/classes/DiamondHandsDecorator.md)
- [`LuckBoostDecorator`](../../buffs/LuckBoostDecorator/classes/LuckBoostDecorator.md)
- [`RageModeDecorator`](../../buffs/RageModeDecorator/classes/RageModeDecorator.md)
- [`LiquidatedDecorator`](../../debuffs/LiquidatedDecorator/classes/LiquidatedDecorator.md)
- [`SlowDecorator`](../../debuffs/SlowDecorator/classes/SlowDecorator.md)
- [`VulnerableDecorator`](../../debuffs/VulnerableDecorator/classes/VulnerableDecorator.md)
- [`WeakenedDecorator`](../../debuffs/WeakenedDecorator/classes/WeakenedDecorator.md)

## Implements

- [`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md)

## Constructors

### Constructor

> **new StatDecorator**(`wrapped`): `StatDecorator`

Defined in: [services/patterns/decorators/BaseDecorator.ts:11](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L11)

#### Parameters

##### wrapped

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md)

#### Returns

`StatDecorator`

## Properties

### wrapped

> `protected` **wrapped**: [`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md)

Defined in: [services/patterns/decorators/BaseDecorator.ts:11](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L11)

## Methods

### getDamage()

> **getDamage**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:14](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L14)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getDamage`](../../IPlayerStats/interfaces/IPlayerStats.md#getdamage)

***

### getSpeed()

> **getSpeed**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:18](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L18)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getSpeed`](../../IPlayerStats/interfaces/IPlayerStats.md#getspeed)

***

### getFireRate()

> **getFireRate**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:22](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L22)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getFireRate`](../../IPlayerStats/interfaces/IPlayerStats.md#getfirerate)

***

### getCritChance()

> **getCritChance**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:26](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L26)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getCritChance`](../../IPlayerStats/interfaces/IPlayerStats.md#getcritchance)

***

### getCritDamage()

> **getCritDamage**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:30](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L30)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getCritDamage`](../../IPlayerStats/interfaces/IPlayerStats.md#getcritdamage)

***

### getArmor()

> **getArmor**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:34](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L34)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getArmor`](../../IPlayerStats/interfaces/IPlayerStats.md#getarmor)

***

### getMagnet()

> **getMagnet**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:38](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L38)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getMagnet`](../../IPlayerStats/interfaces/IPlayerStats.md#getmagnet)

***

### getProjectiles()

> **getProjectiles**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:42](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L42)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getProjectiles`](../../IPlayerStats/interfaces/IPlayerStats.md#getprojectiles)

***

### getArea()

> **getArea**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:46](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L46)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getArea`](../../IPlayerStats/interfaces/IPlayerStats.md#getarea)

***

### getLuck()

> **getLuck**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:50](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L50)

#### Returns

`number`

#### Implementation of

[`IPlayerStats`](../../IPlayerStats/interfaces/IPlayerStats.md).[`getLuck`](../../IPlayerStats/interfaces/IPlayerStats.md#getluck)

***

### getName()

> `abstract` **getName**(): `string`

Defined in: [services/patterns/decorators/BaseDecorator.ts:55](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L55)

#### Returns

`string`

***

### getIcon()

> `abstract` **getIcon**(): `string`

Defined in: [services/patterns/decorators/BaseDecorator.ts:56](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L56)

#### Returns

`string`

***

### getDuration()

> `abstract` **getDuration**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:57](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L57)

#### Returns

`number`

***

### getDescription()

> `abstract` **getDescription**(): `string`

Defined in: [services/patterns/decorators/BaseDecorator.ts:58](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L58)

#### Returns

`string`
