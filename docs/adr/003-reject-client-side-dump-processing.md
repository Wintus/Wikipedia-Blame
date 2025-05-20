# ADR-003: Rejection of Client-Side Full Dump Processing for Revision History

## Status

**Rejected**

## Context

The project explored replacing direct MediaWiki API calls for fetching extensive page revision history with a method utilizing Wikipedia's `pages-meta-history` XML dumps. The proposed client-side workflow involved:
1. Identifying the latest available dump.
2. Determining the specific dump file chunk (e.g., `enwiki-latest-pages-meta-history1.xml-p1p812.bz2`, typically 1–2.5GB in size) containing the target page's history.
3. The client application would then download this `.xml.bz2` file.
4. Subsequently, the client would stream-decompress the bz2-compressed data and stream-parse the XML content to extract and search through revisions for a specific page.

This approach was considered as a potential alternative to the existing API-based revision fetching, aiming to reduce reliance on potentially rate-limited or "discouraged" patterns of API usage for bulk data.

## Decision

The approach of client-side downloading and processing of full `pages-meta-history` dump file chunks is **rejected**.

The primary and decisive reason for this rejection is the **prohibitively slow download speed** observed when fetching these large dump files. Test downloads (e.g., a ~2.5GB file at <1MB/s) indicated that the download phase alone would take an unacceptably long time for an interactive, "on-the-fly" search feature. This makes the user experience untenable.

While client-side streaming decompression (bz2) and XML parsing are technically feasible, the initial download bottleneck prevents this approach from being practical.

## Consequences

### Positive

* **Avoids Poor User Experience:** Users will not be subjected to extremely long, multi-minute (or even hour-long) download times before any processing can begin.
* **Reduces Client Resource Burden:** Avoids imposing high bandwidth consumption on users. Also, by not proceeding, the significant client-side CPU and memory load required for decompressing and parsing multi-gigabyte files is also avoided.
* **Maintains Application Responsiveness:** The client application remains lighter and more responsive by not attempting such a resource-intensive task.

### Negative

* **Alternative Solution Still Needed:** The challenge of efficiently and robustly fetching/searching extensive revision histories, potentially as an alternative to current API methods, remains unresolved by this decision.
* **Cannot Leverage Full Dumps Client-Side:** The application cannot directly utilize the comprehensive historical data available in these dumps via a purely client-side mechanism as initially envisioned.

### Neutral / Next Steps

* The project must continue to rely on the existing MediaWiki API for revision data or explore other alternatives. These alternatives might include:
	* Further optimization of MediaWiki API usage (as explored in ADR-001 and ADR-002).
	* Investigating server-assisted processing of dumps, where a backend service handles dump access and querying.
	* Exploring different, perhaps more specialized, Wikimedia APIs or data services if available.
	* Potentially adjusting the scope or goals of features requiring deep historical revision search.
* This decision highlights the critical importance of considering network performance and data transfer times when designing client-side features that interact with large remote datasets.
