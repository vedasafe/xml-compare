# XML Comparison App Design System

## Source of Truth

Visual reference: `docs/superpowers/designs/xml-comparison-app-concept.png` at 1536×1024.

## Copy Lock

Allowed initial-viewport copy:

- XML Compare
- Compare XML files with confidence
- Formatting differences are ignored. Your files never leave this browser.
- First XML file
- Second XML file
- Choose XML file
- Drop your XML file here
- or click to browse
- Compare files
- Private by design · Processed locally in your browser

Selected state additionally allows the user-provided filename, `XML · <size>`, `Replace`, and `Remove`. Result states additionally allow the exact result headings and details defined in the implementation plan, including mismatch paths and values. No navigation, badges, metrics, or marketing sections are allowed.

## Layout and Container Model

- Cool blue-gray full-page background with one quiet header, open title area, and a single white comparison work surface.
- Desktop content width: approximately 1400 CSS pixels at the 1536 reference width, with 64-pixel outer gutters.
- Work surface: one bordered container with 16–18px radius and a soft cool shadow; avoid nested card grids.
- Two equal document upload regions sit in a two-column grid separated by a narrow connector rail.
- Primary action is centered below both inputs and result feedback spans the work surface below it.
- Below 760px, upload regions stack and the connector becomes a compact vertical transition without a dividing line.

## Color Tokens

- Page background: `#f3f7fc` (cool tinted gray, not cream).
- Work surface: `#ffffff` true white.
- Primary ink: `#0b1734`.
- Muted ink: `#63718b`.
- Border: `#cfd9e7`.
- Subtle surface: `#f8fafd`.
- Primary blue: `#1268f3`, hover `#0b56d4`.
- Success: ink `#126847`, border `#87ddb3`, surface `#effcf5`.
- Difference: ink `#8a4b08`, border `#f0c36b`, surface `#fff8e8`.
- Error: ink `#a32626`, border `#f0aaaa`, surface `#fff3f3`.
- Focus: `#7db2ff` with a white separation ring.

## Typography

- Family: `Inter`, `Segoe UI`, system sans-serif fallback.
- Brand: 24px/1.2, 750.
- H1: clamp from 38px mobile to 58px desktop, 750–800, tight tracking.
- Supporting text: clamp from 17px to 22px, 400–450.
- Section labels: 18px/1.3, 700.
- Filenames: 18px/1.3, 700.
- Metadata and footer: 14–16px, 500.
- Buttons: 15–17px, 650–700; never browser-default sizing.

## Geometry, Spacing, and Elevation

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Outer work surface radius: 18px.
- Upload region radius: 14px.
- Controls: 10–12px radius.
- Shadow: cool and diffuse, approximately `0 22px 60px rgba(34, 67, 112, .10)`.
- Motion: 160–220ms for hover, focus, drag, and result reveal; disable nonessential transitions for reduced motion.

## Icon Inventory

- Brand: paired code brackets and slash, blue outline, 2px stroke.
- Upload/selected file: document outline, muted blue-gray, 1.75–2px stroke.
- Connector/compare: two opposing horizontal arrows, blue-gray outline.
- Replace: clockwise refresh arrow, blue outline.
- Remove: trash outline, red.
- Primary action: opposing arrows, white.
- Result: success check, difference alert, or parse-error alert; icon plus text in every state.

Lucide outline icons are permitted where their metaphor and stroke treatment match this inventory.

## Component Families and States

- `FileDropzone`: empty, drag-active, selected, error, keyboard focus. Empty state remains a document-shaped interaction zone; selected state shows document icon, file identity, and separate replace/remove actions.
- Primary button: disabled, enabled, hover, focus, busy. Full-width on narrow screens and centered fixed-width on desktop.
- `ComparisonResult`: equal, different, invalid. Each is a bordered horizontal band on desktop and a stacked band on mobile.

## Responsive and Interaction Rules

- Desktop reference is 1536×1024; implementation QA target is 1440×1000 plus the concept-native size when practical.
- Mobile QA target is 390×844.
- No horizontal overflow or clipped primary content.
- Keyboard order follows first picker, first file actions, second picker, second file actions, compare action, then result content.
- File and result changes are announced with appropriate live regions.
- All text and controls are code-native. The concept bitmap is never shipped as interface content.
