
## 2024-05-15 - ARIA patterns for toggleable dropdowns
**Learning:** Custom dropdown menus representing toggleable states require specific ARIA patterns (`role="menuitemcheckbox"` and `aria-checked`) instead of standard menu items.
**Action:** Always add `aria-expanded`, `aria-haspopup`, `role="menu"`, and `role="menuitemcheckbox"` with `aria-checked` to custom dropdown toggle menus.
