# Research: Fix Hydration & Application Stability

**Date**: 2026-04-13  
**Branch**: `005-fix-hydration-stability`

## Bug 1: Hydration Mismatches

### Root Cause Analysis

**Symptom**: Browser console shows hydration mismatch warnings. Interactive elements (buttons, dropdowns, modals) may not respond to clicks after initial render.

**Root Cause**: `suppressHydrationWarning` was added as a blanket fix to `Button` and `Input` base UI components, masking the real issue instead of solving it. The actual hydration mismatch source is `next-themes`, which injects a `class` attribute on `<html>` at runtime — this is expected and correctly handled by `suppressHydrationWarning` on `<html>` and `<body>` only.

**Files Affected**:
- `src/components/ui/button.tsx` — has `suppressHydrationWarning` globally on every button; should be removed.
- `src/components/ui/input.tsx` — has `suppressHydrationWarning` globally on every input; should be removed.
- `src/presentation/components/shared/theme-toggle/index.tsx` — has `suppressHydrationWarning` on the trigger; already has a correct `mounted` state guard but the `mounted` guard isn't applied to the icon rendering.
- `src/presentation/components/shared/language-switcher/index.tsx` — has `suppressHydrationWarning` on the trigger; doesn't need it since locale is server-determined.
- `src/app/[locale]/layout.tsx` — has `suppressHydrationWarning` on `<html>` and `<body>`; this is CORRECT and should stay (required by `next-themes`).

**Decision**: Remove `suppressHydrationWarning` from `Button`, `Input`, `ThemeToggle` trigger, and `LanguageSwitcher` trigger. Keep it only on `<html>` and `<body>` in the root layout. For `ThemeToggle`, ensure the `mounted` guard prevents theme-dependent class rendering until client hydration completes.

**Rationale**: `suppressHydrationWarning` suppresses the warning but doesn't fix the underlying mismatch. In @base-ui/react components, the suppression can also interfere with the framework's own hydration lifecycle, potentially leaving event handlers unattached.

**Alternatives Considered**:
- Keep `suppressHydrationWarning` everywhere → Rejected: masks real issues and may break event handler hydration.
- Wrap every component in a client-only boundary → Rejected: over-engineering, kills SSR benefits.

---

## Bug 2: Submission Form Infinite Re-fetch

### Root Cause Analysis

**Symptom**: The submission form page keeps refreshing/re-fetching data while the user is trying to fill in fields.

**Root Cause**: In `use-submission.ts`, the `fetchContent` callback (line 69) has a dependency array that includes `draft.clientName`, `draft.formData`, and `updateDraft`. Every time the user types (which updates draft state via `updateDraft`), the `fetchContent` callback is recreated, which triggers the `useEffect` on line 133 to re-run, which calls `fetchContent()` again — creating an infinite loop of: type → draft updates → fetchContent recreated → useEffect fires → API call → state updates → draft updates → ...

**Key Evidence** (line 131):
```typescript
}, [tokenOrId, draftLoaded, draft.clientName, draft.formData, updateDraft]);
```

The `draft.clientName` and `draft.formData` references change on every keystroke because `updateDraft` calls `setDraft` which creates new object references.

**Decision**: Stabilize `fetchContent` by removing mutable draft state from its dependency array. The draft-check logic (line 87: `const hasDraftData = ...`) should use a ref instead of reading from the reactive `draft` state, so `fetchContent` is only dependent on `tokenOrId` and `draftLoaded`.

Additionally, the SSE `onmessage` handler (line 151) calls `fetchContent()` unconditionally on any `STATUS_CHANGED` event. Per the clarification decision, SSE events must be queued while the user is actively editing and only processed after submit/navigate.

**Rationale**: The dependency array is the direct cause — React's `useCallback` recreates the function whenever any dependency changes, and `useEffect` re-fires when its dependency (the callback) changes.

**Alternatives Considered**:
- Debounce `fetchContent` → Rejected: doesn't fix the root cause, just delays the loop.
- Move to server actions → Rejected: requires architectural refactoring, violates targeted-patch constraint.

---

## Bug 3: Delete Modal Auto-Closing

### Root Cause Analysis

**Symptom**: Clicking "Delete" in the submission row's action menu briefly shows (or doesn't show) the confirmation dialog before it auto-closes.

**Root Cause**: In `submissions-table/index.tsx`, the `AlertDialog` component is nested inside a `DropdownMenuContent`. When the `DropdownMenuItem` (the delete trigger) is clicked, the `DropdownMenu` interprets this as a selection and closes itself. Since the `AlertDialog` is a child of the `DropdownMenuContent`, the portaled content may also be affected by the dropdown's unmount lifecycle.

The current mitigation at line 140 uses `onSelect={(e) => e.preventDefault()}` on the `DropdownMenuItem`, which should prevent the dropdown from closing. However, the `@base-ui/react` Menu component's `Item` may still close the menu through its own internal click-away / focus-loss handling, especially because the `AlertDialogContent` is portaled to a different DOM location.

**Decision**: Separate the `AlertDialog` state management from the dropdown. Use a controlled `open` state for the `AlertDialog` that is set when the delete menu item is clicked, and render the `AlertDialog` outside the `DropdownMenu` component tree entirely. This way the dropdown can close naturally without affecting the dialog.

**Rationale**: Nesting a portaled dialog trigger inside a portaled dropdown creates competing focus management. The cleanest fix is to decouple them: the dropdown item sets a state flag, the dialog reads it independently.

**Alternatives Considered**:
- Use `modal={false}` on the dropdown → Rejected: changes dropdown behavior globally.
- Stop propagation on all events → Rejected: fragile, may break accessibility.

---

## Bug 4: MongoDB Connection Retrying

### Root Cause Analysis

**Symptom**: Server logs show repeated MongoDB connection establishment events. API responses are slow due to redundant connection handshakes.

**Root Cause**: The `connectToDatabase()` function in `db.ts` is called at the start of every repository method across 7 repository files (50+ call sites). While the function has a caching mechanism via `global.mongooseConn`, there are two issues:

1. **Development hot-reloads**: During Next.js development, module-level variables are re-evaluated on hot-reload but `global.mongooseConn` should survive. However, if the mongoose connection state becomes `disconnected` due to a timeout, the cached `conn` reference is stale — `cached.conn` is truthy but the underlying socket may be dead.

2. **Auth.ts dual connection**: `auth.ts` creates a separate `MongoClient` instance (line 36-50) for the `MongoDBAdapter`, in addition to the Mongoose connection. This means there are TWO independent MongoDB connections — one via Mongoose and one via the native MongoClient. Both attempt to connect on every auth operation.

3. **No retry limits**: If `mongoose.connect()` fails (line 47), the error handler clears `cached.promise` (line 55) but there's no retry counter. The next call to `connectToDatabase()` will attempt a fresh connection, potentially creating an infinite retry loop if the database is unreachable.

**Decision**:
- Add connection state validation: check `mongoose.connection.readyState` before returning the cached connection.
- Add a retry counter with max 3 attempts and exponential back-off (1s, 2s, 4s).
- Log connection attempts with attempt number.
- For the auth.ts `MongoClient`, ensure it also uses a proper singleton that doesn't re-create on every import.

**Rationale**: The per-call `connectToDatabase()` pattern is fine for serverless, but needs state validation and retry limits to prevent the observed infinite retry behavior.

**Alternatives Considered**:
- Remove per-call `connectToDatabase()` and use middleware → Rejected: requires architectural change, doesn't work well with serverless cold starts.
- Use a connection pool monitor → Rejected: over-engineering for the current scale.
