import { WIKI_SITES } from '../wiki';

type WikiSelectorProps = {
	selectedWiki?: string;
};

export function WikiSelector({ selectedWiki = 'enwp' }: WikiSelectorProps) {
	return (
		<div className="wiki-selector">
			<label htmlFor="wiki-select">Wiki Site:</label>
			<select id="wiki-select" name="wikiId" defaultValue={selectedWiki}>
				{Object.values(WIKI_SITES).map((wiki) => (
					<option key={wiki.id} value={wiki.id}>
						{wiki.name} ({wiki.url.hostname})
					</option>
				))}
			</select>
		</div>
	);
}
