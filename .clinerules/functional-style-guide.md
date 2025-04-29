# Functional Programming Style Guide

This guide outlines the preferred functional programming practices for this project based on established patterns.

## Core Principles

1. **Pure Functions Over Classes**

	- Prefer standalone functions over class methods
	- Export individual functions rather than object/class collections
	- Example: Using `export function fetchAllRevisions()` instead of `MediaWikiAPIs.getAllRevisions()`

2. **Dependency Injection**

	- Pass dependencies explicitly as function parameters
	- Avoid direct imports within functions when the dependency can be injected
	- Example: `function findOneOccurrence(targetText, fetcher, revisions)` instead of directly using MediaWikiAPIs

3. **Function Composition**

	- Build complex operations from small, reusable functions
	- Use function composition to create data processing pipelines
	- Example: `const revisions = getPageRevisions(data).map(convert)`

4. **Immutability**

	- Treat data as immutable whenever possible
	- Create new objects/arrays instead of modifying existing ones
	- Use ReadonlyArray<T> type for parameters to signal immutability
	- Example: `const shuffled = [...array]; // Shallow copy to avoid modifying the original array`

5. **Type Safety**

	- Use explicit TypeScript types and interfaces
	- Leverage const assertions and satisfies operators
	- Create default constants for complex objects
	- Example: `export const initSearchState = {...} as const satisfies SearchState`

6. **Single Responsibility**

	- Each function should do one thing and do it well
	- Extract helper functions for reusable logic
	- Example: Splitting sampling logic into its own function

7. **Generator Functions**

	- Use generator functions for lazy evaluation of sequences
	- Example: `function* batches<T>(batchSize, array): Generator<ReadonlyArray<T>>`

8. **Utilities and Composition**
	- Create small utility functions that can be composed together
	- Extract common patterns into reusable functions
	- Example: `const getBaseUrl = (lang) => \`https://\${lang}.wikipedia.org/w/\``

## Anti-patterns to Avoid

1. ❌ Large classes with multiple responsibilities
2. ❌ Direct dependencies between modules without injection
3. ❌ Mutating function parameters
4. ❌ Overly complex functions that handle multiple concerns
5. ❌ Using object-oriented patterns when functional would be clearer
