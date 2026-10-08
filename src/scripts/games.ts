/** Groups for "Other games", in display order. Games with no genre are listed last, under "Miscellaneous". */
export const GAME_GENRES = ["FPS", "Military", "Story", "Co-op"] as const;

/** Collection ID for a src/data/games.json entry: the Steam app ID, or the slugified name for non-Steam games. */
export function gameId(game: { name: string; appId?: number }): string {
	return game.appId !== undefined
		? String(game.appId)
		: game.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
}
