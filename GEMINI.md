# Gemini Project Context: Wikipedia-Blame

This document provides context for the Gemini CLI to understand the Wikipedia-Blame project.

## Project Overview

Wikipedia-Blame is a single-page application built with React and TypeScript. Its primary purpose is to find the first appearance of a specific string of text within the revision history of a Wikipedia article. It is similar in concept to `git blame`.

The application is hosted on GitHub Pages and uses Vite for its build tooling.

### Core Technologies

- **Frontend:** React 19, TypeScript
- **Build Tool:** Vite
- **Linting:** ESLint
- **Formatting:** Prettier
- **Testing:** Vitest with happy-dom
- **State Management:** React's `useActionState` hook is central to the application's architecture.

## Project Structure

- `src/`: Contains all the source code.
	- `main.tsx`: The application entry point.
	- `App.tsx`: The main application component.
	- `actions/search.ts`: Contains the core `searchAction` logic used with `useActionState`.
	- `components/`: Contains the React components.
		- `SearchForm.tsx`: The main form for user input.
		- `ResultView.tsx`: Displays the search results.
	- `services/MediaWikiAPIs.ts`: Handles all interactions with the MediaWiki APIs.
	- `lib/async-generator.ts`: Contains helper functions for working with async generators.
	- `state.ts`: Type definitions for the application state.
	- `wiki.ts`: Constants and types related to Wikipedia.

## Key Architectural Decisions (ADRs)

1. **ADR-001: Linear Streaming Search:** The project moved from a complex revision sampling algorithm to a simpler, more predictable linear search. It now streams revision content directly from the MediaWiki API, which is more efficient and less complex.
2. **ADR-002: API Caching:** The application enables client-side caching for MediaWiki API requests to reduce redundant data fetching and improve perceived performance.
3. **ADR-003: Rejection of Client-Side Dump Processing:** An exploration into using full Wikipedia history dumps on the client-side was rejected due to the prohibitively slow download speeds of the large dump files.

## Development Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Lints the codebase.
- `npm run test`: Runs the test suite.
- `npm run format`: Formats the code with Prettier.

## How to Contribute

1. Make changes to the code.
2. Ensure all tests pass (`npm run test`).
3. Ensure the code is linted (`npm run lint`) and formatted (`npm run format`).
4. Create a pull request.
