## 2024-11-20 - AutoLISP List Building Optimization
**Learning:** Building lists inside loops using `(append lst (list item))` is an O(N^2) operation in AutoLISP and causes severe performance degradation for large datasets.
**Action:** Always build lists backwards using `(cons item lst)` inside the loop, and use `(reverse lst)` at the end to achieve O(N) performance.
