# GC-Free Performance Patterns

## ❌ Bad (Allocates Memory in Loop)
```typescript
const update = () => {
  const enemies = this.getEnemies();
  const nearby = enemies.filter(e => e.dist < 100); // filter creates new array
  nearby.forEach(e => {
    const pos = { x: e.x, y: e.y }; // new object every frame
    // String concatenation creates new strings
    Logger.info("Enemy at " + pos.x); 
  });
}
```

## ✅ Good (Zero Allocation)
```typescript
private readonly _posCache = { x: 0, y: 0 };

const update = () => {
  const enemies = this.getEnemies();
  // Use for-loop instead of forEach/map/filter
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.dist < 100) {
      this._posCache.x = e.x;
      this._posCache.y = e.y;
      // Use PoolManager for new entities
      // Use Logger with templates or avoid strings in hot path
    }
  }
}
```

## PoolManager Mandatory Usage
NEVER use `new Bullet()` or `new Enemy()`.
```typescript
// Spawning
const bullet = PoolManager.getInstance().spawn(Bullet, x, y, config);

// Despawning (Returning to pool)
PoolManager.getInstance().despawn(bullet);
```

## SpatialGrid Registration
Ensure any new moving entity type implements `ISpatialEntity` and is registered:
```typescript
SpatialGrid.getInstance().register(entity);
// In update:
SpatialGrid.getInstance().update(entity);
```
