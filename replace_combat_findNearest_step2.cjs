const fs = require('fs');

const path = 'services/combat/CombatSystem.ts';
let content = fs.readFileSync(path, 'utf8');

const search = `        if (useBounds) {
          const enemyRadius =
            enemy.radius || COMBAT_CONFIG.DEFAULT_ENEMY_RADIUS_FALLBACK;
          if (!isCircleVisible(enemy.x, enemy.y, enemyRadius, this._viewportBounds))
            return;
        }`;

const replace = `        if (useBounds) {
          const enemyRadius =
            enemy.radius || COMBAT_CONFIG.DEFAULT_ENEMY_RADIUS_FALLBACK;
          if (!isCircleVisible(enemy.x, enemy.y, enemyRadius, this._viewportBounds)) {
            return;
          }
        }`;

if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Replacement successful.");
} else {
    console.log("Could not find the target string.");
}
