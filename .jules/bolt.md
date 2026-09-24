## 2026-09-24 - Cross-platform package-lock regeneration
**Learning:** CI builds on different OSes will fail if optional native binaries (like esbuild variations) are stripped from the package-lock.json. Running `npm install` cleanly on sub-projects like `railway-market-server` and `railway-market-aggregator` ensures that cross-platform optional dependencies correctly populate the lockfile so it is robust for GitHub Actions.
**Action:** Always rebuild sub-project package-lock files with a clean `npm install` if CI fails with "Missing [binary] from lock file".
