## 2024-05-24 - Initialized Palette Journal
## 2024-05-24 - Missing ARIA Labels on Support Modal
**Learning:** Found an accessibility issue where the close button on the SupportModal component is missing an aria-label, which makes it invisible to screen readers. Added aria-labels to the delete buttons in LicensesTab and SupportModal.
**Action:** Add aria-label="Close modal" to the close button in SupportModal, and "Delete device" to the delete button in LicensesTab.
