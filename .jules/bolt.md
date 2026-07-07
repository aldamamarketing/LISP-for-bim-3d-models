## 2024-05-19 - [Initialization]
**Learning:** Initializing journal.
**Action:** Ready for optimizations.

## 2024-05-19 - [useMemo and string allocations]
**Learning:** O(N*M) string allocations within closures in React can cause severe performance issues when filtering data, particularly for large arrays.
**Action:** Always extract string conversions, like `.toLowerCase()`, outside of iterative closures (`filter`, `some`, etc.) and memoize derived calculations with `useMemo`.
