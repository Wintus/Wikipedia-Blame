# Wikipedia-Blame

Finds the first revision of a Wikipedia article whose text contains a given string
(git blame for Wikipedia). React 19 SPA: TypeScript, Vite, TanStack Query, GitHub Pages.

## Commands

Use the npm scripts in `package.json` (`dev`, `build`, `test`, `test:watch`, `lint`, `format`).

## Architecture

Form → `searchAction` (`src/actions/search.ts`) → `fetchAllRevisions` (async generator
yielding `{ rev, text }`) → `findMap` (first match, early exit) → one final `SearchState`
via `useActionState`.
Flow and architecture invariants: `docs/architecture-overview.md`.
Decisions: `docs/adr/`. Implementation contracts: `docs/implementation-notes.md`.

## Tests

In-source Vitest blocks (`if (import.meta.vitest)`) in every source file — see
`docs/testing.md`. Pin contracts in the assertion, e.g.
`expect(result).toEqual<SearchState>({ ... })`; generic mocks bypass return-type checks.

## Style

Pure functions, injected dependencies, immutable data, explicit types — see
`docs/functional-style.md`. React Compiler is enabled in `vite.config.ts`; do not add
manual `useMemo`/`useCallback`.

## Docs

Record architectural decisions as ADRs in `docs/adr/`.
