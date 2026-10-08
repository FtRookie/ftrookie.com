// Shared by the `albums` content collection (src/content.config.ts) and the music page.
// Data lives in src/media/albumcovers/albums.json, grouped by genre:
//   { "EDM": [{ "author": "KaNa", "song": "Mimage", "image": "Mimage.jpg" }], … }

/** Display order of the genre groups; a genre key in albums.json must be one of these. */
export const GENRES = ["EDM", "Pop", "Rap", "Funk Wav", "Hardstyle/Hardbass", "Post-punk Rock", "Other"] as const;

export type Genre = (typeof GENRES)[number];

/** One song as written in albums.json. */
export interface AlbumSource {
	author: string;
	song: string;
	/** Cover filename in src/media/albumcovers/. */
	image: string;
	/** Optional small caption shown under the song title. */
	description?: string;
}

/**
 * Flattens the genre-grouped JSON into collection entries, keeping file order. Genre keys
 * are not checked here; the collection schema rejects unknown ones.
 */
export function albumEntries(data: Record<string, AlbumSource[]>) {
	return Object.entries(data).flatMap(([genre, songs]) =>
		songs.map((song) => ({
			id: `${genre}/${song.author}/${song.song}`.toLowerCase().replace(/[^\p{L}\p{N}/]+/gu, "-"),
			genre,
			...song,
		})),
	);
}
