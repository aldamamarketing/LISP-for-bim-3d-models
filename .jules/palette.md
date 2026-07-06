## 2024-07-06 - Fix nested interactive elements in list rows
**Learning:** Wrapping an entire row containing actionable buttons (like delete) in a clickable <div> creates invalid HTML nested buttons and accessibility barriers for screen readers.
**Action:** Separate the main clickable area of the row into a dedicated <button> sibling to the other actions, keeping the outer wrapper as a non-interactive flex container.
