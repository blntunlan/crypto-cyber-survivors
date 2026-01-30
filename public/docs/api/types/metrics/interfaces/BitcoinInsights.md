[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [types/metrics](../README.md) / BitcoinInsights

# Interface: BitcoinInsights

Defined in: [types/metrics.ts:211](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L211)

## Properties

### positionSuccessRate

> **positionSuccessRate**: `Record`\<`MarketPosition`, \{ `avgSurvival`: `number`; `avgLevel`: `number`; `gamesPlayed`: `number`; \}\>

Defined in: [types/metrics.ts:212](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L212)

***

### survivalByPnL

> **survivalByPnL**: `object`[]

Defined in: [types/metrics.ts:220](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L220)

#### pnlRange

> **pnlRange**: `string`

#### avgSurvival

> **avgSurvival**: `number`

#### avgLevel

> **avgLevel**: `number`

#### count

> **count**: `number`

***

### volatilityImpact

> **volatilityImpact**: `object`

Defined in: [types/metrics.ts:226](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L226)

#### lowVolatility

> **lowVolatility**: `object`

##### lowVolatility.avgSurvival

> **avgSurvival**: `number`

##### lowVolatility.avgLevel

> **avgLevel**: `number`

##### lowVolatility.count

> **count**: `number`

#### mediumVolatility

> **mediumVolatility**: `object`

##### mediumVolatility.avgSurvival

> **avgSurvival**: `number`

##### mediumVolatility.avgLevel

> **avgLevel**: `number`

##### mediumVolatility.count

> **count**: `number`

#### highVolatility

> **highVolatility**: `object`

##### highVolatility.avgSurvival

> **avgSurvival**: `number`

##### highVolatility.avgLevel

> **avgLevel**: `number`

##### highVolatility.count

> **count**: `number`

***

### pnlDifficultyCorrelation

> **pnlDifficultyCorrelation**: `number`

Defined in: [types/metrics.ts:231](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/types/metrics.ts#L231)
