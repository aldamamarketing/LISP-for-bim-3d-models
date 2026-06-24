## 2024-06-23 - ARIA Labels on Icon-Only Buttons
**Learning:** Found multiple instances where interactive icon-only buttons (like delete, edit, or close) rely solely on the visual representation of an icon and sometimes a tooltip (`title`) in the dashboard components, causing them to be inaccessible to screen readers.
**Action:** Always verify that every icon-only `<button>` has a descriptive `aria-label` attribute (e.g., `aria-label="Excluir"`). A `title` attribute acts as a tooltip and is insufficient for screen reader accessibility.
