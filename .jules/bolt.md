## 2026-07-03 - Expensive String Allocations in Embedded Browser
**Learning:** The embedded AutoCAD browser control executes JS slower than modern browsers. Deriving state in render loops without memoization and running string transformations like `.toLowerCase()` inside nested closures (`.filter()` + `.some()`) causes O(N*M) string allocations that degrade UI responsiveness.
**Action:** Always wrap derived filtered arrays in `useMemo` and precompute transformations like `.toLowerCase()` outside of inner loops to minimize string allocations.
