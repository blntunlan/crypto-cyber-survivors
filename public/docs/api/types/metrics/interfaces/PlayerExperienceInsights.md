[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [types/metrics](../README.md) / PlayerExperienceInsights

# Interface: PlayerExperienceInsights

Defined in: [types/metrics.ts:255](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L255)

## Properties

### averageGameDuration

> **averageGameDuration**: `number`

Defined in: [types/metrics.ts:256](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L256)

***

### medianGameDuration

> **medianGameDuration**: `number`

Defined in: [types/metrics.ts:257](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L257)

***

### deathsByLevel

> **deathsByLevel**: `Record`\<`number`, `number`\>

Defined in: [types/metrics.ts:258](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L258)

***

### cardPopularity

> **cardPopularity**: `object`[]

Defined in: [types/metrics.ts:259](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L259)

#### card

> **card**: `string`

#### tier

> **tier**: `string`

#### pickRate

> **pickRate**: `number`

#### winRateImpact

> **winRateImpact**: `number`

***

### comboEngagement

> **comboEngagement**: `object`

Defined in: [types/metrics.ts:265](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L265)

#### averageMaxStreak

> **averageMaxStreak**: `number`

#### milestonesPerGame

> **milestonesPerGame**: `number`

#### bonusXpPerGame

> **bonusXpPerGame**: `number`

***

### progressionSpeed

> **progressionSpeed**: `object`

Defined in: [types/metrics.ts:270](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L270)

#### avgLevelsPerMinute

> **avgLevelsPerMinute**: `number`

#### avgKillsPerLevel

> **avgKillsPerLevel**: `number`
