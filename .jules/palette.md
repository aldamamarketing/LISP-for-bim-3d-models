## 2024-05-15 - Accessible Dropdown Menu
**Learning:** Added proper WAI-ARIA properties (`aria-haspopup`, `aria-expanded`, `role="menu"`, `role="menuitemcheckbox"`, `aria-checked`) to custom React dropdown toggles and lists to fix accessibility gaps for screen readers and keyboard users.
**Action:** Always add standard ARIA attributes (`aria-expanded`, `role="menu"`, etc.) when creating or editing custom dropdown menu components that replicate native behavior.
