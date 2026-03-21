[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/analytics/ErrorTracker](../README.md) / ErrorTracker

# Class: ErrorTracker

Defined in: [services/analytics/ErrorTracker.ts:101](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L101)

## Methods

### getInstance()

> `static` **getInstance**(): `ErrorTracker`

Defined in: [services/analytics/ErrorTracker.ts:131](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L131)

#### Returns

`ErrorTracker`

***

### captureError()

> **captureError**(`options`): `void`

Defined in: [services/analytics/ErrorTracker.ts:143](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L143)

Capture an error manually

#### Parameters

##### options

###### errorType

`string`

###### errorMessage

`string`

###### stackTrace?

`string`

###### category?

`ErrorCategory`

###### severity?

`ErrorSeverity`

###### context?

`Record`\<`string`, `unknown`\>

###### tags?

`string`[]

#### Returns

`void`

***

### captureNetworkError()

> **captureNetworkError**(`url`, `method`, `status`, `statusText`, `duration?`): `void`

Defined in: [services/analytics/ErrorTracker.ts:215](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L215)

Capture network error with details

#### Parameters

##### url

`string`

##### method

`string`

##### status

`number`

##### statusText

`string`

##### duration?

`number`

#### Returns

`void`

***

### capturePerformanceIssue()

> **capturePerformanceIssue**(`metric`, `value`, `threshold`, `unit`): `void`

Defined in: [services/analytics/ErrorTracker.ts:241](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L241)

Capture performance issue

#### Parameters

##### metric

`string`

##### value

`number`

##### threshold

`number`

##### unit

`string` = `''`

#### Returns

`void`

***

### captureGameError()

> **captureGameError**(`errorType`, `message`, `gameData?`): `void`

Defined in: [services/analytics/ErrorTracker.ts:266](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L266)

Capture game-specific error

#### Parameters

##### errorType

`string`

##### message

`string`

##### gameData?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### addBreadcrumb()

> **addBreadcrumb**(`category`, `message`, `data?`): `void`

Defined in: [services/analytics/ErrorTracker.ts:280](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L280)

Add breadcrumb (user action tracking)

#### Parameters

##### category

`string`

##### message

`string`

##### data?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### setGameContext()

> **setGameContext**(`context`): `void`

Defined in: [services/analytics/ErrorTracker.ts:297](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L297)

Update game context (called by game systems)

#### Parameters

##### context

`Partial`\<`GameContext`\>

#### Returns

`void`

***

### addTag()

> **addTag**(`tag`): `void`

Defined in: [services/analytics/ErrorTracker.ts:304](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L304)

Add global tag

#### Parameters

##### tag

`string`

#### Returns

`void`

***

### removeTag()

> **removeTag**(`tag`): `void`

Defined in: [services/analytics/ErrorTracker.ts:313](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L313)

Remove global tag

#### Parameters

##### tag

`string`

#### Returns

`void`

***

### getStats()

> **getStats**(): `object`

Defined in: [services/analytics/ErrorTracker.ts:323](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L323)

Get error statistics

#### Returns

`object`

##### queueSize

> **queueSize**: `number`

##### recentErrorsCount

> **recentErrorsCount**: `number`

##### breadcrumbsCount

> **breadcrumbsCount**: `number`

##### sessionDurationMs

> **sessionDurationMs**: `number`

***

### resetForTesting()

> `static` **resetForTesting**(): `void`

Defined in: [services/analytics/ErrorTracker.ts:698](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorTracker.ts#L698)

Reset for testing purposes - now with proper cleanup!

#### Returns

`void`
