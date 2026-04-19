const fs = require('fs');
let code = fs.readFileSync('tests/integration/GameStartFlow.test.tsx', 'utf8');
code = code.replace(
  /it\('transitions to gameplay when Long button is clicked', async \(\) => \{/,
  "it('transitions to gameplay when Long button is clicked', async () => {"
);
// Wait, I need to add the timeout at the end of the test.
// Let's just sed the end.
