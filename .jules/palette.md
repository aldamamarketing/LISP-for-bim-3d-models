## 2026-07-05 - Support Modal Accessibility & Interaction
**Learning:** Form labels in custom modals were unassociated, screen readers lacked context, and the submit button lacked a loading state, allowing potential duplicate submissions.
**Action:** Always link labels via `htmlFor`, add `role="dialog"` attributes, and implement `isSubmitting` states for async forms.
