import { SearchResult } from '../types';

type ResultViewProps = {
	result: SearchResult;
};

/**
 * Gets the URL for a specific revision
 */
const getRevisionUrl = (revId: number, lang: WikiLanguage = 'en'): string =>
	`https://${lang}.wikipedia.org/w/index.php?oldid=${revId}`;

export function ResultView({ result }: ResultViewProps) {
	if (result.loading) {
		return <div className="result-view loading">Searching...</div>;
	}

	if (result.error) {
		return <div className="result-view error">{result.error}</div>;
	}

	if (result.revisionId == null) {
		return (
			<div className="result-view not-found">
				Text not found in the article's revision history.
			</div>
		);
	}

	const revisionUrl = getRevisionUrl(result.revisionId, result.language);

	return (
		<div className="result-view success">
			<h3>An Occurrence Found</h3>
			<div className="result-details">
				<p>
					<strong>Article:</strong> {result.pageTitle}
				</p>
				<p>
					<strong>Text:</strong> "{result.targetText}"
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
