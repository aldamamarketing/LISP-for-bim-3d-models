## 2024-05-18 - [LISP Append Anti-Pattern]
**Learning:** In AutoLISP scripts, using `(append lst (list item))` inside loops to build lists causes an O(N^2) time complexity because `append` traverses and duplicates the entire list on each iteration.
**Action:** Use `(cons item lst)` inside the loop to build the list backwards in O(1) per iteration, and then use `(reverse lst)` at the end to achieve O(N) overall performance.
