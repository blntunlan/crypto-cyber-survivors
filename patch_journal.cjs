const fs = require('fs');
const file = '.jules/bolt.md';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/## \d{4}-\d{2}-\d{2} - Hybrid Clearing Strategy for SpatialGrid\n\*\*Learning:\*\* To reduce GC pressure and iteration overhead in SpatialGrid, use a hybrid clearing strategy: reuse arrays for active cells \(`\.length = 0`\), and for empty cells \(`\.length === 0` from the previous frame\) push them back to an array pool and delete their keys \(`map.delete\(key\)`\). This prevents unbounded map growth while maintaining fast iteration.\n\*\*Action:\*\* Apply this hybrid clearing strategy to SpatialGrid.clear\(\).\n/, '');
fs.writeFileSync(file, code);
