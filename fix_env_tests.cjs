const fs = require('fs');

let testCode = fs.readFileSync('tests/integration/GameStartFlow.test.tsx', 'utf8');

// Also stub window.requestAnimationFrame
if (!testCode.includes('requestAnimationFrame = vi.fn()')) {
  testCode = testCode.replace(
    "describe('Game Entry Flow', () => {",
    "describe('Game Entry Flow', () => {\n  beforeAll(() => { window.requestAnimationFrame = vi.fn(); window.cancelAnimationFrame = vi.fn(); });"
  );
  fs.writeFileSync('tests/integration/GameStartFlow.test.tsx', testCode);
}
