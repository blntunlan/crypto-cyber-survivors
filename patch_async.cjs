const fs = require('fs');

let code = fs.readFileSync('railway-market-aggregator/src/utils/asyncHandler.ts', 'utf8');

code = code.replace(
  'Promise.resolve(fn(req, res, next)).catch(next);',
  'void Promise.resolve(fn(req, res, next)).catch(next);'
);

fs.writeFileSync('railway-market-aggregator/src/utils/asyncHandler.ts', code);
