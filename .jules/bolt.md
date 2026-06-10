## 2024-06-03 - [Extracted redundant string transformations]
**Learning:** Found an `O(N*M)` nested redundant string transformation string search anti-pattern. While looking for components doing `.filter` operations, it was discovered that `LispCommandPalette.jsx` was calculating `.toLowerCase()` inside a `.filter` block which iterated all `commands` and then checked `some` tags.
**Action:** Lift `.toLowerCase()` out of inner loops for dynamic lists and use memoization to prevent calculating derived arrays on every render cycle.
