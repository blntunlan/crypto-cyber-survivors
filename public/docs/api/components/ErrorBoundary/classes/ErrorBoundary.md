[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../modules.md) / [components/ErrorBoundary](../README.md) / ErrorBoundary

# Class: ErrorBoundary

Defined in: [components/ErrorBoundary.tsx:22](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/ErrorBoundary.tsx#L22)

## Extends

- `Component`\<`Props`, `State`\>

## Constructors

### Constructor

> **new ErrorBoundary**(`props`): `ErrorBoundary`

Defined in: [components/ErrorBoundary.tsx:23](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/ErrorBoundary.tsx#L23)

#### Parameters

##### props

`Props`

#### Returns

`ErrorBoundary`

#### Overrides

`Component<Props, State>.constructor`

## Methods

### getDerivedStateFromError()

> `static` **getDerivedStateFromError**(`error`): `Partial`\<`State`\>

Defined in: [components/ErrorBoundary.tsx:32](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/ErrorBoundary.tsx#L32)

#### Parameters

##### error

`Error`

#### Returns

`Partial`\<`State`\>

***

### componentDidCatch()

> **componentDidCatch**(`error`, `errorInfo`): `void`

Defined in: [components/ErrorBoundary.tsx:36](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/ErrorBoundary.tsx#L36)

Catches exceptions generated in descendant components. Unhandled exceptions will cause
the entire component tree to unmount.

#### Parameters

##### error

`Error`

##### errorInfo

`ErrorInfo`

#### Returns

`void`

#### Overrides

`Component.componentDidCatch`

***

### handleRetry()

> **handleRetry**(): `void`

Defined in: [components/ErrorBoundary.tsx:46](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/ErrorBoundary.tsx#L46)

#### Returns

`void`

***

### render()

> **render**(): `ReactNode`

Defined in: [components/ErrorBoundary.tsx:54](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/ErrorBoundary.tsx#L54)

#### Returns

`ReactNode`

#### Overrides

`Component.render`
