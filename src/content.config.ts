import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { file } from "astro/loaders";
import { GAME_GENRES, gameId } from "./scripts/games";
import { GENRES, albumEntries } from "./scripts/music";

const bunger = defineCollection({
	loader: file("src/media/bunger/metadata.json"),
	schema: ({ image }) =>
		z.object({
			path: image(),
			author: z.string(),
			date: z
				.string()
				.regex(/^\d{4}-\d{1,2}-\d{1,2}$/, "date must be YYYY-MM-DD")
				.transform((d) => {
					const [y, m, day] = d.split("-");
					return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
				}),
			type: z.enum([
				//
				"sticker",
				"fullbody",
				"halfbody",
				"icon",
				"sketch",
			]),
			price: z.number().nonnegative(),
			lightboxTitle: z.string(),
			lightboxDescription: z.string(),
		}),
});

// Music page songs. albums.json is grouped by genre; albumEntries() flattens it.
// `image()` paths are relative to the JSON file, so a missing cover fails the build.
const albums = defineCollection({
	loader: file("src/media/albumcovers/albums.json", {
		parser: (text) => albumEntries(JSON.parse(text)),
	}),
	schema: ({ image }) =>
		z.object({
			author: z.string(),
			song: z.string(),
			image: image(),
			genre: z.enum(GENRES),
			description: z.string().optional(),
		}),
});

// Gaming page: one entry per played game (src/data/games.json), mostly the Steam library export.
// Every field but the name may be unknown; a game needs an appId or a url to link to.
const games = defineCollection({
	loader: file("src/data/games.json", {
		parser: (text) =>
			(JSON.parse(text) as { name: string; appId?: number }[]).map((game) => ({ id: gameId(game), ...game })),
	}),
	schema: z
		.object({
			name: z.string(),
			/** Group in "Other games" (GAME_GENRES); leave out for games that fit none, listed under "Miscellaneous". */
			genre: z.enum(GAME_GENRES).optional(),
			/** Steam app ID; links to store.steampowered.com/app/<appId>. */
			appId: z.number().int().positive().optional(),
			/** Another page for the game (non-Steam store, stats profile); shown alongside the Steam link. */
			url: z.url().optional(),
			/** Playtime; only games with hours are ranked in "Most played". */
			hours: z.number().nonnegative().optional(),
			lastPlayed: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/, "lastPlayed must be YYYY-MM-DD")
				.optional(),
			achievements: z
				.string()
				.regex(/^\d+\/\d+$/, "achievements must look like 61/66")
				.optional(),
			/** Your own write-up, shown when the game's dropdown is opened. Markdown allowed. */
			notes: z.string().optional(),
		})
		.refine((game) => game.appId !== undefined || game.url !== undefined, "a game needs an appId or a url"),
});

export const collections = { bunger, albums, games };
