[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/metrics/MetricsExporter](../README.md) / MetricsExporter

# Class: MetricsExporter

Defined in: [services/metrics/MetricsExporter.ts:11](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsExporter.ts#L11)

## Constructors

### Constructor

> **new MetricsExporter**(): `MetricsExporter`

#### Returns

`MetricsExporter`

## Methods

### toJSON()

> `static` **toJSON**(`sessions`): `string`

Defined in: [services/metrics/MetricsExporter.ts:15](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsExporter.ts#L15)

Export sessions as JSON string

#### Parameters

##### sessions

[`SessionMetrics`](../../../../types/metrics/interfaces/SessionMetrics.md)[]

#### Returns

`string`

***

### toCSV()

> `static` **toCSV**(`sessions`): `string`

Defined in: [services/metrics/MetricsExporter.ts:28](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsExporter.ts#L28)

Export sessions as CSV string (summary format)

#### Parameters

##### sessions

[`SessionMetrics`](../../../../types/metrics/interfaces/SessionMetrics.md)[]

#### Returns

`string`

***

### downloadJSON()

> `static` **downloadJSON**(`sessions`, `filename`): `void`

Defined in: [services/metrics/MetricsExporter.ts:67](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsExporter.ts#L67)

Download JSON file in browser

#### Parameters

##### sessions

[`SessionMetrics`](../../../../types/metrics/interfaces/SessionMetrics.md)[]

##### filename

`string` = `'game_metrics.json'`

#### Returns

`void`

***

### downloadCSV()

> `static` **downloadCSV**(`sessions`, `filename`): `void`

Defined in: [services/metrics/MetricsExporter.ts:75](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/metrics/MetricsExporter.ts#L75)

Download CSV file in browser

#### Parameters

##### sessions

[`SessionMetrics`](../../../../types/metrics/interfaces/SessionMetrics.md)[]

##### filename

`string` = `'game_metrics.csv'`

#### Returns

`void`
