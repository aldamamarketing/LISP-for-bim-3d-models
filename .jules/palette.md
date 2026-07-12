## 2024-07-12 - Accessible Toggleable Dropdown Menus
**Learning:** When building custom dropdown menus that represent toggleable states (like opening/closing palettes), standard buttons or menuitems don't convey the state to screen readers.
**Action:** Use `role="menuitemcheckbox"` combined with `aria-checked` on individual items, and `aria-haspopup="menu"`, `aria-expanded`, and `role="menu"` on the trigger and container for proper accessibility.
