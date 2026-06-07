## 2024-05-30 - [LISP Pattern] Avoid O(N^2) list append
**Learning:** Found a performance bottleneck specific to AutoLISP parsing loops where `(append lst (list item))` is used to build a list. This forces LISP to traverse the whole list on every iteration, leading to O(N^2) complexity.
**Action:** Always replace `(setq lst (append lst (list item)))` inside loops with O(1) `(setq lst (cons item lst))` followed by a single O(N) `(reverse lst)` at the end of the operation to construct ordered lists in LISP.
