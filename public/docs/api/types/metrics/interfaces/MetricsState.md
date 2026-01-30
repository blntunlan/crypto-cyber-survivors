[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [types/metrics](../README.md) / MetricsState

# Interface: MetricsState

Defined in: [types/metrics.ts:151](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L151)

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/metrics.ts:152](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L152)

***

### sessionStartTime

> **sessionStartTime**: `number`

Defined in: [types/metrics.ts:153](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L153)

***

### isActive

> **isActive**: `boolean`

Defined in: [types/metrics.ts:154](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L154)

***

### pair

> **pair**: [`CryptoPair`](../../crypto/type-aliases/CryptoPair.md)

Defined in: [types/metrics.ts:155](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L155)

***

### lastUpdateTime

> **lastUpdateTime**: `number`

Defined in: [types/metrics.ts:158](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L158)

***

### pnlHistory

> **pnlHistory**: `object`[]

Defined in: [types/metrics.ts:159](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L159)

#### time

> **time**: `number`

#### value

> **value**: `number`

***

### difficultyHistory

> **difficultyHistory**: `object`[]

Defined in: [types/metrics.ts:160](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L160)

#### time

> **time**: `number`

#### value

> **value**: `number`

***

### atrHistory

> **atrHistory**: `object`[]

Defined in: [types/metrics.ts:161](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L161)

#### time

> **time**: `number`

#### value

> **value**: `number`

***

### currentWavePhase

> **currentWavePhase**: [`WavePhase`](../type-aliases/WavePhase.md)

Defined in: [types/metrics.ts:162](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L162)

***

### wavePhaseStartTime

> **wavePhaseStartTime**: `number`

Defined in: [types/metrics.ts:163](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L163)

***

### totalDamageDealt

> **totalDamageDealt**: `number`

Defined in: [types/metrics.ts:166](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L166)

***

### totalDamageTaken

> **totalDamageTaken**: `number`

Defined in: [types/metrics.ts:167](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L167)

***

### totalHealing

> **totalHealing**: `number`

Defined in: [types/metrics.ts:168](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L168)

***

### totalGems

> **totalGems**: `number`

Defined in: [types/metrics.ts:169](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L169)

***

### totalExp

> **totalExp**: `number`

Defined in: [types/metrics.ts:170](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L170)

***

### totalCrits

> **totalCrits**: `number`

Defined in: [types/metrics.ts:171](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L171)

***

### totalSuperCrits

> **totalSuperCrits**: `number`

Defined in: [types/metrics.ts:172](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L172)

***

### totalBullets

> **totalBullets**: `number`

Defined in: [types/metrics.ts:173](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L173)

***

### totalSpawns

> **totalSpawns**: `number`

Defined in: [types/metrics.ts:174](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L174)

***

### maxEnemiesOnScreen

> **maxEnemiesOnScreen**: `number`

Defined in: [types/metrics.ts:177](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L177)

***

### maxPnL

> **maxPnL**: `number`

Defined in: [types/metrics.ts:178](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L178)

***

### minPnL

> **minPnL**: `number`

Defined in: [types/metrics.ts:179](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L179)

***

### maxDifficulty

> **maxDifficulty**: `number`

Defined in: [types/metrics.ts:180](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L180)

***

### maxStreak

> **maxStreak**: `number`

Defined in: [types/metrics.ts:181](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L181)

***

### wavePhaseTime

> **wavePhaseTime**: `Record`\<[`WavePhase`](../type-aliases/WavePhase.md), `number`\>

Defined in: [types/metrics.ts:184](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L184)

***

### nearDeathActivations

> **nearDeathActivations**: `number`

Defined in: [types/metrics.ts:187](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L187)

***

### highDifficultyTime

> **highDifficultyTime**: `number`

Defined in: [types/metrics.ts:188](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L188)

***

### lowDifficultyTime

> **lowDifficultyTime**: `number`

Defined in: [types/metrics.ts:189](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L189)

***

### killsByType

> **killsByType**: `Record`\<`string`, `number`\>

Defined in: [types/metrics.ts:192](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L192)

***

### enemyLifetimes

> **enemyLifetimes**: `number`[]

Defined in: [types/metrics.ts:193](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L193)

***

### cardsChosen

> **cardsChosen**: `object`[]

Defined in: [types/metrics.ts:196](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L196)

#### card

> **card**: `string`

#### tier

> **tier**: `string`

#### level

> **level**: `number`

***

### levelUpTimes

> **levelUpTimes**: `number`[]

Defined in: [types/metrics.ts:197](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L197)

***

### lastLevelUpTime

> **lastLevelUpTime**: `number`

Defined in: [types/metrics.ts:198](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L198)

***

### streakHistory

> **streakHistory**: `number`[]

Defined in: [types/metrics.ts:201](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L201)

***

### comboTimeouts

> **comboTimeouts**: `number`

Defined in: [types/metrics.ts:202](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L202)

***

### mileStonesReached

> **mileStonesReached**: `string`[]

Defined in: [types/metrics.ts:203](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L203)

***

### currentComboStartTime

> **currentComboStartTime**: `number`

Defined in: [types/metrics.ts:204](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L204)

***

### longestComboTime

> **longestComboTime**: `number`

Defined in: [types/metrics.ts:205](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L205)

***

### totalBonusXp

> **totalBonusXp**: `number`

Defined in: [types/metrics.ts:206](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L206)
