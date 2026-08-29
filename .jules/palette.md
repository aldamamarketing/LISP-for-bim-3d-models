## 2024-05-20 - [Icon-only Buttons Accessibility]
**Learning:** Found multiple instances of icon-only remove buttons (`.btn-remove`) in the generator tools (LinetypeGenerator, IconGenerator) lacking accessible names or visual tooltips, making them completely opaque to screen readers.
**Action:** Added `aria-label="Remove item"` and `title="Remove item"` to these buttons. Going forward, always ensure that any icon-only button contains both an `aria-label` for screen readers and a `title` (or equivalent tooltip) for sighted keyboard/mouse users.
