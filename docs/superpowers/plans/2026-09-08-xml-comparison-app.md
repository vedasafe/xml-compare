# XML Comparison App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished browser-only React app that compares two uploaded XML files while ignoring formatting-only whitespace and reports the first meaningful mismatch.

**Architecture:** A Vite React shell composes two reusable file dropzones and a result panel. A framework-independent TypeScript module parses XML, removes only whitespace-only text nodes between elements, and recursively compares node names, namespace URIs, attributes, values, and ordered children.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Vitest, Testing Library, native `DOMParser`, CSS.

## Global Constraints

- All file reading and XML processing remains local to the browser.
- Ignore indentation, line breaks, whitespace-only text nodes between elements, and attribute ordering.
- Preserve meaningful text whitespace, attribute values, element order, namespaces, comments, and processing instructions.
- Report match, first difference, or file-specific invalid XML state.
- Provide accessible click and drag-and-drop upload controls that stack on mobile.
- Do not add editing, XSD validation, persistence, history, server upload, or a full diff viewer.
- The current workspace is not a Git repository, so commit steps are recorded but must be skipped unless the user initializes Git.

---

## File Structure

- `package.json` — scripts and dependencies.
- `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html` — build and test configuration.
- `src/main.tsx` — React entry point.
- `src/App.tsx` — file and comparison state orchestration.
- `src/components/FileDropzone.tsx` — reusable accessible file picker/drop target.
- `src/components/ComparisonResult.tsx` — result and error presentation.
- `src/lib/compareXml.ts` — XML parsing, normalization, and comparison.
- `src/lib/compareXml.test.ts` — comparator unit tests.
- `src/App.test.tsx` — user workflow component tests.
- `src/styles.css` — design tokens, layout, interaction states, and responsive rules.
- `src/test/setup.ts` — DOM test matchers.

---

### Task 1: Scaffold and XML comparison engine

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/test/setup.ts`
- Create: `src/lib/compareXml.test.ts`
- Create: `src/lib/compareXml.ts`

**Interfaces:**
- Consumes: Browser `DOMParser`.
- Produces: `compareXml(left: string, right: string): XmlComparisonResult`, where the result is `{ status: 'equal' }`, `{ status: 'different'; path: string; reason: string; leftValue: string; rightValue: string }`, or `{ status: 'invalid'; file: 'left' | 'right'; message: string }`.

- [ ] **Step 1: Add the Vite/TypeScript/Vitest scaffold**

Create the configuration with scripts `dev`, `build`, `test`, and `test:run`; use React, Vite, TypeScript, Vitest, jsdom, Testing Library, and Lucide React. Configure Vitest with `environment: 'jsdom'` and `setupFiles: './src/test/setup.ts'`.

- [ ] **Step 2: Write failing comparator tests**

Cover these concrete cases in `src/lib/compareXml.test.ts`:

```ts
expect(compareXml('<root><item id="1">A</item></root>', '<root>\n  <item id="1">A</item>\n</root>')).toEqual({ status: 'equal' })
expect(compareXml('<root a="1" b="2"/>', '<root b="2" a="1"/>')).toEqual({ status: 'equal' })
expect(compareXml('<root>A B</root>', '<root>AB</root>')).toMatchObject({ status: 'different', path: '/root[1]/text()[1]' })
expect(compareXml('<root><a/><b/></root>', '<root><b/><a/></root>')).toMatchObject({ status: 'different', path: '/root[1]/*[1]' })
expect(compareXml('<x:root xmlns:x="urn:a"/>', '<x:root xmlns:x="urn:b"/>')).toMatchObject({ status: 'different' })
expect(compareXml('<root><!--a--></root>', '<root><!--b--></root>')).toMatchObject({ status: 'different' })
expect(compareXml('<root><?mode a?></root>', '<root><?mode b?></root>')).toMatchObject({ status: 'different' })
expect(compareXml('<root><![CDATA[value]]></root>', '<root>value</root>')).toEqual({ status: 'equal' })
expect(compareXml('<root>', '<root/>')).toMatchObject({ status: 'invalid', file: 'left' })
```

- [ ] **Step 3: Run the comparator tests and confirm red state**

Run: `npm install` and then `npm run test:run -- src/lib/compareXml.test.ts`

Expected: FAIL because `compareXml` does not exist yet.

- [ ] **Step 4: Implement the minimal comparison engine**

Implement these exact public types and entry point:

```ts
export type XmlComparisonResult =
  | { status: 'equal' }
  | { status: 'different'; path: string; reason: string; leftValue: string; rightValue: string }
  | { status: 'invalid'; file: 'left' | 'right'; message: string }

export function compareXml(left: string, right: string): XmlComparisonResult
```

Parse each document, detect `parsererror`, convert CDATA and text to the same comparable text-node kind, remove whitespace-only text children, sort attributes by `{namespaceURI, localName}`, keep all other relevant children ordered, and recurse until the first mismatch. Build element paths as `/name[index]`, text paths as `/text()[index]`, and generic ordered-child paths as `/*[index]` when element names diverge.

- [ ] **Step 5: Run the comparator suite and confirm green state**

Run: `npm run test:run -- src/lib/compareXml.test.ts`

Expected: all comparator tests pass with exit code 0.

- [ ] **Step 6: Commit if Git is available**

Run: `git add package.json vite.config.ts tsconfig.json tsconfig.node.json index.html src/test/setup.ts src/lib/compareXml.ts src/lib/compareXml.test.ts && git commit -m "feat: add XML comparison engine"`

Expected in this workspace: skip because the directory is not a Git repository.

---

### Task 2: Build the upload and result interface

**Files:**
- Create: `src/main.tsx`
- Create: `src/components/FileDropzone.tsx`
- Create: `src/components/ComparisonResult.tsx`
- Create: `src/App.test.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

**Interfaces:**
- Consumes: `compareXml(left, right)` and `XmlComparisonResult` from `src/lib/compareXml.ts`.
- Produces: `FileDropzone({ label, file, error, onFile, onRemove })`, `ComparisonResult({ result, leftName, rightName })`, and the default `App` component.

- [ ] **Step 1: Write failing workflow tests**

Use Testing Library to verify:

```ts
expect(screen.getByRole('button', { name: /compare files/i })).toBeDisabled()
await user.upload(screen.getByLabelText(/choose first xml file/i), new File(['<root/>'], 'first.xml', { type: 'text/xml' }))
await user.upload(screen.getByLabelText(/choose second xml file/i), new File(['<root>\n</root>'], 'second.xml', { type: 'text/xml' }))
await user.click(screen.getByRole('button', { name: /compare files/i }))
expect(await screen.findByText(/files match/i)).toBeVisible()
```

Add separate cases for a content mismatch, malformed XML, rejecting `notes.txt`, clearing a stale result when a file is replaced, and removing a selected file.

- [ ] **Step 2: Run the workflow tests and confirm red state**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL because the UI components do not exist yet.

- [ ] **Step 3: Implement reusable file selection**

`FileDropzone` must expose a visually prominent drop area backed by an `<input type="file" accept=".xml,text/xml,application/xml">`. Validate the `.xml` extension case-insensitively, announce errors with `role="alert"`, support drag enter/leave/drop, render file name and human-readable size, and provide replace and remove controls with explicit accessible names.

- [ ] **Step 4: Implement app state and comparison flow**

Store each selected `File`, per-side selection errors, an `isComparing` flag, and `XmlComparisonResult | null`. On compare, read both files with `file.text()`, map read errors to the affected side, call `compareXml`, and render the result. Clear the previous result whenever either file changes or is removed.

- [ ] **Step 5: Implement result presentation**

Render the exact headings `Files match`, `Files are different`, and `XML couldn't be read`. For differences, show the first mismatch path, reason, and labeled left/right values in code-styled blocks. For invalid XML, identify the failing filename and parser message. Every state uses both an icon and text, with `aria-live="polite"` on the result region.

- [ ] **Step 6: Implement the accepted visual system**

Define cool-gray page tokens, a white central work surface, ink text, blue action color, semantic result colors, deliberate control typography, 16–24px rounded geometry, crisp borders, and soft elevation. Use an asymmetrical header with a compact XML mark, a concise title, and a privacy note. Keep the two dropzones visually paired around a small comparison connector. Stack them below `760px`; remove the connector line in the stacked layout. Add visible focus rings and reduced-motion handling.

- [ ] **Step 7: Run workflow tests and confirm green state**

Run: `npm run test:run -- src/App.test.tsx`

Expected: all workflow tests pass with exit code 0.

- [ ] **Step 8: Commit if Git is available**

Run: `git add src/main.tsx src/components/FileDropzone.tsx src/components/ComparisonResult.tsx src/App.tsx src/App.test.tsx src/styles.css && git commit -m "feat: build XML comparison interface"`

Expected in this workspace: skip because the directory is not a Git repository.

---

### Task 3: Production and browser verification

**Files:**
- Modify only files implicated by test, build, accessibility, or visual failures from Task 2.

**Interfaces:**
- Consumes: the complete app from Tasks 1 and 2.
- Produces: a verified production build and browser-tested user workflow.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm run test:run`

Expected: all tests pass, zero failures, exit code 0.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully with exit code 0 and create `dist/`.

- [ ] **Step 3: Verify the core browser workflow**

Start the Vite server, open the app with the in-app Browser, upload two semantically equal XML files with different indentation, compare them, and confirm `Files match`. Replace one with meaningfully different XML and confirm the first mismatch details. Replace it with malformed XML and confirm a file-specific parse error. Remove one file and confirm the compare button becomes disabled. Check the console for errors.

- [ ] **Step 4: Verify responsive and accessible presentation**

Capture the desktop interface at approximately `1440×1000` and a mobile interface at approximately `390×844`. Confirm no overflow, clipping, accidental wrapping, browser-default button typography, or inaccessible focus treatment. Verify keyboard focus reaches both file inputs, replace/remove controls, and the compare button in a logical order.

- [ ] **Step 5: Compare browser output to the accepted design concept**

Inspect the accepted concept and latest desktop screenshot with image viewing. Record a fidelity ledger covering copy, page/container layout, type hierarchy, palette, file-control treatment, spacing, responsive behavior, and interaction states. Fix every material mismatch and repeat the build and screenshot checks.

- [ ] **Step 6: Remove temporary QA artifacts and run final checks**

Remove only temporary uploaded XML fixtures and screenshots created for QA, retaining source, tests, docs, and build configuration. Re-run `npm run test:run` and `npm run build` and require exit code 0 from both before handoff.
