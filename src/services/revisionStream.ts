/**
 * Decoding of one Action API response body into revisions and a paging cursor.
 *
 * The stream is the boundary between the JSON parser and the paging loop:
 * `fetchAllRevisions` in `MediaWikiAPIs.ts` folds these events, so neither the
 * parser stack nor the response body shape leaks into the caller.
 */

import { JSONParser } from '@streamparser/json-whatwg';

/**
 * One revision with the text the search needs.
 *
 * `rev` is the MediaWiki revision ID; `text` is the raw wikitext of the
 * revision's `main` slot.
 */
export type RevisionResult = {
	rev: number;
	text: string;
};

/**
 * One emission of `decodeRevisions`.
 *
 * An Action API response interleaves revisions with a paging cursor, so the
 * decoder tags both: a revision event is a `RevisionResult` plus its tag, and a
 * cursor event carries the token for the next page. The caller folds them into
 * a page of results plus that token.
 */
export type RevisionEvent =
	| ({ type: 'revision' } & RevisionResult)
	| { type: 'cursor'; token: string };

/**
 * The part of a revision that `decodeRevisions` reads.
 *
 * `slots` is absent when the revision carries no slots, and `content` is absent
 * when the text was deleted or suppressed. Extra fields are ignored.
 */
type RevisionShape = {
	revid: number;
	slots?: { main?: { content?: string } };
};

/**
 * Returns true when the emitted value is a revision object.
 *
 * Only `revid` is checked here; the remaining fields are read through optional
 * chaining in `toRevisionResult`, so a revision that lacks content still passes
 * the guard and is skipped by the converter rather than rejected.
 */
const isRevision = (value: unknown): value is RevisionShape =>
	typeof value === 'object' &&
	value !== null &&
	'revid' in value &&
	typeof value.revid === 'number';

/**
 * Converts a revision into the stream item, or null when it has no text.
 *
 * Total by construction: an empty string is content and is kept, while an
 * absent `slots.main.content` (deleted or suppressed text) yields null.
 */
const toRevisionResult = (revision: RevisionShape): RevisionResult | null => {
	const content = revision.slots?.main?.content;
	return typeof content === 'string'
		? { rev: revision.revid, text: content }
		: null;
};

/**
 * Decodes one Action API response body into revision and cursor events.
 *
 * Two paths are matched: `$.continue.rvcontinue` emits the paging cursor as a
 * string, and `$.query.pages.*.revisions.*` emits each revision object whole.
 * A revision element's `key` is its array index, so the kind of event is
 * decided by the shape of `value`, not by `key`.
 *
 * `keepStack` is off on purpose. `@streamparser/json-whatwg` deep-clones
 * `stack` and `parent` for every emission, so a retained stack re-clones the
 * revisions parsed so far on each revision emission, which is quadratic in the
 * batch size. Matched containers keep their children, so each revision still
 * arrives complete.
 *
 * The generator never throws on a shape MediaWiki returns: a revision without
 * `slots.main.content` is skipped. Stopping the iteration early cancels the
 * body stream, which stops the download.
 *
 * @param body - The `body` of a `fetch` response to the Action API.
 */
export async function* decodeRevisions(
	body: ReadableStream<Uint8Array>,
): AsyncGenerator<RevisionEvent, void, unknown> {
	const parser = new JSONParser({
		paths: ['$.continue.rvcontinue', '$.query.pages.*.revisions.*'],
		keepStack: false,
	});
	const events = body.pipeThrough(parser);
	for await (const { value } of events) {
		if (typeof value === 'string') {
			yield { type: 'cursor', token: value };
		} else if (isRevision(value)) {
			const revision = toRevisionResult(value);
			if (revision != null) {
				yield { type: 'revision', ...revision };
			}
		}
	}
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	const encoder = new TextEncoder();

	const streamOf = (
		chunks: ReadonlyArray<Uint8Array>,
	): ReadableStream<Uint8Array> =>
		new ReadableStream({
			start(controller) {
				for (const chunk of chunks) {
					controller.enqueue(chunk);
				}
				controller.close();
			},
		});

	const bytes = (text: string): ReadonlyArray<Uint8Array> => [
		encoder.encode(text),
	];

	const chunksOf = (text: string, size: number): ReadonlyArray<Uint8Array> => {
		const all = encoder.encode(text);
		const chunks: Array<Uint8Array> = [];
		for (let offset = 0; offset < all.length; offset += size) {
			chunks.push(all.slice(offset, offset + size));
		}
		return chunks;
	};

	const collect = async (
		chunks: ReadonlyArray<Uint8Array>,
	): Promise<ReadonlyArray<RevisionEvent>> =>
		Array.fromAsync(decodeRevisions(streamOf(chunks)));

	const revision = (revid: number, content?: string) => ({
		revid,
		parentid: revid - 1,
		user: 'Example',
		timestamp: '2020-01-01T00:00:00Z',
		slots: {
			main: {
				contentmodel: 'wikitext',
				contentformat: 'text/x-wiki',
				sha1: 'sha1',
				...(content == null ? {} : { content }),
			},
		},
	});

	const page = (pageid: number, revisions: ReadonlyArray<object>) => ({
		pageid,
		ns: 0,
		title: `Page ${pageid}`,
		revisions,
	});

	const response = (
		pages: ReadonlyArray<object>,
		token?: string,
	): Readonly<Record<string, unknown>> => ({
		batchcomplete: true,
		query: { pages },
		...(token == null ? {} : { continue: { rvcontinue: token } }),
	});

	describe('decodeRevisions', () => {
		it('yields every revision of every page in order', async () => {
			const events = await collect(
				bytes(
					JSON.stringify(
						response([
							page(1, [revision(10, 'first'), revision(11, 'second')]),
							page(2, [revision(20, 'third')]),
						]),
					),
				),
			);

			expect(events).toEqual<ReadonlyArray<RevisionEvent>>([
				{ type: 'revision', rev: 10, text: 'first' },
				{ type: 'revision', rev: 11, text: 'second' },
				{ type: 'revision', rev: 20, text: 'third' },
			]);
		});

		it('yields the cursor alongside the revisions', async () => {
			const events = await collect(
				bytes(
					JSON.stringify(
						response([page(1, [revision(10, 'text')])], 'next-token'),
					),
				),
			);

			expect(events).toEqual<ReadonlyArray<RevisionEvent>>([
				{ type: 'revision', rev: 10, text: 'text' },
				{ type: 'cursor', token: 'next-token' },
			]);
		});

		it('reads the same revisions when a token is split across chunks', async () => {
			const json = JSON.stringify(
				response(
					[page(1, [revision(10, 'first'), revision(11, 'second')])],
					't',
				),
			);

			const events = await collect(chunksOf(json, 7));

			expect(events).toEqual<ReadonlyArray<RevisionEvent>>([
				{ type: 'revision', rev: 10, text: 'first' },
				{ type: 'revision', rev: 11, text: 'second' },
				{ type: 'cursor', token: 't' },
			]);
		});

		it('keeps multibyte text intact when a character spans chunks', async () => {
			const json = JSON.stringify(
				response([page(1, [revision(10, '日本語の本文')])]),
			);

			// Three-byte characters, split so that most chunks cut a character.
			const events = await collect(chunksOf(json, 2));

			expect(events).toEqual<ReadonlyArray<RevisionEvent>>([
				{ type: 'revision', rev: 10, text: '日本語の本文' },
			]);
		});

		it('skips revisions without content but keeps an empty string', async () => {
			const withoutContent = revision(1);
			const events = await collect(
				bytes(
					JSON.stringify(
						response([
							page(1, [
								withoutContent,
								{ revid: 2 },
								revision(3, ''),
								revision(4, 'text'),
							]),
						]),
					),
				),
			);

			expect(events).toEqual<ReadonlyArray<RevisionEvent>>([
				{ type: 'revision', rev: 3, text: '' },
				{ type: 'revision', rev: 4, text: 'text' },
			]);
		});

		it('ignores sibling keys at every level', async () => {
			const payload = {
				batchcomplete: '',
				continue: { rvcontinue: 'token', continue: '||' },
				warnings: {
					main: { warnings: 'Unrecognized parameter: rvslots.' },
				},
				query: {
					pages: [
						{
							pageid: 123,
							ns: 0,
							title: 'Test Page',
							revisions: [
								{
									revid: 10,
									parentid: 9,
									user: 'Example',
									timestamp: '2020-01-01T00:00:00Z',
									comment: 'edit summary',
									slots: {
										main: {
											contentmodel: 'wikitext',
											contentformat: 'text/x-wiki',
											content: 'text',
										},
									},
								},
							],
						},
					],
				},
			};

			const events = await collect(bytes(JSON.stringify(payload)));

			// The cursor precedes `query` in this payload; the fold must not
			// depend on which event comes first.
			const expectedRevision: RevisionEvent = {
				type: 'revision',
				rev: 10,
				text: 'text',
			};
			const expectedCursor: RevisionEvent = {
				type: 'cursor',
				token: 'token',
			};
			expect(events).toHaveLength(2);
			expect(events).toContainEqual(expectedRevision);
			expect(events).toContainEqual(expectedCursor);
		});

		it('yields nothing for a response without revisions', async () => {
			const events = await collect(
				bytes(JSON.stringify({ batchcomplete: '' })),
			);

			expect(events).toEqual<ReadonlyArray<RevisionEvent>>([]);
		});
	});
}
