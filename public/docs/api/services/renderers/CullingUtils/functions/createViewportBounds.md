[**Crypto Cyber Survivors API Documentation v1.0.0**](../../../../README.md)

***

[Crypto Cyber Survivors API Documentation](../../../../modules.md) / [services/renderers/CullingUtils](../README.md) / createViewportBounds

# Function: createViewportBounds()

> **createViewportBounds**(`width`, `height`, `padding`): [`ViewportBounds`](../interfaces/ViewportBounds.md)

Defined in: [services/renderers/CullingUtils.ts:23](https://github.com/blntunlan/crypto-cyber-survivors/blob/8ef40473c7e108892df692695bac752633d4aed4/services/renderers/CullingUtils.ts#L23)

Create viewport bounds with optional padding for offscreen margin
Objects within the padding area are still rendered to prevent pop-in

## Parameters

### width

`number`

### height

`number`

### padding

`number` = `50`

## Returns

[`ViewportBounds`](../interfaces/ViewportBounds.md)
