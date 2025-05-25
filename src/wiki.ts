/**
 * Type and data for MediaWiki wikis
 */

type WikiSite = {
	id: string;
	name: string;
	url: URL;
};

export const WIKI_SITES = [
	{
		id: 'enwp',
		name: 'English Wikipedia',
		url: new URL('https://en.wikipedia.org'),
	},
	{
		id: 'jawp',
		name: 'Japanese Wikipedia',
		url: new URL('https://ja.wikipedia.org'),
	},
] as const satisfies ReadonlyArray<WikiSite>;
