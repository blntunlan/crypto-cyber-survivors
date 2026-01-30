[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/analytics/PlayerTracker](../README.md) / PlayerTracker

# Class: PlayerTracker

Defined in: [services/analytics/PlayerTracker.ts:24](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L24)

## Methods

### getInstance()

> `static` **getInstance**(): `PlayerTracker`

Defined in: [services/analytics/PlayerTracker.ts:34](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L34)

#### Returns

`PlayerTracker`

***

### updateHighScore()

> **updateHighScore**(`newScore`): `Promise`\<`boolean`\>

Defined in: [services/analytics/PlayerTracker.ts:179](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L179)

Update high score if new score is higher

#### Parameters

##### newScore

`number`

#### Returns

`Promise`\<`boolean`\>

true if high score was updated, false otherwise

***

### getHighScore()

> **getHighScore**(): `number`

Defined in: [services/analytics/PlayerTracker.ts:215](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L215)

Get player's current high score

#### Returns

`number`

***

### trackDeviceProfile()

> **trackDeviceProfile**(`fingerprint`, `profile`): `Promise`\<`void`\>

Defined in: [services/analytics/PlayerTracker.ts:222](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L222)

Track device profile

#### Parameters

##### fingerprint

`string`

##### profile

###### deviceType

`string`

###### browser

`string`

###### screenWidth

`number`

###### screenHeight

`number`

###### hardwareConcurrency

`number`

###### deviceMemory?

`number`

###### recommendedProfile

`string`

###### benchmarkScore?

`number`

#### Returns

`Promise`\<`void`\>

***

### getCurrentPlayer()

> **getCurrentPlayer**(): `PlayerData` \| `null`

Defined in: [services/analytics/PlayerTracker.ts:270](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L270)

Get current player data

#### Returns

`PlayerData` \| `null`

***

### refresh()

> **refresh**(): `Promise`\<`void`\>

Defined in: [services/analytics/PlayerTracker.ts:277](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L277)

Re-initialize player (call after login/nickname change)

#### Returns

`Promise`\<`void`\>

***

### stop()

> **stop**(): `void`

Defined in: [services/analytics/PlayerTracker.ts:285](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L285)

Stop heartbeat on logout

#### Returns

`void`

***

### resetForTesting()

> `static` **resetForTesting**(): `void`

Defined in: [services/analytics/PlayerTracker.ts:297](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/PlayerTracker.ts#L297)

Reset instance for testing

#### Returns

`void`
