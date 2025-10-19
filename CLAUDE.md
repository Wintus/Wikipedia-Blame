# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wikipedia-Blame is a React single-page application that finds when specific text first appeared in a Wikipedia article's history (similar to git blame). It uses React 19's `useActionState` hook and AsyncGenerator patterns for efficient streaming of potentially large revision histories.

## Development Commands

- `npm run dev` - Start Vite development server
- `npm run build` - Type-check with TypeScript, then build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm test` - Run tests once with Vitest
- `npm run test:watch` - Run tests in watch mode (use during development)
- `npm run test:coverage` - Run tests with coverage report
- `npm run format` - Format code with Prettier
- `npm run preview` - Preview production build locally

## Core Architecture

### Action-State Pattern with useActionState

The application uses React 19's `useActionState` for unified form submission and state management:

1. @src/App.tsx manages state via `useActionState`, consuming the final state from `searchAction`
2. @src/components/SearchForm.tsx collects user input (wiki site, page title, target text, search order, optional start/end revision IDs) and triggers the action
3. @src/actions/search.ts contains `searchAction` - the core orchestration function that:
   - Validates form inputs (wiki site, page ID, target text)
   - Calls `fetchAllRevisions` to get a stream of revisions
   - Uses `genFindMap` to search through the stream efficiently
   - Returns a single final `SearchState` object

### AsyncGenerator Streaming Pattern (ADR-001)

To handle potentially thousands of revisions without loading everything into memory, the app uses a linear streaming search (sampling was removed in favor of simplicity):

- @src/services/MediaWikiAPIs.ts - `fetchAllRevisions` is an AsyncGenerator that:
  - Fetches revision IDs and content simultaneously in a single API call (`rvprop: 'ids|content'`)
  - Uses streaming JSON parsing via `@streamparser/json-whatwg` to process large responses
  - Yields `RevisionResult` objects (`{rev: number, text: string}`) as data arrives
  - Supports `order` ('asc' | 'desc'), `startRevId`, and `endRevId` options
  - Implements client-side caching with `maxage` parameter (ADR-002): 60s for recent revisions, 600s for historical data

- @src/lib/async-generator.ts - Contains `genFindMap` utility:
  - Generic function that applies a predicate to each item in an AsyncGenerator
  - Returns the first item where predicate returns non-null
  - Stops iteration once a match is found (efficient early exit)

### Data Flow

```
User submits form → searchAction validates inputs
  → fetchAllRevisions (AsyncGenerator yields {rev, text})
  → genFindMap applies search predicate
  → First match returned
  → State updated via useActionState
  → UI renders result (ResultView.tsx)
```

See @docs/architecture-overview.md for detailed flow diagram.

## MediaWiki API Integration

The app uses two MediaWiki APIs:

1. **REST API** (`/w/rest.php/v1/page/{title}/bare`) - Fetch page ID from title via `fetchPageId`
2. **Query API** (`/w/api.php?action=query&prop=revisions`) - Fetch revision history with content via `fetchAllRevisions`

Key implementation details:

- Supports English (en.wikipedia.org) and Japanese (ja.wikipedia.org) Wikipedia
- Uses `maxage` cache parameter: 600s for old/continuation pages, 60s for recent revisions (ADR-002)
- Fetches in batches via `rvlimit=max` with continuation tokens (`rvcontinue`)
- Client-side dump processing was considered and rejected due to prohibitive download times (ADR-003)

## Testing Requirements (TDD Workflow)

Uses **Vitest** with **in-source testing** pattern. All source files MUST include tests:

- Tests are written at the bottom of source files using `if (import.meta.vitest) { ... }`
- Use `// MARK: in-source tests` comment before the test block
- Environment: `happy-dom`
- Setup file: @src/setupTests.ts (imports `@testing-library/jest-dom`)

### TDD Workflow:

1. Write tests before or alongside implementation
2. Run `npm run test:watch` during development for continuous feedback
3. Ensure all tests pass before committing
4. When fixing bugs, first write a failing test that reproduces the issue
5. Mock external dependencies (APIs, etc.)

Example test structure:

```ts
// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach } = import.meta.vitest;

	describe('YourFunction', () => {
		it('handles expected case', () => {
			// Test implementation
		});
	});
}
```

## Code Style and Conventions

### Functional Programming Style

The project follows functional programming principles (see @.clinerules/functional-style-guide.md):

1. **Pure functions over classes** - Export individual functions rather than class methods
2. **Dependency injection** - Pass dependencies as function parameters
3. **Function composition** - Build complex operations from small, reusable functions
4. **Immutability** - Create new objects/arrays instead of modifying; use `ReadonlyArray<T>`
5. **Type safety** - Use explicit TypeScript types; leverage `as const satisfies`
6. **Generator functions** - Use for lazy evaluation of sequences
7. **Single responsibility** - Each function does one thing well

### ESLint Rules

- **`curly: ['error', 'all']`** - Always use curly braces for all control structures (if, for, while, etc.), even single-line statements
- React Hooks rules enforced via `eslint-plugin-react-hooks`
- TypeScript strict mode enabled

## Key Architecture Decisions (ADRs)

Located in @docs/adr/:

- **ADR-001**: Removed revision sampling in favor of linear streaming search for code simplicity
- **ADR-002**: Enabled client-side caching with `maxage` parameter (60s for recent, 600s for historical)
- **ADR-003**: Rejected client-side dump processing due to prohibitive download speeds

## Deployment

- **Platform:** GitHub Pages
- **Base path:** `/Wikipedia-Blame/` (configured in @vite.config.ts)
- **Workflow:** `.github/workflows/deploy.yml` auto-deploys on pushes to main branch
- Manual deployment available via GitHub Actions workflow dispatch
