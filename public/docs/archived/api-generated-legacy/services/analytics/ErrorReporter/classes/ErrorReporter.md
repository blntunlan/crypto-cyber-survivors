[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/analytics/ErrorReporter](../README.md) / ErrorReporter

# Class: ErrorReporter

Defined in: [services/analytics/ErrorReporter.ts:23](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorReporter.ts#L23)

## Constructors

### Constructor

> **new ErrorReporter**(): `ErrorReporter`

#### Returns

`ErrorReporter`

## Methods

### report()

> `static` **report**(`error`, `type`, `context`): `Promise`\<`void`\>

Defined in: [services/analytics/ErrorReporter.ts:30](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorReporter.ts#L30)

Report an error to Supabase.

#### Parameters

##### error

`string` | `Error`

##### type

`string` = `'runtime'`

##### context

`Record`\<`string`, `unknown`\> = `{}`

#### Returns

`Promise`\<`void`\>

***

### init()

> `static` **init**(): `void`

Defined in: [services/analytics/ErrorReporter.ts:115](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorReporter.ts#L115)

Setup global error handlers.

#### Returns

`void`

***

### resetForTesting()

> `static` **resetForTesting**(): `void`

Defined in: [services/analytics/ErrorReporter.ts:130](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/analytics/ErrorReporter.ts#L130)

Reset for testing purposes.

#### Returns

`void`
