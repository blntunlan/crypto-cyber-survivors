const fs = require('fs');
const r = JSON.parse(fs.readFileSync('lint_report.json', 'utf8'));
r.filter(f => f.errorCount > 0).forEach(f => {
  console.log('\n' + f.filePath);
  f.messages.filter(m => m.severity === 2).forEach(m => console.log(`  Line ${m.line}:${m.column} - ${m.message} [${m.ruleId}]`));
});
