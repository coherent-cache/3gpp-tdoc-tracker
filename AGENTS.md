# Repository Guidelines

## Project Structure & Module Organization
Primary UI lives in `src/` with Svelte components (`App.svelte`, `Toolbar.svelte`, `TdocTable.svelte`, `VersionSidebar.svelte`), `parser.js` for agenda ingestion, and `app.css` for styling. The production artifact `dist/3gpp-tdoc-tracker.html` is generated—never hand-edit it. `docs/` stores process references (state diagrams, agent guides) and `examples/` holds sample 3GPP agenda HTML used for regression checks. Update `build-single.js` when packaging logic changes and keep helper assets colocated with their owning component.

## Build, Test, and Development Commands
- `npm install`: install dependencies when `package.json` changes.
- `npm run dev`: launch the Vite dev server at `http://localhost:5173` with hot reload.
- `npm run build`: produce the production bundle in `dist/` for release validation.
- `npm run build:single`: run `build-single.js` to regenerate the standalone HTML bundle.
- `npm run preview`: serve the latest build to verify release behavior locally.

## Coding Style & Naming Conventions
Use two-space indentation and double quotes across JavaScript and Svelte files. Name Svelte components in PascalCase (one component per `.svelte` file) and keep utility modules in camelCase (`parseTdocHtml`, `createNewVersion`). Keep reactive declarations lightweight, prefer stores for cross-component state, and scope CSS within `app.css` or component `<style>` blocks. Match surrounding formatting—no automated formatter is configured—before sending a change for review.

## Testing Guidelines
Automated tests are not yet configured; document manual coverage in every PR. Exercise core flows: load `examples/AgendaWithTdocAllocation_2024-11-11_19h21.htm`, apply approvals, create revisions, and switch versions to confirm persistence after reload. For parser updates, compare old vs. new output in the browser console to confirm TDoc metadata survives imports. When adding automated tests (Vitest + `@testing-library/svelte` works well), colocate specs in `src/__tests__/` and document the new `npm test` command.

## Commit & Pull Request Guidelines
Follow the existing `type: summary` commit style (`feat`, `docs`, `fix`, etc.) visible in `git log`, and keep commits focused on a single concern. Reference issue IDs when applicable. PRs must include a concise overview, manual test notes (commands run, sample files used), and screenshots or GIFs for UI-facing changes. Call out any impact on the single-file export and state whether `npm run build:single` was executed so reviewers know the artifact is current.
