# Wikipedia-Blame

A tool for finding when specific text first appeared in a Wikipedia article's history, similar to git blame functionality.

## Project Overview

Wikipedia-Blame is a React-based single-page application that helps users identify the revision where specific text was introduced into a Wikipedia article.
It leverages the MediaWiki APIs and an efficient search algorithm to analyze revision history.

The application utilizes modern React features, specifically the `useActionState` hook, for streamlined form handling and state management.

### Features

- Search for the first occurrence of text across all revisions of a Wikipedia article.
- Support for both English (en.wikipedia.org) and Japanese (ja.wikipedia.org) Wikipedia.
- Search algorithm:
	- Performs a linear search through revisions.
	- Fetches revision data (ID and content) progressively using an async generator,
	handling potentially long histories by processing data in streams without loading all data into memory at once.
- Iterative searching: Users can specify a "start revision ID" and/or
an "end revision ID" to search within a specific range of revisions.
- Direct links to the specific revision where the text was found.
- Clear indication of loading states managed by `useActionState`.

## Technical Stack

- React v19 (`useActionState`)
- TypeScript
- Vite for build tooling
- MediaWiki APIs (REST API for page ID, Query API for revisions)
- CSS Modules / Standard CSS for styling
- GitHub Pages for hosting

## Technical Overview

The application employs an action-state driven architecture centered around React's `useActionState` hook:

1. **Form Submission:** The `SearchForm` component uses a form action (`searchAction`) provided by `useActionState`.
2. **Action Execution (`search.ts`):**
	- The `searchAction` function receives form data and the previous state.
	- It validates input and fetches the Wikipedia page ID using `fetchPageId` (`MediaWikiAPIs.ts`).
	- It initiates fetching revision IDs using the `fetchAllRevisions` async generator (`MediaWikiAPIs.ts`),
	optionally passing an `endRevId` to limit the search range based on form input.
	- `fetchAllRevisions` implements basic caching using the `maxage` parameter in the API request.
	- It calls `genFindMap` (`async-generator.ts`), passing the revision generator and a predicate to check for the target text.
3. **Search Algorithm (`async-generator.ts`):**
	- `genFindMap` consumes revisions from the generator.
	- The predicate checks the fetched text content.
4. **State Update:** `searchAction` returns the new `SearchState` (including the found `revisionId`) or an error.
`useActionState` updates the application state.
5. **UI Rendering:** `App.tsx` passes the `searchState` (containing the found `revisionId`) and `isPending` status down to `SearchForm.tsx` (for default value population) and `ResultView.tsx` (for display).

This approach collocates data fetching and state logic within the action, simplifying component responsibilities and leveraging React's built-in pending state management.
See [architecture-overview.md](docs/architecture-overview.md) for a visual flow diagram.

## Project Structure

- **`src/`**: Main source code directory.
	- **`actions/`**: Contains the `useActionState` action logic (`search.ts`).
	- **`components/`**: React UI components (`SearchForm.tsx`, `ResultView.tsx`, `WikiSelector.tsx`).
	- **`services/`**: MediaWiki APIs interaction layer (`MediaWikiAPIs.ts`).
	- **`lib/`**: general libraries (`async-generator.ts`).
	- **`wiki.ts`**: Type definitions and constants related to Wikipedia sites.
	- **`state.ts`**: Type definitions for application state (e.g., `SearchState`).
	- **`App.tsx`**: Main application component, orchestrates state and components.
	- **`main.tsx`**: Application entry point.

## Deployment Details

- Configured for automatic deployment to GitHub Pages via GitHub Actions.
- Accessible at: https://[username].github.io/Wikipedia-Blame/ (Replace `[username]` with the actual GitHub username)
- Workflow file: `.github/workflows/deploy.yml`
- Automatically builds and deploys on pushes to the main branch.
- Uses the latest GitHub Pages deployment methods.
- Supports manual deployment via GitHub Actions workflow dispatch.

## Future Extensions

- Find first/last _deletion_ of text.
- Allow user selection to search further if multiple occurrences exist.
- Implement visual highlighting of the found text within the revision content.
- Support for additional Wikipedia languages.
- More robust error handling and user feedback.
