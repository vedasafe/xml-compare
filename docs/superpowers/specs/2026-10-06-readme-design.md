# XML Compare README Design

## Purpose

Create a comprehensive `README.md` that helps two audiences:

- End users who want to understand and use the deployed XML comparison app.
- Developers and contributors who want to run, test, modify, and deploy the project.

The README should be accurate to the current implementation, easy to scan, and organized so that end-user guidance appears before technical contributor material.

## Approach

Use a task-oriented structure. Begin with the application's purpose, live link, features, privacy model, and usage steps. Follow with precise comparison semantics and result behavior. Place setup, architecture, testing, deployment, and contribution guidance afterward.

This structure is preferred over a technical-reference-first README, which would be less accessible to ordinary users, and a product-focused README, which would make contributor information harder to find.

## Content Structure

The README will contain these sections in order:

1. Project title and concise description.
2. Links to the live application and GitHub repository.
3. Key features and the browser-local privacy guarantee.
4. End-user instructions for selecting and comparing XML files.
5. Comparison rules, including ignored formatting differences and meaningful XML differences.
6. Match, mismatch, invalid XML, and file-read result behavior.
7. Technology stack.
8. Local prerequisites, installation, and development commands.
9. Test and production-build commands.
10. Project structure and the responsibilities of important files.
11. GitHub Pages deployment behavior.
12. Contribution workflow and expectations.
13. Current scope limitations.
14. MIT license information.

## Accuracy Requirements

The README must describe only behavior supported by the current code and configuration:

- Formatting-only whitespace between elements is ignored.
- Meaningful text and attribute whitespace is preserved.
- Attribute order is ignored.
- Element names, namespaces, attributes, text, child order, comments, and processing instructions are compared.
- Malformed XML is rejected and associated with the affected file.
- The first detected mismatch includes an XPath-like location, reason, and values.
- Files are processed locally in the browser and are not uploaded by the application.
- Deployment uses the existing GitHub Actions workflow and publishes to the `/xml-compare/` GitHub Pages path.

Commands must match the scripts in `package.json`, and file descriptions must match the current repository structure.

## Presentation

Use clear Markdown headings, short paragraphs, compact lists, and fenced command examples. Keep the language approachable for non-developers while retaining enough precision for contributors. Avoid screenshots, status badges, and decorative content that would require ongoing maintenance.

## Verification

Before completion:

- Check the README for broken or inaccurate local file references.
- Confirm every documented npm command exists in `package.json`.
- Run the test suite and production build.
- Review the rendered Markdown structure for heading order and readability.

