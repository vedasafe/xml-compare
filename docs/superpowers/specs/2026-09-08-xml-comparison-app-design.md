# XML Comparison App Design

## Purpose

Build a browser-based tool that lets a user upload two XML files and determine whether their XML content is equivalent while ignoring formatting-only whitespace.

## User Experience

The primary screen presents two equal upload areas side by side on desktop and stacked on smaller screens. Each accepts click-to-browse and drag-and-drop input and shows the selected filename, size, and a replace or remove action. Once both files are selected, the user can compare them.

The result appears in a prominent status panel:

- **Match:** the parsed XML content is equivalent.
- **Different:** the XML differs, with the first mismatch path and the values from each file.
- **Invalid:** one or both files cannot be parsed as XML, with a useful parser error.

Users can replace either file and compare again without reloading the page. All processing remains local to the browser.

## Comparison Semantics

The application parses both files as XML and compares their document trees recursively.

- Ignore indentation, line breaks, and whitespace-only text nodes between elements.
- Ignore XML attribute ordering.
- Compare element names, namespace URIs, attributes, attribute values, meaningful text, child order, comments, and processing instructions.
- Preserve whitespace inside meaningful text and attribute values. A text value of `"A B"` is therefore different from `"AB"`.
- Reject malformed XML rather than falling back to text comparison.
- Compare the document as XML content rather than filenames, encoding declarations, or formatting style.

The first detected mismatch includes a stable XPath-like location and a concise explanation such as a changed text value, missing attribute, different element, or child-count mismatch.

## Architecture

Use React with Vite and TypeScript. Keep the app client-only and dependency-light.

- `App` owns file selection and comparison state.
- `FileDropzone` handles accessible file browsing, drag-and-drop, file metadata, replacement, and removal.
- `ComparisonResult` renders match, difference, and parse-error states.
- A standalone comparison module parses XML, normalizes formatting-only nodes, and returns a typed result. It contains no React dependencies so it can be unit tested directly.

## Visual Direction

Use a clean, focused utility aesthetic: a restrained cool-gray canvas, crisp white work surface, dark ink typography, and a saturated blue primary action. The two file inputs should feel like paired documents rather than generic dashboard cards. Match, difference, and error states use accessible green, amber, and red accents without relying on color alone.

The layout should remain airy and legible at desktop widths while collapsing naturally to a single column on mobile. Motion is limited to subtle hover, drop-target, and result transitions and respects reduced-motion preferences.

## Error Handling

- Reject non-XML file extensions at selection time with an inline message, while still validating file contents after reading.
- Report file-read failures without losing the other selected file.
- Report parser errors against the specific file.
- Disable comparison until both valid file selections are present.
- Clear stale results whenever either selected file changes.

## Testing

Unit tests cover equal XML with different indentation, reordered attributes, meaningful text differences, element-order differences, namespaces, comments, processing instructions, CDATA/text equivalence, empty elements, and malformed XML.

Browser verification covers click upload, drag-and-drop behavior where automation permits, comparison results, replacing and removing files, keyboard focus, responsive layout, and absence of console errors. A production build must also complete successfully.

## Out of Scope

- Uploading files to a server
- Editing XML inside the app
- Full side-by-side diff visualization beyond the first mismatch
- Schema validation or XSD support
- Persisting files or comparison history
