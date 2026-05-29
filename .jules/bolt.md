## 2024-05-18 - Replacing O(N²) list appending with O(N) cons in AutoLISP
**Learning:** Found and corrected the `(append lst (list item))` anti-pattern in list building loops within the AutoLISP logic (e.g., `TMD_BOM.lsp`). This operation creates an entirely new list during every iteration, leading to O(N²) performance degradation.
**Action:** Always replace `(setq lst (append lst (list item)))` with `(setq lst (cons item lst))` followed by `(setq lst (reverse lst))` at the end of the loop when the exact order needs to be preserved. This keeps list building at O(N) performance.
