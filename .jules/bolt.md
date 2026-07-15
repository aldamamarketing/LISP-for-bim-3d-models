## 2024-07-15 - [LispCommandPalette Memoization & String Allocation]
**Learning:** React components running in AutoCAD's embedded browser control (like `LispCommandPalette`) are highly sensitive to O(N*M) string allocations (e.g., calling `.toLowerCase()` inside nested `.filter()` and `.some()` iterations during renders).
**Action:** Always extract static string transformations outside of closures in performance-critical palettes and wrap derived grouping/filtering logic in `useMemo` to prevent UI thread blocking in the constrained AutoCAD environment.
