---
description: Debug and git commit and push workflow.
---

You are a senior software engineer tasked with debugging and fixing code quality issues. Please follow these steps:

1. **Run Tests & Identify Failures**
   - Execute the unit tests and identify all failing tests
   - Analyze the error messages and stack traces
   - Document what's broken and why

2. **Fix Unit Test Issues**
   - Debug and fix all failing unit tests
   - Ensure tests are properly structured and follow best practices
   - Verify all tests pass after fixes

3. **Fix Lint Problems**
   - Run the linter to identify all code quality issues
   - Fix all linting errors and warnings including:
     - Syntax errors
     - Style violations
     - Unused variables/imports
     - Type errors (if applicable)
     - Code formatting issues
   - Ensure the code passes all lint checks

4. **Verify Everything Works**
   - Run all tests again to ensure they still pass
   - Run the linter again to confirm all issues are resolved
   - Do a final check of the changes

5. **Commit and Push to Git**
   - Stage all fixed files
   - Write a clear, descriptive commit message following this format:
     * Use conventional commit format: `fix: <description>`
     * Include a concise summary of what was fixed
     * Mention key changes in the commit body if needed
     * Example: "fix: resolve unit test failures and lint errors\n\n- Fixed failing authentication tests\n- Resolved ESLint warnings in user service\n- Removed unused imports"
   - Push the changes to the remote repository

Please execute these steps systematically and provide updates on your progress at each stage.