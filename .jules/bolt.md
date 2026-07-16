## 2024-07-16 - [LispCommandPalette Memoization]
**Learning:** React components running in AutoCAD's embedded browser control (HTML5 web palettes) execute JS significantly slower. Inline O(N*M) string transformations inside render cycles cause severe UI lag.
**Action:** Always wrap derived filtering and grouping state in useMemo, and hoist expensive string operations outside of filter callbacks.
