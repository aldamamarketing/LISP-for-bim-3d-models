## 2023-10-24 - [Replace AutoLISP `append` inside loop with `cons` then `reverse`]
**Learning:** Found a major O(N^2) performance bottleneck specific to AutoLISP where developers iteratively build selection lists using `(setq lst (append lst (list item)))` inside a loop. This requires list copy every iteration.
**Action:** Always replace `(append lst (list item))` inside `repeat` or `foreach` loops with `(setq lst (cons item lst))` followed by `(setq lst (reverse lst))` outside the loop for O(N) performance.
