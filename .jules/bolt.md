## 2024-05-18 - [LispCommandPalette string allocation optimization]
**Learning:** Found an `O(N*M)` performance bottleneck in `LispCommandPalette.jsx` specific to AutoCAD embedded web palettes which execute javascript slower. The `.toLowerCase()` operation was happening for every search tag on every command filter cycle.
**Action:** Always pre-compute and hoist expensive string operations like `.toLowerCase()` outside of inner filtering loops, and wrap derived filtering and grouping logic in `useMemo` hooks to minimize execution time on renders.
