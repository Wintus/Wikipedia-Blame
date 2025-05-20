# ADR-001: Removal of Revision Sampling in Favor of Linear Streaming Search

## Status

**Accepted** (as of commit b2a1595c22ca03d1b4334f54f13473f6a88af188)

## Context

The previous search mechanism for finding text within Wikipedia page revisions employed a randomized sampling strategy, implemented in `src/utils/item-finder.ts`. This involved:

1. Fetching revision IDs.
2. Sampling these IDs to prioritize checking some revisions over others, with the aim of finding the target text faster in long revision histories.
3. Batch-fetching the content for these sampled revision IDs using a separate `fetchRevisionTexts` function.
4. A fallback mechanism to search remaining revisions if the target was not found in the sampled set.

This approach, while aiming for potential speedups in "lucky find" scenarios, introduced significant complexity into the codebase (e.g., `batchGenerator`, `mutBatchGen` for sampling, separate fetching of IDs then content). It also made search times less predictable.

## Decision

The randomized sampling logic for searching revisions has been removed. The new, simplified approach is:

1. **Unified Revision Data Fetching:** The `fetchAllRevisions` function in `src/services/MediaWikiAPIs.ts` now fetches both revision IDs and their main content simultaneously. This is achieved by requesting `rvprop: 'ids|content'` and `rvslots: 'main'` from the MediaWiki API. The function utilizes `@streamparser/json-whatwg` to parse the streaming JSON response, yielding `RevisionResult` objects (each containing `rev` ID and `text` content) as an `AsyncGenerator`.
2. **Linear Search with Generic Helper:** The `searchAction` in `src/actions/search.ts` now consumes this `AsyncGenerator` of `RevisionResult` objects directly. A new generic utility function, `genFindMap` (from the newly created `src/utils/async-generator.ts`), is used to iterate through the stream of revisions and apply a predicate to find the first revision matching the target text. This replaces the more complex `findOneOccurrence` and its associated sampling helpers from the now-deleted `src/utils/item-finder.ts`.
3. **Simplified Data Flow:** The intermediate step of fetching revision texts separately (the `fetchRevisionTexts` function) has been eliminated, as content is now part of the `RevisionResult` yielded by `fetchAllRevisions`.
4. **UI Consistency:** The "Search up to Rev ID" input field in `src/components/SearchForm.tsx` is no longer pre-populated with the previously found revision ID. This change aligns with the `revisionId` in the application state now storing the full `RevisionResult` object rather than just a numeric ID.
5. **Documentation Update:** Project documentation (`README.md`, `architecture-overview.md`) has been updated to reflect these changes.

## Consequences

### Positive

* **Reduced Code Complexity:** The most significant benefit is the removal of the `src/utils/item-finder.ts` module and its intricate sampling and batching logic, leading to a much simpler and more maintainable codebase.
* **Improved Predictability:** The search process is now a straightforward linear scan (either ascending or descending by revision date, as per user selection). While this might be slower for finding items very late in an extremely long history if sampling *had* been exceptionally lucky, the overall performance characteristics are more predictable and easier to reason about.
* **More Efficient Use of Streaming:** Revision content is fetched and processed within a single, unified streaming pipeline. This can improve memory efficiency and potentially reduce the total number of API requests compared to the previous multi-step process of fetching IDs then content in batches.
* **Simplified State Management:** The `searchAction` directly receives revisions complete with their content, simplifying the data flow to the search predicate.
* **Adherence to Functional Principles:** The introduction of `src/utils/async-generator.ts` provides generic, reusable functional helper functions (`genFindMap`, `mapGen`, `genFind`) for working with async generators, aligning well with the project's functional programming style guide.

### Negative

* **Potential for Slower "Lucky Finds":** In scenarios where the target text was located in a revision that the previous sampling mechanism might have picked very early, the new linear search could take longer if that revision is far down the chronological history. However, the overhead and complexity of the sampling mechanism itself are now eliminated.
* **Increased Data per Revision in Initial Fetch Stream:** Fetching content alongside IDs means that `fetchAllRevisions` processes more data per revision in its stream. However, given the use of streaming parsers and async generators, this should not significantly impact memory usage, provided consumers of the stream process items promptly.

### Neutral

* The core functionality of searching for text within Wikipedia page revisions is preserved.
* The application continues to leverage `AsyncGenerator` for efficient handling of potentially large datasets from the MediaWiki API.
