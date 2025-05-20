# ADR-002: Enable Client-Side Caching for MediaWiki API Requests

## Status

**Accepted** (as of commit 9be13c0f612d9cce583428ff94ae79b099ce1f88)

## Context

The application frequently fetches revision data from the MediaWiki API, especially when users perform searches or iterate through revision histories. Previously, no explicit client-side caching directives were sent with these API requests. This could lead to redundant data fetching if the same revision data was requested multiple times in short succession, potentially increasing load on the MediaWiki servers and leading to slower response times for the user if the data hadn't changed.

## Decision

Client-side caching hints have been enabled for API requests made by the `fetchAllRevisions` function in `src/services/MediaWikiAPIs.ts`. This is achieved by adding the `maxage` parameter to the API query.

The caching strategy is as follows:
1. **initial fetch of latest revisions:** When fetching the last page of revisions (i.e., `continueParam` is null when fetching in descending order; order is 'desc', implying fetching older revisions from the latest), a `maxage` of `60` seconds (1 minute) is set. This provides a short cache duration for the most recent data.
2. **continuation fetches (or fetching earliest revisions):** When fetching subsequent pages of revisions (i.e., `continueParam` has a value) or when fetching in ascending order (order is 'asc', implying fetching from the earliest revisions towards newer ones), a `maxage` of `600` seconds (10 minutes) is set. This allows for a longer cache duration for historical data, which is less likely to change frequently.

The `fetchPageId` function, which fetches page metadata, does not appear to have caching explicitly added in this commit, but the primary focus of this change is on the more data-intensive `fetchAllRevisions` calls.

## Consequences

### Positive

* **Reduced API Load:** By instructing clients (and potentially intermediate proxies) to cache responses, the number of direct requests hitting the MediaWiki API servers can be reduced, especially for frequently accessed or historical data.
* **Improved Perceived Performance:** For subsequent requests within the `maxage` window, users may experience faster load times as the data can be served from a local or proxy cache.
* **Better Network Efficiency:** Less redundant data is transferred over the network.
* **Simple Implementation:** The change involves adding a single parameter to the API request, making it a low-complexity way to introduce caching benefits.

### Negative

* **Potential for Stale Data (within cache duration):** Users might see slightly stale data if a page is updated on Wikipedia and they re-request it within the `maxage` window. The chosen `maxage` values (1 minute for recent, 10 minutes for older/continuations) attempt to balance freshness with caching benefits.
* **Cache Behavior Dependent on Client/Proxy:** The actual caching behavior depends on the client's browser and any intermediate caching proxies respecting the `Cache-Control: max-age` HTTP header (which `maxage` typically translates to).

### Neutral

* This change primarily affects the data fetching layer and should not directly impact other parts of the application logic.
* The core search functionality remains unchanged.
