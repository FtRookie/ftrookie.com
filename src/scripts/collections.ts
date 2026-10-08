import { getCollection, type CollectionKey } from "astro:content";

/**
 * getCollection() that fails loudly when entries are missing. `astro build` already stops on
 * a schema error, but `astro dev` only logs it once and serves the collection without the
 * invalid entries. Comparing against the source IDs turns that silent drop into an error
 * overlay in the browser.
 * @param sourceIds Every entry ID in the collection's source data (e.g. metadata.json).
 */
export async function getCompleteCollection<C extends CollectionKey>(name: C, sourceIds: string[]) {
	const entries = await getCollection(name);
	const loaded = new Set(entries.map((entry) => entry.id));
	const missing = sourceIds.filter((id) => !loaded.has(id));
	if (missing.length > 0) {
		throw new Error(
			`${missing.length} "${name}" ${missing.length === 1 ? "entry" : "entries"} failed schema validation ` +
				`and would be dropped: ${missing.join(", ")}. The terminal shows the exact field errors ` +
				`(InvalidContentEntryDataError); fix the data or the schema in src/content.config.ts.`,
		);
	}
	return entries;
}
