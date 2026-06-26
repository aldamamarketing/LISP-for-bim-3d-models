## 2024-07-26 - O(N*M) string ops in filter
**Learning:** Found that string ops like `.toLowerCase()` inside `.filter()` operations can degrade performance in larger lists due to the O(N*M) calculation overhead inside a tight loop closure. Memory suggests fixing this!
**Action:** Extract expensive string transformations to be pre-calculated, or ensure we avoid redundant transformation in closures.
