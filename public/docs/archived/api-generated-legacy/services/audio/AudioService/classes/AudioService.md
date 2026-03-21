[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/audio/AudioService](../README.md) / AudioService

# Class: AudioService

Defined in: [services/audio/AudioService.ts:25](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L25)

Main AudioService class - Facade for all audio operations

## Constructors

### Constructor

> **new AudioService**(): `AudioService`

#### Returns

`AudioService`

## Methods

### toggleMute()

> **toggleMute**(): `boolean`

Defined in: [services/audio/AudioService.ts:33](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L33)

Toggle mute state

#### Returns

`boolean`

***

### setVolume()

> **setVolume**(`value`): `void`

Defined in: [services/audio/AudioService.ts:42](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L42)

Set master volume (0-1)

#### Parameters

##### value

`number`

#### Returns

`void`

***

### getVolume()

> **getVolume**(): `number`

Defined in: [services/audio/AudioService.ts:50](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L50)

Get current volume

#### Returns

`number`

***

### getMuted()

> **getMuted**(): `boolean`

Defined in: [services/audio/AudioService.ts:57](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L57)

Get mute state

#### Returns

`boolean`

***

### playShoot()

> **playShoot**(`fireRate`, `projectileCount`): `void`

Defined in: [services/audio/AudioService.ts:68](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L68)

Play shoot sound - quick laser pew

#### Parameters

##### fireRate

`number` = `1`

##### projectileCount

`number` = `1`

#### Returns

`void`

***

### playCrit()

> **playCrit**(): `void`

Defined in: [services/audio/AudioService.ts:75](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L75)

Play critical hit sound

#### Returns

`void`

***

### playHit()

> **playHit**(): `void`

Defined in: [services/audio/AudioService.ts:82](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L82)

Play hit/damage sound

#### Returns

`void`

***

### playGem()

> **playGem**(): `void`

Defined in: [services/audio/AudioService.ts:89](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L89)

Play gem collection sound

#### Returns

`void`

***

### playLevelUp()

> **playLevelUp**(): `void`

Defined in: [services/audio/AudioService.ts:96](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L96)

Play level up sound

#### Returns

`void`

***

### playDash()

> **playDash**(): `void`

Defined in: [services/audio/AudioService.ts:103](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L103)

Play dash sound

#### Returns

`void`

***

### playCombo()

> **playCombo**(`multiplier`): `void`

Defined in: [services/audio/AudioService.ts:110](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L110)

Play combo sound

#### Parameters

##### multiplier

`number` = `1`

#### Returns

`void`

***

### playDeath()

> **playDeath**(): `void`

Defined in: [services/audio/AudioService.ts:117](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L117)

Play death sound

#### Returns

`void`

***

### playButton()

> **playButton**(): `void`

Defined in: [services/audio/AudioService.ts:124](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L124)

Play button click sound

#### Returns

`void`

***

### playComboMilestone()

> **playComboMilestone**(`sound`): `void`

Defined in: [services/audio/AudioService.ts:135](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L135)

Play combo milestone sound based on level

#### Parameters

##### sound

[`ComboMilestoneSound`](../../types/type-aliases/ComboMilestoneSound.md)

#### Returns

`void`

***

### playSlotTick()

> **playSlotTick**(`pitch`): `void`

Defined in: [services/audio/AudioService.ts:146](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L146)

Play slot tick sound

#### Parameters

##### pitch

`number` = `1`

#### Returns

`void`

***

### ~~playReelStop()~~

> **playReelStop**(`reelNumber`): `void`

Defined in: [services/audio/AudioService.ts:154](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L154)

Play reel stop sound

#### Parameters

##### reelNumber

`number`

#### Returns

`void`

#### Deprecated

Disabled - use audio files instead

***

### playSlotWin()

> **playSlotWin**(): `void`

Defined in: [services/audio/AudioService.ts:162](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L162)

Play slot win fanfare

#### Returns

`void`

***

### playAnticipation()

> **playAnticipation**(`intensity`): `void`

Defined in: [services/audio/AudioService.ts:169](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L169)

Play anticipation rising tone

#### Parameters

##### intensity

`number` = `1`

#### Returns

`void`

***

### loadSound()

> **loadSound**(`id`, `src`, `options?`): `Howl`

Defined in: [services/audio/AudioService.ts:180](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L180)

Load a sound file

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

Defined in: [services/audio/AudioService.ts:191](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L191)

Play a loaded sound

#### Parameters

##### id

`string`

#### Returns

`number` \| `undefined`

***

### stopSound()

> **stopSound**(`id`): `void`

Defined in: [services/audio/AudioService.ts:198](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L198)

Stop a sound

#### Parameters

##### id

`string`

#### Returns

`void`

***

### unloadAll()

> **unloadAll**(): `void`

Defined in: [services/audio/AudioService.ts:205](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/audio/AudioService.ts#L205)

Unload all sounds (cleanup)

#### Returns

`void`
