## 2024-11-20 - O(N²) List Appending Anti-pattern in AutoLISP
**Learning:** Found a performance bottleneck where `(append list (list item))` was used inside a loop in `functions/core_engine.lsp`. This causes O(N²) complexity because `append` iterates over the entire list to find the end for each insertion. This is particularly inefficient for larger lists like command indexes.
**Action:** Always replace this with `(cons item list)` inside the loop, and call `(reverse list)` once at the end of the operation, which results in O(N) performance.
