import { ChangeEvent } from 'react';
import { WikiSite, WIKI_SITES } from '../wiki';

type WikiSelectorProps = {
	selectedWiki: WikiSite;
	onChange: (wiki: WikiSite) => void;
};

export function WikiSelector({ selectedWiki, onChange }: WikiSelectorProps) {
	const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
		const wikiId = e.target.value;
		const wiki = Object.values(WIKI_SITES).find((w) => w.id === wikiId);
		if (wiki) {
			onChange(wiki);
		}
	};

	return (
		<div className="wiki-selector">
			<label htmlFor="wiki-select">Wiki Site:</label>
			<select id="wiki-select" value={selectedWiki.id} onChange={handleChange}>
				{Object.values(WIKI_SITES).map((wiki) => (
					<option key={wiki.id} value={wiki.id}>
						{wiki.name} ({wiki.url.hostname})
					</option>
				))}
			</select>
		</div>
	);
}
