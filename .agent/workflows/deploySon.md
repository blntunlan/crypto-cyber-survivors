---
description: deployFinal
---

# Workflow General Structure
[Start] → [Analysis] → [Testing] → [Fix] → [Validation] → [Git Operations] → [Deploy] → [Verification]

# Phase 1: Project Status Analysis
## 1.1 Dependency and Environment Check
- Check for the existence of required CLI tools (npm, git, railway, supabase)
- Verify Node.js version compatibility with `package.json`
- Ensure `.env` files exist and required variables are defined
- Check `node_modules` status; run `npm install` if necessary

## 1.2 Git Status Analysis
- Identify the current branch
- Detect uncommitted changes
- Verify remote repository connection
- Check for conflict status
- If changes exist, consider stashing them

## 1.3 Project Structure Review
- Determine if it's a monorepo or a single repository
- Detect usage of Turbo or similar build orchestrators
- Parse `package.json` scripts
- Identify the testing framework (Jest, Vitest, Mocha, etc.)

# Phase 2: Running Tests and Result Analysis
## 2.1 Identifying the Test Command
- Find the test script in `package.json`
- Use `turbo run test` if Turbo is present
- Otherwise, use `npm run test`
- Ensure watch mode is disabled (CI mode)

## 2.2 Test Execution
- Run all tests
- Capture output in a parsable format (use JSON reporter)
- Categorize test results:
  - Successful tests
  - Failed tests
  - Skipped tests
  - Timed-out tests

## 2.3 Test Result Analysis
- If all tests pass: Skip to Phase 3
- If tests fail:
  - Save the error message, stack trace, and related file for each failed test
  - Categorize error types (syntax, logic, assertion, dependency)
  - Determine priority (critical errors first)

# Phase 3: Automated Error Correction
## 3.1 Error Analysis and Strategy Formulation
For each failed test:
- Read the relevant source code
- Read the test file
- Semantically analyze the error message
- Determine a correction strategy:
  - **Syntax Error**: Direct fix
  - **Logic Error**: Analyze code, understand expected behavior
  - **Dependency Error**: Check mocks or imports
  - **Type Error**: Correct type definitions

## 3.2 Fix Implementation Process
Iterative loop for each fix:
- **WHILE (test fails):**
  1. Read the relevant file
  2. Identify the issue
  3. Apply minimal changes
  4. Re-run only that specific test
  5. Evaluate the result
  6. **IF** successful: Move to the next error
  7. **IF** failed and attempts < 3: Try a different approach
  8. **IF** not resolved in 3 attempts: Mark for manual review
- **END WHILE**

## 3.3 Fix Validation
- Run the relevant test after each fix
- Check for side effects (other tests breaking)
- Verify if fixes interact with each other

## 3.4 Comprehensive Re-testing
- Run the entire test suite after all fixes are applied
- If new errors emerge, identify them and return to Phase 3.1
- Repeat the cycle until all tests pass

# Phase 4: Lint and Code Quality Control
## 4.1 Running Lint
- Run `npm run lint` or `turbo run lint`
- Try auto-fix mode first: `npm run lint -- --fix`
- Categorize lint errors:
  - Auto-fixable errors
  - Errors requiring manual correction

## 4.2 Correcting Lint Errors
- Apply auto-fixes where possible
- For remaining errors:
  - Identify the file and line number for each error
  - Understand the lint rule
  - Adjust the code according to the rule
  - Re-run lint

## 4.3 Format Check
- Run Prettier or a similar formatter if present
- Ensure all files are properly formatted

# Phase 5: Build Verification
## 5.1 Production Build
- Run `npm run build` or `turbo run build`
- Capture build output
- Record build duration

## 5.2 Build Result Analysis
- **Successful build:**
  - Verify the existence of output files
  - Check bundle sizes (warn if there is an unexpected increase)
  - Proceed to Phase 6
- **Failed build:**
  - Parse error messages
  - Identify TypeScript errors
  - Detect missing dependency errors
  - Identify build config issues
  - Fix errors and repeat build

## 5.3 Build Artifact Validation
- Verify that required files are generated (`dist/`, `build/`, `.next/`, etc.)
- Check for existence of entry points
- Verify if source maps are generated

# Phase 6: Git Operations
## 6.1 Grouping Changes
- List all changed files
- Categorize changes:
  - Test fixes
  - Lint corrections
  - Build fixes
  - Dependency updates

## 6.2 Creating Commit Messages
Use the semantic commit convention:
- `fix(tests): [test-count] failing test fixed`
  - `[test-1-description]`
  - `[test-2-description]`
- `fix(lint): resolve [lint-error-count] linting issues`
  - `[lint-category]`
- `build: ensure production build succeeds`
  - `[build-related-fixes]`

## 6.3 Commit Strategy
- **Option A - Single Commit**: Combine all changes into one commit
- **Option B - Categorical Commits**: Separate commit for each category
- **Option C - Atomic Commits**: Separate commit for each fix
- Choose based on project size and amount of changes.

## 6.4 Git Commit Execution
- **FOR each commit:**
  1. `git add [relevant-files]`
  2. `git commit -m "[commit-message]"`
  3. Record commit hash
  4. Check `.gitignore` if errors occur
- **END FOR**

## 6.5 Remote Check
- Check the status of the remote branch: `git fetch origin`
- Determine the diff between local and remote
- **If remote is ahead:**
  - Choose `git pull --rebase` or a merge strategy
  - Apply resolution strategy if conflicts occur

## 6.6 Git Push
- Run `git push origin [branch-name]`
- Check if push is successful
- If rejected, apply rebase/merge strategy
- Evaluate carefully if a force push is required (check protected branches)

# Phase 7: Deployment Preparation
## 7.1 Railway CLI Status
- Check if Railway CLI is installed and authenticated: `railway whoami`
- Verify project linking: `railway status`
- If connection is missing: Run `railway link` and select project
- Check environment (production/staging)

## 7.2 Supabase Migration Check
- Check for new migrations in the `supabase/migrations` folder
- **If exists:**
  - List migration files
  - Verify syntax for each migration
  - Check Supabase CLI status: `supabase status`

## 7.3 Environment Variables Validation
- List Railway environment variables
- Ensure all required variables are defined
- Verify Supabase URL and API keys are up to date
- Warn if any missing variables need manual setting

# Phase 8: Deployment Execution
## 8.1 Database Migration (Prior)
If new migrations exist:
- **FOR each new migration:**
  1. Preview migration: `supabase db diff`
  2. Dry-run test (if possible)
  3. Push to production: `supabase db push`
  4. Record migration result
  5. Prepare rollback plan if errors occur
- **END FOR**

## 8.2 Edge Functions Deploy (If Needed)
If edge function changes exist:
- **FOR each changed function:**
  1. Validate function code
  2. Check dependencies
  3. Deploy: `supabase functions deploy [function-name]`
  4. Record deploy logs
  5. Test function endpoint
- **END FOR**

## 8.3 Railway Deploy
1. Start deployment: `railway up` or automatic deploy (via git push)
2. Monitor deploy logs in real-time
3. Follow build phase:
   - Dependencies installation
   - Build process
   - Dockerfile execution (if any)
4. Check deploy status: `railway status`
5. Record Deployment ID and URL

## 8.4 Deploy Progress Monitoring
- **WHILE (deployment is ongoing):**
  1. Check status every 10 seconds
  2. Parse log output
  3. Look for error patterns
  4. **IF** error detected:
     - Categorize error
     - Evaluate if rollback is necessary
  5. **IF** timeout (e.g., 10 minutes) exceeded:
     - Cancel deployment
     - Report error
  6. **IF** success message arrives: Exit loop
- **END WHILE**

# Phase 9: Post-Deployment Validation
## 9.1 Fetching Deployment URL
- Get production URL from Railway: `railway domain`
- Verify URL resolves correctly (DNS check)
- Validate HTTPS certificate validity

## 9.2 Health Check
1. Request root endpoint: `GET [production-url]/`
2. Check response status code (200 expected)
3. Measure response time (for baseline)
4. Validate response content

## 9.3 Smoke Tests
Test critical endpoints:
- **FOR each critical endpoint:**
  1. Send HTTP request
  2. Check status code
  3. Validate response body
  4. Record response time
  5. **IF** test fails:
     - Log failure
     - Decide on rollback
- **END FOR**

**Example critical endpoints:**
- `/api/health`
- `/api/market` (market connection)
- `/api/leaderboard` (leaderboard functionality)
- Authentication flow (login/logout)

## 9.4 Database Connectivity
- Test Supabase connection
- Run a simple query (e.g., `SELECT 1`)
- Verify connection pool functionality

## 9.5 External Service Integration
For each external service:
1. Check API key validity
2. Send test request
3. Check rate limit status
4. Validate response

# Phase 10: Monitoring and Rollback Plan
## 10.1 Initial 5-Minute Monitoring
- **FOR 5 minutes:**
  Every 30 seconds:
  1. Read application logs: `railway logs`
  2. Search for error patterns:
     - Runtime errors
     - Database connection errors
     - API failures
     - Memory leaks
     - Unhandled exceptions
  3. Monitor response times
  4. **IF** critical error detected: Start rollback
- **END FOR**

## 10.2 Creating Metric Baseline
In the first 5 minutes:
- Record:
  - Average response time
  - Error rate
  - Request count
  - Memory usage
  - CPU usage
- (For comparison in future deployments)

## 10.3 Rollback Procedure
If critical issue detected:
1. Stop deployment
2. Revert to previous deployment on Railway: `railway rollback [previous-deployment-id]`
3. If database migration rollback required:
   - Apply rollback migration
   - Check data integrity
4. Wait for DNS/cache flush if necessary
5. Run smoke tests after rollback
6. Prepare post-mortem report:
   - What went wrong
   - Why it wasn't detected
   - How to prevent it

## 10.4 Success Notification
If all validations succeed:
1. Create deployment summary:
   - Commit hash
   - Deployment URL
   - Deployment time
   - Test results
   - Number of bugs fixed
2. Save logs
3. Generate success message

# Phase 11: Workflow Documentation
## 11.1 Creating Execution Log
For each stage:
- Start time
- End time
- Status (success/failure)
- Output/Error messages
- Changes made

## 11.2 Summary Report
```text
DEPLOYMENT REPORT
=================
Date: [timestamp]
Branch: [branch-name]
Commit: [commit-hash]

Pre-Deployment:
- Tests Fixed: [count]
- Lint Issues Resolved: [count]
- Build Status: [success/failure]

Git Operations:
- Commits: [count]
- Files Changed: [count]
- Push Status: [success]

Deployment:
- Migrations Applied: [count]
- Edge Functions Deployed: [count]
- Railway Status: [success]
- Deployment URL: [url]

Post-Deployment:
- Health Check: [pass]
- Smoke Tests: [x/y passed]
- Monitoring: [no critical issues]

Total Time: [duration]
```

# Error Handling and Retry Strategy
## Global Error Handler
For each phase:
- **TRY:**
  - [Phase operations]
- **CATCH error:**
  1. Identify error type
  2. **IF** retryable (network, timeout):
     - If retry counter < 3:
       - Apply exponential backoff (wait 2^n seconds)
       - Repeat operation
     - Else: Fatal error, stop workflow
  3. **IF** non-retryable (syntax, logic):
     - Log error
     - Report manual intervention required
     - Stop workflow
  4. Start automatic rollback if required
- **END TRY**

# Improvement and Learning
## 11.3 Workflow Optimization
After each successful workflow:
- Identify most time-consuming stages
- Search for patterns in failed fix attempts
- Create cache for future runs:
  - Frequent error types and solutions
  - Test failure patterns
  - Common fix strategies

## 11.4 Feedback Loop
- Post-mortem for failed workflows
- Track success rate
- Record insights for Agent learning