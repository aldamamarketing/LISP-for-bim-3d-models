## 2024-06-13 - [AutoLISP List Building Optimization]
**Learning:** In AutoLISP, using `(append lst (list item))` inside a loop to build a list repeatedly traverses the entire list, resulting in O(N²) time complexity.
**Action:** Always use `(cons item lst)` inside the loop and `(reverse lst)` at the end to achieve O(N) performance for building lists in AutoLISP.
