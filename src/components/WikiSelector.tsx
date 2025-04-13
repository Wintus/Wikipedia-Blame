import { WIKI_SITES } from '../wiki';

export function WikiSelector() {
	return (
		<div className="wiki-selector">
			<label htmlFor="wiki-select">Wiki Site:</label>
			<select id="wiki-select" name="wikiId" defaultValue="enwp">
				{Object.values(WIKI_SITES).map((wiki) => (
					<option key={wiki.id} value={wiki.id}>
						{wiki.name} ({wiki.url.hostname})
					</option>
				))}
			</select>
		</div>
	);
}
