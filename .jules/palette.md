## 2024-05-30 - Accordions and ARIA
**Learning:** Icon-only buttons (like folder and close icons) and accordions require `aria-label` and `aria-expanded` attributes respectively to be accessible to screen readers, especially when the buttons have a visual purpose but lack a textual one.
**Action:** Always include `aria-label` for icon-only inputs and interactive elements, and add state variables (like `aria-expanded` for toggles) to dynamic containers.
