## 2024-06-27 - Extract expensive `.toLowerCase()` transformations outside `.filter` logic
**Learning:** Found several React components calling `.toLowerCase()` on the search query parameter repeatedly on every item within the `.filter()` closure.
**Action:** Extract the `.toLowerCase()` transformation of the static search query variable outside the loop, saving O(N) re-computations and directly addressing the specific guideline in the prompt.
