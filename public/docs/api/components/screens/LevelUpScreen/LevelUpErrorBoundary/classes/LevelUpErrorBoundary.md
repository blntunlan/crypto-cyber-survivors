[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../../modules.md) / [components/screens/LevelUpScreen/LevelUpErrorBoundary](../README.md) / LevelUpErrorBoundary

# Class: LevelUpErrorBoundary

Defined in: [components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx:9](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx#L9)

## Extends

- `Component`\<`ErrorBoundaryProps`, [`ErrorBoundaryState`](../../types/interfaces/ErrorBoundaryState.md)\>

## Constructors

### Constructor

> **new LevelUpErrorBoundary**(`props`): `LevelUpErrorBoundary`

Defined in: [components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx:10](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx#L10)

#### Parameters

##### props

`ErrorBoundaryProps`

#### Returns

`LevelUpErrorBoundary`

#### Overrides

`Component<ErrorBoundaryProps, ErrorBoundaryState>.constructor`

## Methods

### getDerivedStateFromError()

> `static` **getDerivedStateFromError**(`error`): `Partial`\<[`ErrorBoundaryState`](../../types/interfaces/ErrorBoundaryState.md)\>

Defined in: [components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx:15](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx#L15)

#### Parameters

##### error

`Error`

#### Returns

`Partial`\<[`ErrorBoundaryState`](../../types/interfaces/ErrorBoundaryState.md)\>

***

### componentDidCatch()

> **componentDidCatch**(`error`, `errorInfo`): `void`

Defined in: [components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx:19](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx#L19)

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

### render()

> **render**(): `string` \| `number` \| `bigint` \| `boolean` \| `Element` \| `Iterable`\<`ReactNode`, `any`, `any`\> \| `Promise`\<`AwaitedReactNode`\> \| `null` \| `undefined`

Defined in: [components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx:24](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/components/screens/LevelUpScreen/LevelUpErrorBoundary.tsx#L24)

#### Returns

`string` \| `number` \| `bigint` \| `boolean` \| `Element` \| `Iterable`\<`ReactNode`, `any`, `any`\> \| `Promise`\<`AwaitedReactNode`\> \| `null` \| `undefined`

#### Overrides

`Component.render`
