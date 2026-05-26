## 2024-05-19 - Avoid O(N^2) Anti-Pattern in AutoLISP

**Learning:** AutoLISP loops that use `(append lst (list item))` to build a list result in O(N^2) complexity because `append` traverses the entire first list every time.
**Action:** Replace `(setq lst (append lst (list item)))` with `(setq lst (cons item lst))` inside the loop, followed by a final `(setq lst (reverse lst))` outside the loop for O(N) performance.
