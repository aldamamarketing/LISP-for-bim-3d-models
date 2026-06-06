## 2024-06-06 - AutoLISP List Building Performance
**Learning:** Using `(append lst (list item))` inside a loop is an O(N^2) anti-pattern in AutoLISP. This was identified as a performance bottleneck when parsing JSON lists.
**Action:** Replace this pattern with `(cons item lst)` inside the loop and `(reverse lst)` at the end to achieve O(N) performance for list building.
