[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [stores/gameStore](../README.md) / GameStoreActions

# Interface: GameStoreActions

Defined in: [stores/gameStore.ts:79](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L79)

## Properties

### setMasterVolume()

> **setMasterVolume**: (`volume`) => `void`

Defined in: [stores/gameStore.ts:81](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L81)

#### Parameters

##### volume

`number`

#### Returns

`void`

***

### setSfxVolume()

> **setSfxVolume**: (`volume`) => `void`

Defined in: [stores/gameStore.ts:82](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L82)

#### Parameters

##### volume

`number`

#### Returns

`void`

***

### setMusicVolume()

> **setMusicVolume**: (`volume`) => `void`

Defined in: [stores/gameStore.ts:83](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L83)

#### Parameters

##### volume

`number`

#### Returns

`void`

***

### toggleMute()

> **toggleMute**: () => `void`

Defined in: [stores/gameStore.ts:84](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L84)

#### Returns

`void`

***

### toggleParticles()

> **toggleParticles**: () => `void`

Defined in: [stores/gameStore.ts:87](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L87)

#### Returns

`void`

***

### toggleScreenShake()

> **toggleScreenShake**: () => `void`

Defined in: [stores/gameStore.ts:88](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L88)

#### Returns

`void`

***

### toggleDamageNumbers()

> **toggleDamageNumbers**: () => `void`

Defined in: [stores/gameStore.ts:89](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L89)

#### Returns

`void`

***

### toggleReducedMotion()

> **toggleReducedMotion**: () => `void`

Defined in: [stores/gameStore.ts:90](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L90)

#### Returns

`void`

***

### setHudScale()

> **setHudScale**: (`scale`) => `void`

Defined in: [stores/gameStore.ts:91](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L91)

#### Parameters

##### scale

`number`

#### Returns

`void`

***

### toggleFPS()

> **toggleFPS**: () => `void`

Defined in: [stores/gameStore.ts:92](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L92)

#### Returns

`void`

***

### recordGameEnd()

> **recordGameEnd**: (`score`, `level`, `survivalTime`, `kills`) => `void`

Defined in: [stores/gameStore.ts:95](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L95)

#### Parameters

##### score

`number`

##### level

`number`

##### survivalTime

`number`

##### kills

`number`

#### Returns

`void`

***

### addCardCollected()

> **addCardCollected**: (`cardId`) => `void`

Defined in: [stores/gameStore.ts:96](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L96)

#### Parameters

##### cardId

`string`

#### Returns

`void`

***

### unlockAchievement()

> **unlockAchievement**: (`achievementId`) => `void`

Defined in: [stores/gameStore.ts:97](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L97)

#### Parameters

##### achievementId

`string`

#### Returns

`void`

***

### resetProgress()

> **resetProgress**: () => `void`

Defined in: [stores/gameStore.ts:98](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L98)

#### Returns

`void`

***

### startNewSession()

> **startNewSession**: () => `void`

Defined in: [stores/gameStore.ts:101](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L101)

#### Returns

`void`

***

### incrementGamesPlayed()

> **incrementGamesPlayed**: () => `void`

Defined in: [stores/gameStore.ts:102](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L102)

#### Returns

`void`

***

### markTutorialSeen()

> **markTutorialSeen**: () => `void`

Defined in: [stores/gameStore.ts:105](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L105)

#### Returns

`void`

***

### setMobileSetting()

> **setMobileSetting**: \<`K`\>(`key`, `value`) => `void`

Defined in: [stores/gameStore.ts:108](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L108)

#### Type Parameters

##### K

`K` *extends* keyof [`MobileControlSettings`](../../../types/MobileSettings/interfaces/MobileControlSettings.md)

#### Parameters

##### key

`K`

##### value

[`MobileControlSettings`](../../../types/MobileSettings/interfaces/MobileControlSettings.md)\[`K`\]

#### Returns

`void`

***

### resetSettings()

> **resetSettings**: () => `void`

Defined in: [stores/gameStore.ts:114](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/stores/gameStore.ts#L114)

#### Returns

`void`
