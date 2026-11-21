# Implementation Notes

Cross-module implementation contracts that are too detailed for
`docs/architecture-overview.md` but shared by more than one module. Decisions and
their rationale live in `docs/adr/`; local mechanics live next to the code they
describe.

## Revision stream (`fetchAllRevisions`)

The search action consumes `fetchAllRevisions` as an async generator of
`{ rev, text }` items. The contract covers how the generator pages through the
Action API and what shape it reads from the JSON stream.

### Action API paging

- Request parameters: `action=query`, `prop=revisions`,
  `rvprop=ids|content`, `rvslots=main`, `rvlimit=max`, `formatversion=2`,
  `format=json` and `origin=*`.
- `rvdir` is `newer` for ascending order and `older` for descending.
- Optional bounds are sent as `rvstartid` and `rvendid`.
- The response's `continue.rvcontinue` token is sent back as `rvcontinue` on the
  next request. The loop ends at `batchcomplete` or when a response carries no
  continuation token.

### Parser input shape

Each response body is piped through `@streamparser/json-whatwg` with three
paths:

- `$.batchcomplete` clears the continuation cursor.
- `$.continue.rvcontinue` stores the next cursor.
- `$.query.pages.*.revisions.*.slots.main.content` yields one text per revision.

A `content` event is converted with the revision that encloses it, so the
generator yields `{ rev: revid, text: content }` without materialising a whole
response body.
