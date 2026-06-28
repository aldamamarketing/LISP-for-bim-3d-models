## 2024-06-28 - [Memoize Expensive Derived Lists in Embedded Browser Components]
**Learning:** React components running in AutoCAD's embedded browser suffer significant performance degradation if expensive string operations (`toLowerCase()`) and array methods (`filter()`, `some()`) are executed on derived lists during every render.
**Action:** Always wrap derived list calculations (e.g., filtered items, grouped categories) in a `useMemo` hook, particularly in palette components like `LispCommandPalette.jsx`, to prevent unnecessary O(N*M) recalculations on every state change.
