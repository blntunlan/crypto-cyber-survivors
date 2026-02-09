# Supabase Performance Guide

## Indexing Strategy
- **B-tree**: Standard for equality and range queries.
- **BRIN**: Best for large, ordered tables (like logs or time-series data). Migration 026 in this project already uses BRIN for performance.
- **GIN/GIST**: Use for JSONB search or full-text search.
- **Index Unused**: Identify and remove indexes that are never used to speed up writes.

## Query Optimization
- **Explain Analyze**: Use `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS)` to debug slow queries via `execute_sql`.
- **Select Specific Columns**: Discourage `SELECT *`.
- **Limit and Offset**: Use pagination for large datasets.

## Supabase Advisors
- **Security Advisor**: Check for missing RLS policies.
- **Performance Advisor**: Check for missing indexes or suboptimal queries.
- **Remediation**: Always provide the remediation URL from the `get_advisors` output.
