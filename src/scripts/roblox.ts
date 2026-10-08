// Roblox IDs and build-time helpers. Icon URLs on tr.rbxcdn.com are prefixed "180DAY-"
// and stop working after ~180 days, so they are looked up fresh from the Thumbnails API
// on every build instead of being hardcoded.

/** Universe ID of https://www.roblox.com/games/86822363308738/Underengineered (not its place ID). */
export const UNDERENGINEERED_UNIVERSE_ID = 10112329226;

interface ThumbnailResponse {
	data: { targetId: number; state: string; imageUrl: string | null }[];
}

/**
 * Returns the current icon URL for a Roblox experience.
 * @param universeId The experience's universe ID (not the place ID in its URL).
 */
export async function robloxGameIcon(universeId: number, size: "150x150" | "256x256" | "512x512" = "512x512") {
	const url = new URL("https://thumbnails.roblox.com/v1/games/icons");
	url.search = new URLSearchParams({
		universeIds: String(universeId),
		size,
		format: "Png",
		isCircular: "false",
	}).toString();

	const res = await fetch(url);
	if (!res.ok) throw new Error(`Roblox thumbnails API responded ${res.status} for universe ${universeId}`);

	const icon = ((await res.json()) as ThumbnailResponse).data[0];
	if (icon?.state !== "Completed" || !icon.imageUrl) {
		throw new Error(`No icon available for Roblox universe ${universeId} (state: ${icon?.state ?? "missing"})`);
	}
	return icon.imageUrl;
}
