# Wikipedia Blame Implementation Notes

## Search Algorithm Implementation

- Randomized sampling approach (10% of revisions or at least 5 revisions) for efficiency
- Fallback to exhaustive batch search when needed
- Parallel fetching of revisions using Promise.all to improve performance
- Fisher-Yates shuffle algorithm for randomized sampling

## Key Components

### WikipediaAPI Service

```typescript
// Core functions for interacting with Wikipedia API
async getRevisionTexts(revIds: ReadonlyArray<number>, lang: WikiLanguage = 'en'): Promise<ReadonlyArray<RevisionResult>>
async getAllRevisions(pageTitle: string, lang: WikiLanguage = 'en'): Promise<ReadonlyArray<number>>
```

### RevisionFinder Utility

```typescript
// Non-destructive Fisher-Yates shuffle
function shuffleArray<T>(array: ReadonlyArray<T>): ReadonlyArray<T>;

// Main search function with sampling approach
async function findOneOccurrence(
	targetText: string,
	revList: ReadonlyArray<number>,
	lang: WikiLanguage = 'en'
): Promise<number | null>;

// Fallback exhaustive search
async function exhaustiveSearch(
	revList: ReadonlyArray<number>,
	targetText: string,
	lang: WikiLanguage = 'en'
): Promise<number | null>;
```

### React Components

- **SearchForm**: Handles user input with trimming on change
- **LanguageSelector**: Toggles between English and Japanese Wikipedia with base URLs displayed
- **ResultView**: Displays search results with links to the specific revision

## Technical Decisions

- Used ReadonlyArray for better immutability throughout the codebase
- Implemented trimming of input strings on change rather than just on submit
- Added language selector with base URLs displayed for clarity (en.wikipedia.org/ja.wikipedia.org)
- Structured the app as a minimal SPA without router or complex frameworks
- Used TypeScript types instead of interfaces for consistency

## Implementation Progress

- Core functionality for finding one text occurrence implemented
- Basic UI with search form and results display
- CSS styling with CSS variables for theming and responsive design
- Error handling for API calls and search process

## Future Work

- Implement tests using real Wikipedia endpoints (with mocking)
- Add functionality to find first/last addition/deletion of text
- Add user selection to search further
- Implement find first/last occurrence of text
- Add visual highlighting of changes
