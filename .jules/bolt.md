## 2024-07-10 - LispCommandPalette String Allocation Optimization
**Learning:** React components rendered in AutoCAD's embedded browser control (HTML5 web palettes) execute JS slower than modern browsers, making string allocations in closures during filter/sort especially costly and blocking the main thread.
**Action:** Extract expensive string transformations (like `.toLowerCase()`) outside of `.filter()`/`.some()` loops and use `useMemo` for derived states to prevent O(N*M) performance degradation.
