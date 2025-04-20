import { type ChangeEvent } from 'react';
import { type WikiSite, WIKI_SITES } from '../wiki';

type WikiSelectorProps = {
	selectedWiki: WikiSite;
	onChange: (wiki: WikiSite) => void;
};

export function WikiSelector({ selectedWiki, onChange }: WikiSelectorProps) {
	const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
		const wikiId = e.target.value;
		const wiki = WIKI_SITES[wikiId.toUpperCase() as keyof typeof WIKI_SITES];
		if (wiki) {
			onChange(wiki);
		}
	};

	return (
		<div className="wiki-selector">
			<label htmlFor="wiki-id">Wiki Site:</label>
			<select
				id="wiki-id"
				name="wikiId"
				key={selectedWiki.id}
				defaultValue={selectedWiki.id}
				onChange={handleChange}
			>
				{Object.values(WIKI_SITES).map((wiki) => (
					<option key={wiki.id} value={wiki.id}>
						{wiki.name} ({wiki.url.hostname})
					</option>
				))}
			</select>
		</div>
	);
}
