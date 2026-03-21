[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/renderers/CullingUtils](../README.md) / isCircleVisible

# Function: isCircleVisible()

> **isCircleVisible**(`x`, `y`, `radius`, `bounds`): `boolean`

Defined in: [services/renderers/CullingUtils.ts:40](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/renderers/CullingUtils.ts#L40)

Check if a circular object is visible within the viewport
Uses AABB (Axis-Aligned Bounding Box) check for performance

## Parameters

### x

`number`

### y

`number`

### radius

`number`

### bounds

[`ViewportBounds`](../interfaces/ViewportBounds.md)

## Returns

`boolean`
