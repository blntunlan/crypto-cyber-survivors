const fs = require('fs');
const path = require('fs'); // wait, meant 'path'
const pathMod = require('path');

const report = fs.readFileSync('missing_report.txt', 'utf8');
const lines = report.split('\n');
const keys = new Set();

lines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('--- Language:')) {
    keys.add(trimmed);
  }
});

fs.writeFileSync('unique_missing_keys.txt', Array.from(keys).join('\n'));
console.log(`Extracted ${keys.size} unique missing keys.`);
