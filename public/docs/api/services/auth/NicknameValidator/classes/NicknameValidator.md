[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/auth/NicknameValidator](../README.md) / NicknameValidator

# Class: NicknameValidator

Defined in: [services/auth/NicknameValidator.ts:9](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/NicknameValidator.ts#L9)

NicknameValidator - Validates player nicknames for the beta system.

Rules:
- 3 to 16 characters long.
- Only alphanumeric characters and underscores allowed.

## Constructors

### Constructor

> **new NicknameValidator**(): `NicknameValidator`

#### Returns

`NicknameValidator`

## Methods

### validate()

> `static` **validate**(`nickname`): `string` \| `null`

Defined in: [services/auth/NicknameValidator.ts:19](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/NicknameValidator.ts#L19)

Validates a nickname.

#### Parameters

##### nickname

`string`

The nickname to validate.

#### Returns

`string` \| `null`

An error message if invalid, or null if valid.

***

### isValid()

> `static` **isValid**(`nickname`): `boolean`

Defined in: [services/auth/NicknameValidator.ts:44](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/auth/NicknameValidator.ts#L44)

Checks if a nickname matches the format rules without returning a message.

#### Parameters

##### nickname

`string`

#### Returns

`boolean`
