## 2024-05-15 - [Accessible Custom Dropdown Menus]
**Learning:** When building custom dropdown menus representing toggleable states, adherence to accessible ARIA patterns is critical. This involves adding `aria-expanded` and `aria-haspopup="menu"` to the trigger element, `role="menu"` to the dropdown container, and using `role="menuitemcheckbox"` combined with `aria-checked` on the individual items instead of standard buttons or menuitems.
**Action:** Always implement these specific ARIA attributes for custom dropdown menus to ensure proper screen reader support and keyboard accessibility.
