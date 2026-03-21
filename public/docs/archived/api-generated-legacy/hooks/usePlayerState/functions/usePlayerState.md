[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [hooks/usePlayerState](../README.md) / usePlayerState

# Function: usePlayerState()

> **usePlayerState**(`width`, `height`): `object`

Defined in: [hooks/usePlayerState.ts:37](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/hooks/usePlayerState.ts#L37)

## Parameters

### width

`number`

### height

`number`

## Returns

### playerRef

> **playerRef**: `RefObject`\<`Player`\>

### uiStats

> **uiStats**: `Player`

### setUiStats

> **setUiStats**: `Dispatch`\<`SetStateAction`\<`Player`\>\>

### resetPlayer()

> **resetPlayer**: () => `void`

Reset player to initial state
Uses factory function to ensure fresh values every time

#### Returns

`void`

### healFull()

> **healFull**: () => `void`

Heal player to full HP

#### Returns

`void`

### setPositionColor()

> **setPositionColor**: (`pos`) => `void`

Set player color based on market position

#### Parameters

##### pos

`MarketPosition`

#### Returns

`void`
