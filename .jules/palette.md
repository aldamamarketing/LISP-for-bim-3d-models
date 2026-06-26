## 2024-06-26 - Accessible Toggleable Dropdown Menus
**Learning:** For custom dropdown menus representing toggleable states, adhering to accessible ARIA patterns is critical. It involves setting `aria-expanded` and `aria-haspopup` on the trigger, `role="menu"` on the container, and `role="menuitemcheckbox"` with `aria-checked` on the items.
**Action:** Always apply `role="menuitemcheckbox"` and `aria-checked` to items in toggleable dropdown menus instead of standard buttons or menuitems.
