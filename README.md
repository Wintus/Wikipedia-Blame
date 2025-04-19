# Wikipedia-Blame

A tool for finding when specific text first appeared in a Wikipedia article's history, similar to git blame functionality.

## Project Overview

Wikipedia-Blame is a React-based single-page application that helps users identify the revision where specific text was introduced into a Wikipedia article. It leverages the Wikipedia API and an efficient search algorithm to analyze revision history.

The application utilizes modern React features, specifically the `useActionState` hook, for streamlined form handling and state management.

### Features

- Search for the first occurrence of text across all revisions of a Wikipedia article.
- Support for both English (en.wikipedia.org) and Japanese (ja.wikipedia.org) Wikipedia.
- Efficient search algorithm:
	- Fetches revision IDs using an async generator to handle potentially long histories without loading everything at once.
	- Uses randomized sampling (`item-finder.ts`) to prioritize checking likely revisions first.
	- Fetches revision content in batches (up to 50) as needed.
- Direct links to the specific revision where the text was found.
- Clear indication of loading states managed by `useActionState`.

## Technical Stack

- React v19 (`useActionState`)
- TypeScript
- Vite for build tooling
- Wikipedia API (REST API for page ID, Query API for revisions)
- CSS Modules / Standard CSS for styling
- GitHub Pages for hosting

## Technical Overview

The application employs an action-state driven architecture centered around React's `useActionState` hook:

1. **Form Submission:** The `SearchForm` component uses a form action (`searchAction`) provided by `useActionState`.
2. **Action Execution (`searchActions.ts`):**
	- The `searchAction` function receives form data and the previous state.
	- It validates input and fetches the Wikipedia page ID using `fetchPageId` (`WikipediaAPI.ts`).
	- It initiates fetching all revision IDs using the `fetchAllRevisions` async generator (`WikipediaAPI.ts`).
	- It calls `findOneOccurrence` (`item-finder.ts`), passing the revision ID generator, a function to fetch revision text (`fetchRevisionTexts`), and a predicate to check for the target text.
3. **Search Algorithm (`item-finder.ts`):**
	- `findOneOccurrence` consumes revision IDs from the generator.
	- `itemGenerator` implements a sampling strategy, buffering IDs and yielding batches for checking based on frequency (sampling vs. fallback).
	- `fetchInBatch` calls `fetchRevisionTexts` for required batches.
	- The predicate checks the fetched text content.
4. **State Update:** `searchAction` returns the new `SearchState` (including the found `revisionId` or an error). `useActionState` updates the application state.
5. **UI Rendering:** `App.tsx` passes the `searchResult` and `isPending` status to `ResultView.tsx` for display.

This approach collocates data fetching and state logic within the action, simplifying component responsibilities and leveraging React's built-in pending state management. See `architecture-overview.md` for a visual flow diagram.

## Project Structure

- **`src/`**: Main source code directory.
	- **`actions/`**: Contains the `useActionState` action logic (`searchActions.ts`).
	- **`components/`**: React UI components (`SearchForm.tsx`, `ResultView.tsx`, `WikiSelector.tsx`).
	- **`services/`**: Wikipedia API interaction layer (`WikipediaAPI.ts`).
	- **`utils/`**: Core search algorithm logic (`item-finder.ts`).
	- **`wiki.ts`**: Type definitions and constants related to Wikipedia sites/search state.
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
- Advanced caching strategies.
