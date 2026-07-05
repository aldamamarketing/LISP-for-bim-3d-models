## 2024-07-05 - Optimize LispCommandPalette Filtering

**Learning:** When React components are rendered inside the HTML5 web palette of AutoCAD's embedded browser control, they often execute JavaScript significantly slower than in modern desktop browsers. Heavy filtering logic, like doing expensive string manipulations (e.g. `toLowerCase()`) within `filter` closures and `.some()` calls, along with sorting arrays at render-time, degrades UI responsiveness dramatically. This is exacerbated when working with hundreds of Lisp commands dynamically loaded from Firebase.

**Action:**
- In `LispCommandPalette.jsx` and similar high-throughput filtering functions, always extract expensive `.toLowerCase()` transformations on loop variables outside of inner `some`/`every` closures to prevent O(N*M) performance degradation.
- Always wrap derived list logic (like `filteredCmds` and `sortedGroups`) in a `useMemo` block so that AutoCAD's embedded browser doesn't redundantly recalculate the groupings on every render or state change. Maintain the exact original variable names.
