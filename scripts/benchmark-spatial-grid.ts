/**
 * Benchmark: String Keys vs Number Keys in SpatialGrid
 *
 * Run with: npx ts-node scripts/benchmark-spatial-grid.ts
 */

const ITERATIONS = 100000;
const CELL_SIZE = 150;

// Simulate entity positions
function generatePositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
    });
  }
  return positions;
}

// String key approach (current implementation)
function getStringKey(x: number, y: number): string {
  const cellX = Math.floor(x / CELL_SIZE);
  const cellY = Math.floor(y / CELL_SIZE);
  return `${cellX},${cellY}`;
}

// Number key approach (optimized)
function getNumericKey(x: number, y: number): number {
  const cellX = Math.floor(x / CELL_SIZE) + 32768;
  const cellY = Math.floor(y / CELL_SIZE) + 32768;
  return (cellX << 16) | cellY;
}

// Benchmark string keys
function benchmarkStringKeys(positions: Array<{ x: number; y: number }>): number {
  const map = new Map<string, number[]>();
  const start = performance.now();

  for (let i = 0; i < ITERATIONS; i++) {
    map.clear();

    // Insert phase
    for (const pos of positions) {
      const key = getStringKey(pos.x, pos.y);
      const cell = map.get(key);
      if (cell) {
        cell.push(i);
      } else {
        map.set(key, [i]);
      }
    }

    // Lookup phase (simulate getNearby)
    for (const pos of positions.slice(0, 50)) {
      const cellX = Math.floor(pos.x / CELL_SIZE);
      const cellY = Math.floor(pos.y / CELL_SIZE);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${cellX + dx},${cellY + dy}`;
          map.get(key);
        }
      }
    }
  }

  return performance.now() - start;
}

// Benchmark number keys
function benchmarkNumericKeys(positions: Array<{ x: number; y: number }>): number {
  const map = new Map<number, number[]>();
  const start = performance.now();

  for (let i = 0; i < ITERATIONS; i++) {
    map.clear();

    // Insert phase
    for (const pos of positions) {
      const key = getNumericKey(pos.x, pos.y);
      const cell = map.get(key);
      if (cell) {
        cell.push(i);
      } else {
        map.set(key, [i]);
      }
    }

    // Lookup phase (simulate getNearby)
    for (const pos of positions.slice(0, 50)) {
      const cellX = Math.floor(pos.x / CELL_SIZE) + 32768;
      const cellY = Math.floor(pos.y / CELL_SIZE) + 32768;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = ((cellX + dx) << 16) | (cellY + dy);
          map.get(key);
        }
      }
    }
  }

  return performance.now() - start;
}

// Run benchmarks
console.log('🔬 SpatialGrid Key Type Benchmark');
console.log('='.repeat(50));
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`Cell Size: ${CELL_SIZE}px`);
console.log('');

const positions = generatePositions(200); // Simulate 200 entities
console.log(`Entities per frame: ${positions.length}`);
console.log('');

// Warmup
benchmarkStringKeys(positions.slice(0, 10));
benchmarkNumericKeys(positions.slice(0, 10));

// Actual benchmark
console.log('Running string key benchmark...');
const stringTime = benchmarkStringKeys(positions);

console.log('Running numeric key benchmark...');
const numericTime = benchmarkNumericKeys(positions);

console.log('');
console.log('📊 Results:');
console.log('-'.repeat(50));
console.log(`String Keys: ${stringTime.toFixed(2)}ms`);
console.log(`Number Keys: ${numericTime.toFixed(2)}ms`);
console.log('');
console.log(`⚡ Speedup: ${(stringTime / numericTime).toFixed(2)}x faster`);
console.log(`💾 Reduction: ${((1 - numericTime / stringTime) * 100).toFixed(1)}% less time`);
console.log('');
console.log('Note: Number keys also eliminate string GC pressure,');
console.log('which is not fully captured in this micro-benchmark.');
