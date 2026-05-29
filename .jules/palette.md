## 2026-05-29 - [Interactive Elements as Divs]
**Learning:** Found an interactive `div` used for the notifications bell with an `onClick` handler but lacking keyboard focus and semantics. This is a common pattern that reduces accessibility.
**Action:** When working on UI components, actively scan for `div` or `span` elements with `onClick` handlers and replace them with native `<button>` elements, applying CSS resets (`background: 'none', border: 'none', padding: 0`) and adding `aria-label` attributes for icon-only buttons to guarantee keyboard and screen reader accessibility.
