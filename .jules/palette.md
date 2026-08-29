## 2024-07-13 - [SupportModal Accessibility & Loading States]
**Learning:** Custom async form modals in this app often lack fundamental accessible dialog attributes (`role='dialog'`, `aria-modal='true'`, `aria-labelledby`) and do not provide loading/disabled states for submit buttons, causing potential multiple submissions and screen reader confusion.
**Action:** Always add dialog ARIA attributes to modal wrappers, link form labels to inputs using `htmlFor` + `id`, and add interactive `isSubmitting` states to async buttons.
