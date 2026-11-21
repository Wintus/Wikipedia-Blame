# Wikipedia-Blame

A tool for finding when specific text first appeared in a Wikipedia article's history, similar to git blame functionality.

**Live:** https://wintus.github.io/Wikipedia-Blame/

## Overview

Wikipedia-Blame walks a page's revision history in order and stops at the first revision whose text contains what you entered. It talks to the MediaWiki APIs directly from the browser and streams the history, so long articles do not need to fit in memory.

## Features

- Search the full revision history, oldest first or newest first.
- Limit the range with an optional start revision ID and/or end revision ID.
- Resolve the article title before searching; a missing page or a failed lookup is reported next to the input, with a retry button.
- Open the matching revision as a diff against the neighbouring change.
- Works with English and Japanese Wikipedia.

## Getting Started

Requires Node.js 22.12 or newer (see `engines` in `package.json`).

```sh
npm ci
npm run dev
npm test
npm run build
```

## Technical Stack

- React v19 (`useActionState`)
- React Compiler
- TypeScript
- Vite for build tooling
- MediaWiki APIs (REST API for page ID, Query API for revisions)
- TanStack Query and Pacer (page ID lookup, input debouncing)
- Standard CSS for styling
- GitHub Pages for hosting

## Documentation

- [Architecture overview](docs/architecture-overview.md) — how a search travels from the form to a revision ID.
- [Implementation notes](docs/implementation-notes.md) — cross-module contracts below the architecture level.
- [Architecture decision records](docs/adr/) — why the search, caching and data fetching look the way they do.
- [Testing](docs/testing.md) — in-source test conventions.
- [Functional style](docs/functional-style.md) — how code in this repository is written.
