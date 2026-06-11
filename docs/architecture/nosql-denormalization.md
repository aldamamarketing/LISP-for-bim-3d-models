# Architecture Decision Record: NoSQL Denormalization for LispFiles and Suites

## Status
Accepted - 2026-06-11

## Context
In the V2 architecture of LispStudio/Marketplace, the relationship between `suites` and `lispFiles` was fully relational. A file was added to a suite by creating a `groupFile` document linking `fileId` to a `groupId`, which belonged to a `suiteId`.

While this structure kept the database cleanly normalized and facilitated web UI operations (Drag & Drop sorting, group categorization), it created a severe performance anti-pattern for AutoCAD client operations. The `getRoutine?routine=INDEX` endpoint is called every time a user opens AutoCAD. To fetch a subscriber's allowed commands, the backend had to cascade multiple reads:
1. Fetch all `groups` for the allowed `suiteIds`.
2. Fetch all `groupFiles` for those `groups`.
3. Extract `fileIds`.
This caused latency, increased Firestore read costs exponentially (N+1 query problem), and caused the JIT Loader to fail auth checks.

## Decision
We decided to denormalize the `suites` <-> `lispFiles` relationship.
We introduced an array `suiteIds` inside the `lispFiles` document.

To prevent client-side race conditions and keep the web UI code clean, we implemented an Event-Driven architecture using **Firestore Triggers**:
- `syncSuiteIdsOnGroupFile`: Listens to `onDocumentWritten` on `groupFiles`. It aggregates all unique `suiteIds` for a `fileId` and updates the `suiteIds` array.
- `onGroupDeleted` and `onSuiteDeleted`: Cascade delete children, which in turn trigger the `syncSuiteIdsOnGroupFile` function to clean up the arrays.

## Consequences
- **Positive**: AutoCAD `INDEX` load time is significantly reduced. Firestore read operations are minimized to 1 query using `.where("suiteIds", "array-contains-any", allowedSuiteIds)`.
- **Positive**: Cross-tenant authorization during JIT Load is now instant.
- **Negative**: Slight delay (milliseconds) between web UI changes and backend array sync, but this is acceptable for the user experience.

## Edge Cases Handled
- **Suite or Group Name Changes**: Editing a Suite or Group name does NOT affect the `suiteIds` array, as the array only holds immutable IDs. `getRoutine` dynamic lookup is completely isolated from cosmetic name changes.
