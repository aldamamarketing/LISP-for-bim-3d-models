## 2024-06-10 - Add aria-labels and keyboard focus to icon-only buttons in SuitesGroupsCard
**Learning:** Found several icon-only action buttons (Edit Suite, Add Group, Delete Suite, Delete Group, Remove Assignment) that used `title` for visual tooltips but lacked `aria-label` for screen readers and also did not have clear `:focus-visible` keyboard accessibility states. Also converted a `div` with `onClick` to a native `<button>` element for keyboard accessibility.
**Action:** Always add `aria-label` when rendering icon-only buttons. Ensure focus states like `focus-visible:ring-2` are added. Convert interactive `div` elements to `button` to natively inherit keyboard navigation abilities.
## 2024-06-10 - Fix Breadcrumbs Dynamic Labelling
**Learning:** Hardcoded translation strings (like 'Mis Suscripciones') and disjointed state keys (like checking for `lisp` instead of `files` and `suites`) in breadcrumb navigation lead to wrong context clues.
**Action:** Always map the exact active route states to the corresponding `i18n` translation keys, avoiding hardcoded fallback strings.
