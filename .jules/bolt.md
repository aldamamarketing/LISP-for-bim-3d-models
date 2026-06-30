## 2024-06-30 - AutoLISP O(N²) List Building Anti-Pattern
**Learning:** Using `(append lst (list item))` inside loops to build lists in AutoLISP results in O(N²) time complexity, because `append` recreates the entire list on every iteration. In large selections or CAD operations, this can significantly degrade performance and hang the main thread.
**Action:** Always use `(cons item lst)` inside the loop (which is O(1)) and then call `(reverse lst)` after the loop to achieve O(N) overall performance for list building.
