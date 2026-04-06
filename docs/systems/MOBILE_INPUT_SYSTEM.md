# :Smartphone: Mobile Input System

> **Status** live

> Owner: UI/UX Engineering

## Overview

Crypto Survivors relies heavily on twitch-based movement and dodging. Providing a seamless, lag-free input layer for mobile devices is critical to the game's success. 

The Mobile Input System handles touch events over the HTML5 Canvas, converting raw touch coordinates into normalized directional vectors for the `GameEngine`, while providing visual and haptic feedback.

## Architecture

The mobile controls are structured as an overlay layer on top of the main game canvas. The entry point is `MobileControls.tsx`.

**Dual Control Schemes**

The system supports two distinct control schemes, configurable via `MobileControlSettings`:

1. **Virtual Joystick (`VirtualJoystick.tsx`)**: The classic "Twin-Stick" approach (though firing is auto). Renders a fixed or dynamic joystick in the corner of the screen. Includes configurable deadzones and sensitivity.
2. **Drag-to-Move (`DragToMoveController.tsx`)**: A modern "floating" control scheme. The player can touch anywhere on the screen and drag to move relative to their initial touch point.

**Normalization & Deadzones**

To ensure consistent movement speed across all devices (phones vs tablets), raw pixel distances are normalized into a `[-1, 1]` vector format (`dx`, `dy`) using `Math.hypot`. 

The system implements a **Deadzone** (default 15%) to prevent micro-jitters when the player's thumb is resting on the screen.

```typescript
// Distance normalization from VirtualJoystick.tsx
const distance = Math.hypot(dx, dy);
const normalizedDistance = Math.min(distance / maxDistance, 1);

if (normalizedDistance < deadzone) {
  return { dx: 0, dy: 0 };
}
```

**UI Scaling (`useResponsiveUI`)**

Because the game runs on varying aspect ratios and pixel densities, hardcoding pixel values for the joystick size would result in a massive joystick on phones and a tiny one on tablets.

The `useResponsiveUI` hook calculates a dynamic `scale` factor based on the window's dimensions relative to a base reference resolution. The mobile controls multiply their base size (e.g., `JOYSTICK_SIZES.medium`) by this `scale` factor to ensure perfect ergonomics on any device.

**Haptic Feedback**

To provide physical weight to actions like Dashing or hitting the edge of the joystick, the system utilizes the browser's `navigator.vibrate()` API. This is safely wrapped to prevent errors on unsupported browsers (e.g., iOS Safari).

```typescript
// Haptic trigger on touch start
if (hapticFeedback) navigator.vibrate?.(10);
```

## Integration with Game Engine

The `MobileControls` component accepts an `onMove(dx, dy)` callback. These vectors are passed up to `GameEngine.tsx`, which forwards them to the player's `InputHandler` or directly into the `useGameStore` state, where the `PhysicsSystem` applies the velocity on the next tick.
