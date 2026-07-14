## 2024-07-14 - Accessible Toggleable Dropdown Menus
**Learning:** Custom dropdown menus that represent toggleable states (like selecting which palettes are active) often lack native semantic meaning. Standard buttons or menuitems don't communicate state to screen readers.
**Action:** For dropdowns managing toggleable states, always add `aria-expanded` and `aria-haspopup='menu'` to the trigger, `role='menu'` to the container, and use `role='menuitemcheckbox'` with `aria-checked` on the items to explicitly convey their interactive state.
