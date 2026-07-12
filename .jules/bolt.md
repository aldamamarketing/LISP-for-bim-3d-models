
## 2026-07-12 - AutoCAD HTML5 Palette Performance Constraint
**Learning:** The HTML5 web palettes (like `LispCommandPalette`) run inside AutoCAD's embedded browser control, which has much slower JavaScript execution compared to modern desktop browsers. String manipulations inside loops (like `toLowerCase` in `.some()` or `.filter()`) and unmemoized arrays cause severe UI lag and dropped frames, particularly during list filtering or toggling.
**Action:** Always wrap heavy list filtering/sorting in `useMemo` and meticulously extract O(N*M) string allocations (like `.toLowerCase()`) out of inner closures to preserve UI responsiveness in the AutoCAD web view.
