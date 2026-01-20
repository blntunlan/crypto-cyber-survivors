/* global console, process */
import fs from 'fs';

try {
  const data = fs.readFileSync('test-results.json', 'utf8');
  const results = JSON.parse(data);

  if (!results.testResults) {
    console.log("No test results found.");
    process.exit(1);
  }

  const failedTests = [];

  results.testResults.forEach(file => {
    file.assertionResults.forEach(test => {
      if (test.status === 'failed') {
        failedTests.push({
          file: file.name,
          title: test.title,
          fullName: test.fullName,
          failureMessages: test.failureMessages
        });
      }
    });
  });

  const output = failedTests.map((t, i) => {
    return `\n--- Usage ${i + 1} ---
File: ${t.file}
Test: ${t.fullName}
Error: ${t.failureMessages.join('\n')}`;
  }).join('\n');

  console.log(`Total Failed Tests: ${failedTests.length}`);
  fs.writeFileSync('parsed_errors_utf8.txt', output, 'utf8');


} catch (err) {
  console.error("Error parsing JSON:", err);
}
