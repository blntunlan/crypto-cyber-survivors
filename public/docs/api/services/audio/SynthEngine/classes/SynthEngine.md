[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/audio/SynthEngine](../README.md) / SynthEngine

# Class: SynthEngine

Defined in: [services/audio/SynthEngine.ts:20](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L20)

Core synthesizer engine for Web Audio API operations

## Constructors

### Constructor

> **new SynthEngine**(): `SynthEngine`

#### Returns

`SynthEngine`

## Methods

### init()

> **init**(): [`SynthContext`](../../types/interfaces/SynthContext.md) \| `null`

Defined in: [services/audio/SynthEngine.ts:30](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L30)

Initialize or resume the AudioContext

#### Returns

[`SynthContext`](../../types/interfaces/SynthContext.md) \| `null`

***

### getContext()

> **getContext**(): [`SynthContext`](../../types/interfaces/SynthContext.md) \| `null`

Defined in: [services/audio/SynthEngine.ts:48](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L48)

Get current synth context (if initialized)

#### Returns

[`SynthContext`](../../types/interfaces/SynthContext.md) \| `null`

***

### isOnCooldown()

> **isOnCooldown**(`type`): `boolean`

Defined in: [services/audio/SynthEngine.ts:58](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L58)

Check if a sound type is currently on cooldown

#### Parameters

##### type

[`SoundType`](../../types/type-aliases/SoundType.md)

#### Returns

`boolean`

***

### setMuted()

> **setMuted**(`muted`): `void`

Defined in: [services/audio/SynthEngine.ts:76](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L76)

Set mute state

#### Parameters

##### muted

`boolean`

#### Returns

`void`

***

### getMuted()

> **getMuted**(): `boolean`

Defined in: [services/audio/SynthEngine.ts:84](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L84)

Get mute state

#### Returns

`boolean`

***

### toggleMute()

> **toggleMute**(): `boolean`

Defined in: [services/audio/SynthEngine.ts:91](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L91)

Toggle mute state and return new state

#### Returns

`boolean`

***

### setVolume()

> **setVolume**(`value`): `void`

Defined in: [services/audio/SynthEngine.ts:100](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L100)

Set master volume (0-1)

#### Parameters

##### value

`number`

#### Returns

`void`

***

### getVolume()

> **getVolume**(): `number`

Defined in: [services/audio/SynthEngine.ts:108](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L108)

Get current volume

#### Returns

`number`

***

### createOscillator()

> **createOscillator**(`type`, `frequency`): \{ `osc`: `OscillatorNode`; `gain`: `GainNode`; \} \| `null`

Defined in: [services/audio/SynthEngine.ts:125](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L125)

Create an oscillator with common setup

#### Parameters

##### type

`OscillatorType`

##### frequency

`number`

#### Returns

\{ `osc`: `OscillatorNode`; `gain`: `GainNode`; \} \| `null`

***

### getCurrentTime()

> **getCurrentTime**(): `number`

Defined in: [services/audio/SynthEngine.ts:147](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/SynthEngine.ts#L147)

Get current time from AudioContext

#### Returns

`number`
