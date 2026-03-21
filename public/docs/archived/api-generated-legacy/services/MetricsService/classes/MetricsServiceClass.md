[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [services/MetricsService](../README.md) / MetricsServiceClass

# Class: MetricsServiceClass

Defined in: [services/MetricsService.ts:42](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L42)

## Methods

### getInstance()

> `static` **getInstance**(): `MetricsServiceClass`

Defined in: [services/MetricsService.ts:62](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L62)

#### Returns

`MetricsServiceClass`

***

### startSession()

> **startSession**(`position`, `entryPrice`, `leverage`, `pair`): `string`

Defined in: [services/MetricsService.ts:71](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L71)

Start a new metrics session

#### Parameters

##### position

`MarketPosition`

##### entryPrice

`number`

##### leverage

`number`

##### pair

[`CryptoPair`](../../../types/crypto/type-aliases/CryptoPair.md)

#### Returns

`string`

***

### endSession()

> **endSession**(`reason`, `finalData`): [`SessionMetrics`](../../../types/metrics/interfaces/SessionMetrics.md) \| `null`

Defined in: [services/MetricsService.ts:161](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L161)

End the current session and compile metrics

#### Parameters

##### reason

[`GameEndReason`](../../../types/metrics/enumerations/GameEndReason.md)

##### finalData

###### price

`number`

###### pnl

`number`

###### level

`number`

###### hp

`number`

###### difficulty

`number`

###### playerStats

\{ `damage`: `number`; `fireRate`: `number`; `speed`: `number`; `luck`: `number`; `critChance`: `number`; `critDamage`: `number`; \}

###### playerStats.damage

`number`

###### playerStats.fireRate

`number`

###### playerStats.speed

`number`

###### playerStats.luck

`number`

###### playerStats.critChance

`number`

###### playerStats.critDamage

`number`

###### position

`MarketPosition`

###### entryPrice

`number`

###### leverage

`number`

###### totalKills

`number`

###### avgFps?

`number`

###### minFps?

`number`

###### deviceFingerprint?

`string`

#### Returns

[`SessionMetrics`](../../../types/metrics/interfaces/SessionMetrics.md) \| `null`

***

### update()

> **update**(`deltaMs`, `currentData`): `void`

Defined in: [services/MetricsService.ts:241](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L241)

Update metrics during game loop (call every frame)

#### Parameters

##### deltaMs

`number`

##### currentData

###### pnl

`number`

###### atr

`number`

###### difficulty

`number`

###### wavePhase

[`WavePhase`](../../../types/metrics/type-aliases/WavePhase.md)

###### hpPercent

`number`

###### enemyCount

`number`

#### Returns

`void`

***

### trackDamageDealt()

> **trackDamageDealt**(`amount`, `isCrit`, `isSuperCrit`): `void`

Defined in: [services/MetricsService.ts:300](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L300)

Track damage dealt

#### Parameters

##### amount

`number`

##### isCrit

`boolean`

##### isSuperCrit

`boolean`

#### Returns

`void`

***

### trackDamageTaken()

> **trackDamageTaken**(`amount`): `void`

Defined in: [services/MetricsService.ts:311](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L311)

Track damage taken

#### Parameters

##### amount

`number`

#### Returns

`void`

***

### trackKill()

> **trackKill**(`enemyType`, `lifetime`): `void`

Defined in: [services/MetricsService.ts:319](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L319)

Track enemy kill

#### Parameters

##### enemyType

`string`

##### lifetime

`number`

#### Returns

`void`

***

### trackSpawn()

> **trackSpawn**(): `void`

Defined in: [services/MetricsService.ts:329](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L329)

Track enemy spawn

#### Returns

`void`

***

### trackGemCollected()

> **trackGemCollected**(`value`): `void`

Defined in: [services/MetricsService.ts:337](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L337)

Track gem collected

#### Parameters

##### value

`number`

#### Returns

`void`

***

### trackHealing()

> **trackHealing**(`amount`): `void`

Defined in: [services/MetricsService.ts:346](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L346)

Track healing

#### Parameters

##### amount

`number`

#### Returns

`void`

***

### trackBulletFired()

> **trackBulletFired**(): `void`

Defined in: [services/MetricsService.ts:354](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L354)

Track bullet fired

#### Returns

`void`

***

### trackLevelUp()

> **trackLevelUp**(`level`, `cardChosen`, `cardTier`): `void`

Defined in: [services/MetricsService.ts:362](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L362)

Track level up

#### Parameters

##### level

`number`

##### cardChosen

`string`

##### cardTier

`string`

#### Returns

`void`

***

### trackComboUpdate()

> **trackComboUpdate**(`streak`, `_multiplier`): `void`

Defined in: [services/MetricsService.ts:380](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L380)

Track combo update

#### Parameters

##### streak

`number`

##### \_multiplier

`number`

#### Returns

`void`

***

### trackComboMilestone()

> **trackComboMilestone**(`milestoneName`): `void`

Defined in: [services/MetricsService.ts:396](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L396)

Track combo milestone

#### Parameters

##### milestoneName

`string`

#### Returns

`void`

***

### trackComboEnd()

> **trackComboEnd**(`finalStreak`, `bonusXp`): `void`

Defined in: [services/MetricsService.ts:404](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L404)

Track combo end

#### Parameters

##### finalStreak

`number`

##### bonusXp

`number`

#### Returns

`void`

***

### trackNearDeathActivation()

> **trackNearDeathActivation**(): `void`

Defined in: [services/MetricsService.ts:426](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L426)

Track near-death activation

#### Returns

`void`

***

### exportAsJSON()

> **exportAsJSON**(): `string`

Defined in: [services/MetricsService.ts:748](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L748)

Export all sessions as JSON

#### Returns

`string`

***

### exportAsCSV()

> **exportAsCSV**(): `string`

Defined in: [services/MetricsService.ts:755](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L755)

Export all sessions as CSV (summary format)

#### Returns

`string`

***

### getSessions()

> **getSessions**(): [`SessionMetrics`](../../../types/metrics/interfaces/SessionMetrics.md)[]

Defined in: [services/MetricsService.ts:762](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L762)

Get stored sessions

#### Returns

[`SessionMetrics`](../../../types/metrics/interfaces/SessionMetrics.md)[]

***

### getSessionCount()

> **getSessionCount**(): `number`

Defined in: [services/MetricsService.ts:769](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L769)

Get session count

#### Returns

`number`

***

### clearSessions()

> **clearSessions**(): `void`

Defined in: [services/MetricsService.ts:776](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L776)

Clear all stored sessions

#### Returns

`void`

***

### getInsights()

> **getInsights**(): [`GameInsights`](../../../types/metrics/interfaces/GameInsights.md)

Defined in: [services/MetricsService.ts:788](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L788)

Get comprehensive game insights

#### Returns

[`GameInsights`](../../../types/metrics/interfaces/GameInsights.md)

***

### getBitcoinInsights()

> **getBitcoinInsights**(): [`BitcoinInsights`](../../../types/metrics/interfaces/BitcoinInsights.md)

Defined in: [services/MetricsService.ts:796](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L796)

Get Bitcoin-specific insights

#### Returns

[`BitcoinInsights`](../../../types/metrics/interfaces/BitcoinInsights.md)

***

### getDifficultyInsights()

> **getDifficultyInsights**(): [`DifficultyInsights`](../../../types/metrics/interfaces/DifficultyInsights.md)

Defined in: [services/MetricsService.ts:804](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L804)

Get difficulty-specific insights

#### Returns

[`DifficultyInsights`](../../../types/metrics/interfaces/DifficultyInsights.md)

***

### getPlayerExperienceInsights()

> **getPlayerExperienceInsights**(): [`PlayerExperienceInsights`](../../../types/metrics/interfaces/PlayerExperienceInsights.md)

Defined in: [services/MetricsService.ts:812](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L812)

Get player experience insights

#### Returns

[`PlayerExperienceInsights`](../../../types/metrics/interfaces/PlayerExperienceInsights.md)

***

### generateRecommendations()

> **generateRecommendations**(): `string`[]

Defined in: [services/MetricsService.ts:821](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L821)

Generate improvement recommendations
Delegated to MetricsAnalyzer

#### Returns

`string`[]

***

### getCurrentState()

> **getCurrentState**(): [`MetricsState`](../../../types/metrics/interfaces/MetricsState.md) \| `null`

Defined in: [services/MetricsService.ts:837](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L837)

Get current session state (for debugging)

#### Returns

[`MetricsState`](../../../types/metrics/interfaces/MetricsState.md) \| `null`

***

### isSessionActive()

> **isSessionActive**(): `boolean`

Defined in: [services/MetricsService.ts:844](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L844)

Check if a session is active

#### Returns

`boolean`

***

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [services/MetricsService.ts:851](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L851)

Check if metrics collection is enabled

#### Returns

`boolean`

***

### getConfig()

> **getConfig**(): `MetricsConfig`

Defined in: [services/MetricsService.ts:858](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L858)

Get current config (for debugging)

#### Returns

`MetricsConfig`

***

### resetStateForTesting()

> **resetStateForTesting**(): `void`

Defined in: [services/MetricsService.ts:865](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/MetricsService.ts#L865)

Reset for testing purposes

#### Returns

`void`
