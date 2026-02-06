const fs = require('fs');
const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
const failures = results.testResults.filter(r => r.status === 'failed');
console.log('Failed Test Files:');
failures.forEach(f => {
    console.log(`- ${f.name}`);
    f.assertionResults.filter(a => a.status === 'failed').forEach(a => {
        console.log(`  * ${a.fullName}: ${a.failureMessages.join('\n')}`);
    });
});
