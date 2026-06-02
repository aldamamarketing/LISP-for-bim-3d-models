## 2024-06-02 - Icon-only buttons accessibility pattern
**Learning:** Found a pattern across multiple app components (Dashboard, LinetypeGenerator, IconGenerator) where icon-only buttons rely on `title` attributes or purely visual symbols (like "×", "edit", "delete" icons) but lack proper `aria-label` attributes for screen readers.
**Action:** When creating or reviewing icon-only interactive elements in this codebase, ensure `aria-label` is explicitly provided, even if a visual `title` tooltip is present, to guarantee full accessibility.
