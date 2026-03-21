[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/auth/UserSessionService](../README.md) / UserSessionService

# Class: UserSessionService

Defined in: [services/auth/UserSessionService.ts:14](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L14)

## Constructors

### Constructor

> **new UserSessionService**(): `UserSessionService`

#### Returns

`UserSessionService`

## Methods

### hasStoredUser()

> `static` **hasStoredUser**(): `boolean`

Defined in: [services/auth/UserSessionService.ts:20](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L20)

Check if a user is already stored in localStorage.

#### Returns

`boolean`

***

### getStoredUser()

> `static` **getStoredUser**(): [`StoredUser`](../../types/interfaces/StoredUser.md) \| `null`

Defined in: [services/auth/UserSessionService.ts:27](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L27)

Get the stored user data from localStorage.

#### Returns

[`StoredUser`](../../types/interfaces/StoredUser.md) \| `null`

***

### getPlayerId()

> `static` **getPlayerId**(): `string`

Defined in: [services/auth/UserSessionService.ts:47](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L47)

Get the player ID for metrics tracking.
If no user is stored, returns a temporary anonymous ID.

#### Returns

`string`

***

### getNickname()

> `static` **getNickname**(): `string` \| `null`

Defined in: [services/auth/UserSessionService.ts:58](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L58)

Get the player's nickname.

#### Returns

`string` \| `null`

***

### saveUser()

> `static` **saveUser**(`playerId`, `nickname`): `void`

Defined in: [services/auth/UserSessionService.ts:66](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L66)

Save a new user to storage after successful registration/login.

#### Parameters

##### playerId

`string`

##### nickname

`string`

#### Returns

`void`

***

### registerNickname()

> `static` **registerNickname**(`nickname`): `Promise`\<\{ `success`: `boolean`; `error?`: `string`; \}\>

Defined in: [services/auth/UserSessionService.ts:87](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L87)

Register a new nickname in Supabase and save to local storage.

#### Parameters

##### nickname

`string`

#### Returns

`Promise`\<\{ `success`: `boolean`; `error?`: `string`; \}\>

***

### updateLastSeen()

> `static` **updateLastSeen**(): `Promise`\<`void`\>

Defined in: [services/auth/UserSessionService.ts:153](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L153)

Update the last seen timestamp in storage and optionally Supabase.

#### Returns

`Promise`\<`void`\>

***

### clearUser()

> `static` **clearUser**(): `void`

Defined in: [services/auth/UserSessionService.ts:185](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L185)

Clear user data from storage (logout/debug).

#### Returns

`void`

***

### resetForTesting()

> `static` **resetForTesting**(): `void`

Defined in: [services/auth/UserSessionService.ts:194](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/UserSessionService.ts#L194)

Reset for testing purposes.

#### Returns

`void`
