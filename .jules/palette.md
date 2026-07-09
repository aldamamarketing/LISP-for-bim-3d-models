## 2024-07-09 - Accessible Dropdown Menus with Checkable Items
**Learning:** Standard buttons inside a custom dropdown used for toggleable states are not accessible to screen readers, which won't understand their checked state or that they belong to a menu.
**Action:** Add `aria-expanded` and `aria-haspopup='menu'` to the trigger element, `role='menu'` to the dropdown container, and use `role='menuitemcheckbox'` combined with `aria-checked` on the individual items.
