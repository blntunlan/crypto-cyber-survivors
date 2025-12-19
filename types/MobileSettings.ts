/**
 * Mobile Control Settings Types
 * 
 * Defines the configuration options for mobile touch controls
 */

export type ControlType = 'joystick' | 'drag';
export type DashMethod = 'button' | 'secondTap' | 'hold';
export type JoystickPosition = 'left' | 'right';
export type JoystickSize = 'small' | 'medium' | 'large';

export interface MobileControlSettings {
    /** Control type: virtual joystick or drag-to-move */
    controlType: ControlType;

    /** Position of joystick (for joystick mode) */
    joystickPosition: JoystickPosition;

    /** Size of joystick: small=80px, medium=120px, large=160px */
    joystickSize: JoystickSize;

    /** How dash is triggered */
    dashMethod: DashMethod;

    /** Enable haptic feedback */
    hapticFeedback: boolean;

    /** Touch sensitivity multiplier (0.5 - 2.0) */
    sensitivity: number;

    /** Show visual feedback for drag-to-move */
    showDragFeedback: boolean;
}

/** Joystick size in pixels */
export const JOYSTICK_SIZES: Record<JoystickSize, number> = {
    small: 80,
    medium: 120,
    large: 160,
};

/** Default settings for mobile controls */
export const DEFAULT_MOBILE_SETTINGS: MobileControlSettings = {
    controlType: 'drag',          // Default: Drag-to-Move (modern)
    joystickPosition: 'left',
    joystickSize: 'medium',
    dashMethod: 'secondTap',      // Second finger tap = dash
    hapticFeedback: true,
    sensitivity: 1.0,
    showDragFeedback: true,
};

/** Movement vector from touch input */
export interface TouchMovement {
    /** X direction (-1 to 1) */
    dx: number;
    /** Y direction (-1 to 1) */
    dy: number;
    /** Speed multiplier (0 to 1) */
    speed: number;
    /** Is touch currently active */
    active: boolean;
}

/** Threshold values for drag-to-move (in pixels) */
export const DRAG_THRESHOLDS = {
    /** No movement below this distance */
    DEADZONE: 15,
    /** Walk speed starts here */
    WALK_START: 15,
    /** Run speed starts here */
    RUN_START: 50,
    /** Maximum distance considered */
    MAX_DISTANCE: 120,
} as const;
