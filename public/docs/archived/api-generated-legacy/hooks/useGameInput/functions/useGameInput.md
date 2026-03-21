[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [hooks/useGameInput](../README.md) / useGameInput

# Function: useGameInput()

> **useGameInput**(): `object`

Defined in: [hooks/useGameInput.ts:3](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/hooks/useGameInput.ts#L3)

## Returns

### getMovementVector()

> **getMovementVector**: () => `object`

#### Returns

`object`

##### dx

> **dx**: `number` = `touchVector.current.dx`

##### dy

> **dy**: `number` = `touchVector.current.dy`

### isSpacePressed()

> **isSpacePressed**: () => `boolean`

#### Returns

`boolean`

### setTouchMovement()

> **setTouchMovement**: (`dx`, `dy`) => `void`

#### Parameters

##### dx

`number`

##### dy

`number`

#### Returns

`void`

### setTouchDash()

> **setTouchDash**: (`active`) => `void`

#### Parameters

##### active

`boolean`

#### Returns

`void`

### consumeDash()

> **consumeDash**: () => `void`

Resets the dash state after it's processed by the engine

#### Returns

`void`
