# Analysis: Enemy Clumping Issue

## 1. Current State
In the game, enemies tend to gather at a single point when they reach the target (Player) or follow the same route. This causes hundreds of enemies to sometimes appear as a single entity.

## 2. Root Cause Analysis
Based on code reviews, the reasons for this issue are:
*   **Independent Movement Logic (`strategies/EnemyBehaviors.ts`):** Each enemy moves based only on the player's coordinates. Since they do not check where other enemies are, they all try to go to the player via the shortest path (the same point).
*   **Missing Collision Resolution (`services/physics/CollisionSystem.ts`):** The current physics system calculates `Player-Enemy` and `Bullet-Enemy` interactions, but `Enemy-Enemy` pushing force or collision resolution is not implemented.
*   **Radius Violation:** The physics engine treats enemies as "points," whereas each has a `radius` value. These radii are not preserved during movement.

## 3. Negative Impacts
*   **Visual Quality:** The diversity of enemies and the feeling of a crowded horde are lost; the game feels like there is "one giant enemy."
*   **Game Balance:** Area of effect (AOE) weapons or bullets hit 50 clumped enemies at once, breaking the game's difficulty balance.
*   **Performance Illusion:** While the player think there are few enemies on screen, the update loop of hundreds of clumped enemies continues to strain the CPU.

## 4. Proposed Solutions

### A. Separation Steering Force - **[Best Solution]**
The *Separation* logic, part of the "Boids" algorithm, is applied. Each enemy looks at its nearby companions and applies a small force pushing them in slightly opposite directions.
*   **Implementation:** Done with O(N) complexity using the existing `SpatialGrid` (enemyGrid), checking only the closest enemies.
*   **Advantage:** Provides a very natural, organic, and fluid swarm movement. Does not cause jitter.

### B. Hard Collision Resolution
If two enemies enter each other's radius (overlap), they are mathematically pushed apart (`pos += normal * overlap`).
*   **Advantage:** Prevents overlapping 100% mathematically.
*   **Disadvantage:** May cause enemies to appear as if they are teleporting or vibrating in very crowded scenes (wall of enemies).

### C. Velocity Perturbation
A small "jitter" or different speed multipliers are added to the path to the player for each enemy type.
*   **Advantage:** Very low processing cost.
*   **Disadvantage:** Not a complete solution; enemies will eventually merge on the player again.

## 5. Technical Implementation Plan

Implementation of **Separation Steering** can be added to the system through the following steps:

1.  **MovementSystem Update:** A "Separation" step is added inside the `MovementSystem.updateEnemies` loop.
2.  **Grid Query:** Neighboring enemies are found for each enemy using `enemyGrid.forEachNearby`.
3.  **Pushing Vector Calculation:**
    ```typescript
    const dx = enemy.x - neighbor.x;
    const dy = enemy.y - neighbor.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const minDist = (enemy.radius + neighbor.radius);
    if (dist < minDist) {
        // Pushing force
        const force = (minDist - dist) / minDist;
        separationX += (dx / dist) * force;
        separationY += (dy / dist) * force;
    }
    ```
4.  **Applying Force:** This small "push" is added to the enemy's movement vector towards the main target.

---

// END OF PROTOCOL
