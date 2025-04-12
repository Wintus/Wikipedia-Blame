import { type SearchResult } from '../wiki';

type ResultViewProps = {
	result: SearchResult;
	isPending?: boolean;
};

/**
 * Gets the URL for a specific revision
 */
const getRevisionUrl = (wikiUrl: URL | string, revId: number): URL =>
	new URL(`/w/index.php?oldid=${revId}`, wikiUrl);

export function ResultView({ result, isPending }: ResultViewProps) {
	// guard
	if (isPending) {
		return <div className="result-view loading">Searching...</div>;
	} else if (result.error) {
		return <div className="result-view error">{result.error}</div>;
	} else if (result.revisionId == null) {
		return (
			<div className="result-view not-found">
				Text not found in the article's revision history.
			</div>
		);
	}

	const revisionUrl = getRevisionUrl(
		result.wiki.url,
		result.revisionId
	).toString();

	return (
		<div className="result-view success">
			<h3>An Occurrence Found</h3>
			<div className="result-details">
				<p>
					<strong>Article:</strong> {result.pageTitle.trim()}
				</p>
				<p>
					<strong>Text:</strong> "{result.targetText.trim()}"
				</p>
				<p>
					<strong>Revision ID:</strong> {result.revisionId}
				</p>
				<a
					href={revisionUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="revision-link"
				>
					View Revision
				</a>
			</div>
		</div>
	);
}
