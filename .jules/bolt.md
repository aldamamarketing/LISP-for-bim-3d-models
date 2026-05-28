## 2024-05-24 - O(N^2) List Building Anti-pattern in AutoLISP
**Learning:** Using `(append lst (list item))` inside loops (like `repeat`, `while`, or `foreach`) to build lists in AutoLISP causes O(N^2) performance because `append` traverses the entire list on every iteration. This is particularly harmful when processing large AutoCAD selection sets.
**Action:** Always use `(cons item lst)` inside the loop to prepend elements in O(1) time, and then apply `(reverse lst)` after the loop to restore the correct order. This reduces the list building time to O(N).
