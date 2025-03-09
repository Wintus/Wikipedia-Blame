# Testing Plan for Wikipedia-Blame

## Overview

This document outlines our testing strategy using Google's Test Sizing terminology.
We'll focus on implementing tests for the current codebase with a pragmatic approach to coverage.

## Test Categories

### Small Tests
**Target:** `utils/*.ts` files (`RevisionFinder.ts`)

- **shuffleArray**
	- Verify non-mutation of original array
	- Verify all elements are preserved
	- Handle edge cases (empty arrays, single elements)

- **findOneOccurrence**
	- Test sampling strategy success path
	- Test fallback to exhaustive search
	- Test negative cases (not found, empty lists)

- **exhaustiveSearch**
	- Test batch processing logic
	- Test success and failure cases

### Medium Tests
**Target:** `services/*.ts` files (`WikipediaAPI.ts`)

- **API Methods**
	- Mock fetch responses to test parsing logic
	- Test error handling
	- Verify URL formation and parameter handling
	- Test pagination for getAllRevisions

### Large Tests
**Target:** `components/*.tsx` files

- **Simple Rendering Tests**
	- Verify components render without errors
	- Test basic conditional rendering logic

- **Snapshot Tests**
	- Capture component output for different states
	- Focus on key UI states (loading, error, success)

## Implementation Plan

1. **Setup Testing Environment**
	- Install Vitest and related libraries
	- Configure test scripts in `package.json`

2. **Implement Tests by Priority**
	- Start with Small Tests (utils)
	- Proceed to Medium Tests (services)
	- Finish with Large Tests (components)

## Testing Stack

- **Vitest**: Testing framework for Vite projects
- **@testing-library/react**: For React component testing
- **@testing-library/jest-dom**: For DOM assertions
- **happy-dom**: For DOM simulation

## Folder Structure

```
src/
	utils/
		__tests__/
			RevisionFinder.test.ts
	services/
		__tests__/
			WikipediaAPI.test.ts
	components/
		__tests__/
			LanguageSelector.test.tsx
			ResultView.test.tsx
			SearchForm.test.tsx
```

## Next Steps

After implementing the initial test suite, we can evaluate coverage and identify areas that need additional testing.
