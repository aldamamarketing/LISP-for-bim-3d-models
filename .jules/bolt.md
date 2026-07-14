## 2024-07-14 - HTML5 Web Palette String Allocations
**Learning:** React components running in AutoCAD's embedded browser control (like LispCommandPalette) are highly sensitive to JavaScript execution speed and string allocations. Recomputing `.toLowerCase()` inside `.filter()` and `.some()` closures on every render causes severe UI lag due to O(N*M) string allocations.
**Action:** Always pre-compute `.toLowerCase()` outside of iteration loops and wrap the entire derived grouping and filtering logic in a `useMemo` block, ensuring we maintain exact original variable names via destructuring.
