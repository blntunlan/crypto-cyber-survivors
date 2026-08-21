export const ComponentMask = {
  Transform: 1 << 0,
  Velocity: 1 << 1,
  Body: 1 << 2,
  Health: 1 << 3,
  Faction: 1 << 4,
  Player: 1 << 5,
  Enemy: 1 << 6,
  Projectile: 1 << 7,
  XpPickup: 1 << 8,
} as const;

export const ALL_COMPONENT_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Faction |
  ComponentMask.Player |
  ComponentMask.Enemy |
  ComponentMask.Projectile |
  ComponentMask.XpPickup;
