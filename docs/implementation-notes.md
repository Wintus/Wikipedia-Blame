# Implementation Notes

Cross-module implementation contracts that are too detailed for `docs/architecture-overview.md` but shared by more than one module. Decisions and their rationale live in `docs/adr/`; local mechanics live next to the code they describe.

## Revision stream (`fetchAllRevisions`)

The search action consumes `fetchAllRevisions` as an async generator of `{ rev, text }` items. The contract covers how the generator pages through the Action API and what shape it reads from the JSON stream.

### Action API paging

- Request parameters: `action=query`, `prop=revisions`, `rvprop=ids|content`, `rvslots=main`, `rvlimit=max`, `formatversion=2`, `format=json` and `origin=*`.
- `rvdir` is `newer` for ascending order and `older` for descending.
- Optional bounds are sent as `rvstartid` and `rvendid`.
- The response's `continue.rvcontinue` token is sent back as `rvcontinue` on the next request. The cursor is cleared at the start of each request and set only when a continuation token arrives, so the loop ends when a response carries none. `batchcomplete` does not end paging: MediaWiki can return it alongside `continue`.

### Parser input shape

`decodeRevisions` (`src/services/revisionStream.ts`) pipes each response body through `@streamparser/json-whatwg` with two paths and `keepStack: false`:

- `$.continue.rvcontinue` emits the next cursor as a string.
- `$.query.pages.*.revisions.*` emits each revision object whole.

The kind of event is decided by the shape of the emitted value, not by `key`, because a revision element's `key` is its array index. `decodeRevisions` tags the emissions as `{ type: 'revision', rev, text }` or `{ type: 'cursor', token }`, and `fetchAllRevisions` folds them, so no parser detail reaches the caller.

`keepStack: false` is a performance requirement, not a tunable default: the WHATWG wrapper deep-clones `stack` and `parent` for every emission, so a retained stack re-clones the revisions parsed so far on each revision emission, which is quadratic in the batch size. Matched containers keep their children, so a revision still arrives complete. The rationale lives next to the option in `revisionStream.ts`.

A revision without `slots.main.content` (deleted or suppressed text) is skipped rather than thrown on; an empty string is content and is yielded.

Stopping the iteration early cancels the body stream, so a match found before the end of a batch also stops the download.

A failure inside the loop (request or parser) propagates out of the generator, which stays free of logging. `findMap` stops at the first match, so a match found before the failure still wins; a failure before any match reaches `searchAction`, which logs it and returns the `error` outcome.
