## 2024-05-28 - [Accessible Notification Toggle]
**Learning:** Found a notification toggle that was a `<div>` with an `onClick` handler. This is a common pattern that fails basic accessibility checks because it cannot be focused via keyboard (`tabIndex` missing) and doesn't respond to `Enter`/`Space` keys. Additionally, icon-only interactive elements must have an `aria-label`.
**Action:** Always replace interactive `<div>` or `<span>` elements with native `<button>` elements. Apply `background: 'none', border: 'none', padding: 0` to maintain the existing visual design while gaining native keyboard support and semantic meaning. Always add `aria-label` to icon-only buttons.

## 2024-05-28 - [Mobile Responsive Tables]
**Learning:** Wide tables with fixed or minimum widths (like `minWidth: '850px'`) will break the mobile viewport, causing the entire page layout to shift and forcing the user to scroll the whole page horizontally, which is a poor experience.
**Action:** Always wrap wide tables in a responsive container with `<div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>` to confine horizontal scrolling strictly to the table area, preserving the overall page layout on mobile devices.
