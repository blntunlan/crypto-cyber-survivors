const fs = require('fs');
const file = 'railway-market-aggregator/src/utils/asyncHandler.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };`,
`  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };`
);

fs.writeFileSync(file, code);
