## 2024-05-18 - Prevent O(N*M) string allocations in nested React loops
**Learning:** Found an O(N*M) performance anti-pattern where a string transformation like `.toLowerCase()` is performed inside an inner `.some()` loop that runs inside an outer `.filter()` loop, calculating derived state on every render in components with many items, such as `LispCommandPalette.jsx`.
**Action:** Always extract static transformations (like lowercasing active filter items) out of filtering loops and memoize derived object arrays using `useMemo` so calculations only run when dependencies change.
