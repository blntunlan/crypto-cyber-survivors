[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/audio/HowlerManager](../README.md) / HowlerManager

# Class: HowlerManager

Defined in: [services/audio/HowlerManager.ts:13](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L13)

Manages file-based audio using Howler.js

## Constructors

### Constructor

> **new HowlerManager**(): `HowlerManager`

Defined in: [services/audio/HowlerManager.ts:17](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L17)

#### Returns

`HowlerManager`

## Methods

### setVolume()

> **setVolume**(`value`): `void`

Defined in: [services/audio/HowlerManager.ts:25](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L25)

Set global volume for all Howler sounds

#### Parameters

##### value

`number`

#### Returns

`void`

***

### getVolume()

> **getVolume**(): `number`

Defined in: [services/audio/HowlerManager.ts:33](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L33)

Get current volume

#### Returns

`number`

***

### setMuted()

> **setMuted**(`muted`): `void`

Defined in: [services/audio/HowlerManager.ts:40](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L40)

Set mute state for all Howler sounds

#### Parameters

##### muted

`boolean`

#### Returns

`void`

***

### loadSound()

> **loadSound**(`id`, `src`, `options?`): `Howl`

Defined in: [services/audio/HowlerManager.ts:47](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L47)

Load a sound file (for future music/voice)

#### Parameters

##### id

`string`

##### src

`string` | `string`[]

##### options?

###### loop?

`boolean`

###### volume?

`number`

#### Returns

`Howl`

***

### playSound()

> **playSound**(`id`): `number` \| `undefined`

Defined in: [services/audio/HowlerManager.ts:69](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L69)

Play a loaded sound

#### Parameters

##### id

`string`

#### Returns

`number` \| `undefined`

***

### stopSound()

> **stopSound**(`id`): `void`

Defined in: [services/audio/HowlerManager.ts:80](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L80)

Stop a sound

#### Parameters

##### id

`string`

#### Returns

`void`

***

### unloadAll()

> **unloadAll**(): `void`

Defined in: [services/audio/HowlerManager.ts:90](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/HowlerManager.ts#L90)

Unload all sounds (cleanup)

#### Returns

`void`
