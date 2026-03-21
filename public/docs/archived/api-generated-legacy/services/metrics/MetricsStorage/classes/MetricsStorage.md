[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/metrics/MetricsStorage](../README.md) / MetricsStorage

# Class: MetricsStorage

Defined in: [services/metrics/MetricsStorage.ts:19](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsStorage.ts#L19)

## Constructors

### Constructor

> **new MetricsStorage**(`maxSessions`): `MetricsStorage`

Defined in: [services/metrics/MetricsStorage.ts:23](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsStorage.ts#L23)

#### Parameters

##### maxSessions

`number` = `100`

#### Returns

`MetricsStorage`

## Methods

### load()

> **load**(): `void`

Defined in: [services/metrics/MetricsStorage.ts:31](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsStorage.ts#L31)

Load sessions from localStorage

#### Returns

`void`

***

### addSession()

> **addSession**(`session`): `void`

Defined in: [services/metrics/MetricsStorage.ts:68](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsStorage.ts#L68)

Add a session and persist

#### Parameters

##### session

[`SessionMetrics`](../../../../types/metrics/interfaces/SessionMetrics.md)

#### Returns

`void`

***

### getSessions()

> **getSessions**(): [`SessionMetrics`](../../../../types/metrics/interfaces/SessionMetrics.md)[]

Defined in: [services/metrics/MetricsStorage.ts:212](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsStorage.ts#L212)

Get all stored sessions

#### Returns

[`SessionMetrics`](../../../../types/metrics/interfaces/SessionMetrics.md)[]

***

### getCount()

> **getCount**(): `number`

Defined in: [services/metrics/MetricsStorage.ts:219](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsStorage.ts#L219)

Get session count

#### Returns

`number`

***

### clear()

> **clear**(): `void`

Defined in: [services/metrics/MetricsStorage.ts:226](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsStorage.ts#L226)

Clear all sessions

#### Returns

`void`
