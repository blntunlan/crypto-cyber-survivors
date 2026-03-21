[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../../../modules.md) / [services/patterns/decorators/buffs/DiamondHandsDecorator](../README.md) / DiamondHandsDecorator

# Class: DiamondHandsDecorator

Defined in: [services/patterns/decorators/buffs/DiamondHandsDecorator.ts:10](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/buffs/DiamondHandsDecorator.ts#L10)

IPlayerStats - Interface for player statistics

Used by the Decorator Pattern to wrap and modify player stats.
All stat modifiers (buffs/debuffs) implement this interface.

## Extends

- [`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md)

## Constructors

### Constructor

> **new DiamondHandsDecorator**(`wrapped`): `DiamondHandsDecorator`

Defined in: [services/patterns/decorators/BaseDecorator.ts:11](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L11)

#### Parameters

##### wrapped

[`IPlayerStats`](../../../IPlayerStats/interfaces/IPlayerStats.md)

#### Returns

`DiamondHandsDecorator`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`constructor`](../../../BaseDecorator/classes/StatDecorator.md#constructor)

## Properties

### wrapped

> `protected` **wrapped**: [`IPlayerStats`](../../../IPlayerStats/interfaces/IPlayerStats.md)

Defined in: [services/patterns/decorators/BaseDecorator.ts:11](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L11)

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`wrapped`](../../../BaseDecorator/classes/StatDecorator.md#wrapped)

## Methods

### getDamage()

> **getDamage**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:14](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L14)

#### Returns

`number`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getDamage`](../../../BaseDecorator/classes/StatDecorator.md#getdamage)

***

### getSpeed()

> **getSpeed**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:18](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L18)

#### Returns

`number`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getSpeed`](../../../BaseDecorator/classes/StatDecorator.md#getspeed)

***

### getFireRate()

> **getFireRate**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:22](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L22)

#### Returns

`number`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getFireRate`](../../../BaseDecorator/classes/StatDecorator.md#getfirerate)

***

### getCritDamage()

> **getCritDamage**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:30](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L30)

#### Returns

`number`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getCritDamage`](../../../BaseDecorator/classes/StatDecorator.md#getcritdamage)

***

### getMagnet()

> **getMagnet**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:38](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L38)

#### Returns

`number`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getMagnet`](../../../BaseDecorator/classes/StatDecorator.md#getmagnet)

***

### getProjectiles()

> **getProjectiles**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:42](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L42)

#### Returns

`number`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getProjectiles`](../../../BaseDecorator/classes/StatDecorator.md#getprojectiles)

***

### getArea()

> **getArea**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:46](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L46)

#### Returns

`number`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getArea`](../../../BaseDecorator/classes/StatDecorator.md#getarea)

***

### getLuck()

> **getLuck**(): `number`

Defined in: [services/patterns/decorators/BaseDecorator.ts:50](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/BaseDecorator.ts#L50)

#### Returns

`number`

#### Inherited from

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getLuck`](../../../BaseDecorator/classes/StatDecorator.md#getluck)

***

### getArmor()

> **getArmor**(): `number`

Defined in: [services/patterns/decorators/buffs/DiamondHandsDecorator.ts:14](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/buffs/DiamondHandsDecorator.ts#L14)

#### Returns

`number`

#### Overrides

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getArmor`](../../../BaseDecorator/classes/StatDecorator.md#getarmor)

***

### getCritChance()

> **getCritChance**(): `number`

Defined in: [services/patterns/decorators/buffs/DiamondHandsDecorator.ts:18](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/buffs/DiamondHandsDecorator.ts#L18)

#### Returns

`number`

#### Overrides

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getCritChance`](../../../BaseDecorator/classes/StatDecorator.md#getcritchance)

***

### getName()

> **getName**(): `string`

Defined in: [services/patterns/decorators/buffs/DiamondHandsDecorator.ts:22](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/buffs/DiamondHandsDecorator.ts#L22)

#### Returns

`string`

#### Overrides

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getName`](../../../BaseDecorator/classes/StatDecorator.md#getname)

***

### getIcon()

> **getIcon**(): `string`

Defined in: [services/patterns/decorators/buffs/DiamondHandsDecorator.ts:26](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/buffs/DiamondHandsDecorator.ts#L26)

#### Returns

`string`

#### Overrides

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getIcon`](../../../BaseDecorator/classes/StatDecorator.md#geticon)

***

### getDuration()

> **getDuration**(): `number`

Defined in: [services/patterns/decorators/buffs/DiamondHandsDecorator.ts:30](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/buffs/DiamondHandsDecorator.ts#L30)

#### Returns

`number`

#### Overrides

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getDuration`](../../../BaseDecorator/classes/StatDecorator.md#getduration)

***

### getDescription()

> **getDescription**(): `string`

Defined in: [services/patterns/decorators/buffs/DiamondHandsDecorator.ts:34](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/patterns/decorators/buffs/DiamondHandsDecorator.ts#L34)

#### Returns

`string`

#### Overrides

[`StatDecorator`](../../../BaseDecorator/classes/StatDecorator.md).[`getDescription`](../../../BaseDecorator/classes/StatDecorator.md#getdescription)
