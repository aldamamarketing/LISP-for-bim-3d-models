
## 2024-07-15 - Accessible ARIA patterns for toggleable dropdown menus
**Learning:** Custom dropdown menus in the palette that toggle visibility states require specific ARIA roles to be fully accessible. Using `role="menuitemcheckbox"` with `aria-checked` accurately conveys the active/visible state of each palette option to screen readers, unlike standard buttons.
**Action:** Always apply `aria-expanded` and `aria-haspopup="menu"` to the trigger, `role="menu"` to the container, and `role="menuitemcheckbox"` with `aria-checked` to toggleable items, alongside standard `aria-label` and focus states.
