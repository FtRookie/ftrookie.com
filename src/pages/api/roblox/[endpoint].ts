// Same-origin proxy for the live Underengineered stats (src/scripts/underengineered.ts).
// Roblox's API sends no CORS headers, so browsers can't call it directly. Runs on demand
// on the Node server; the rest of the site stays prerendered.
//
// Locked down to two endpoints and one universe so it can't be used as a general proxy.
// Answers are cached in memory for 5 minutes; if Roblox fails, the last good answer is
// served, and with none the client keeps the values rendered at build time.

import type { APIRoute } from "astro";
import { UNDERENGINEERED_UNIVERSE_ID } from "@/scripts/roblox";

export const prerender = false;

const UPSTREAM = {
	games: "https://games.roblox.com/v1/games",
	votes: "https://games.roblox.com/v1/games/votes",
} as const;

const TTL_MS = 5 * 60_000;
const TIMEOUT_MS = 5_000;

const cache = new Map<string, { body: string; fetchedAt: number }>();

function json(body: string, status: number, maxAge: number) {
	return new Response(body, {
		status,
		headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${maxAge}` },
	});
}

export const GET: APIRoute = async ({ params, url }) => {
	const endpoint = params.endpoint;
	if (endpoint !== "games" && endpoint !== "votes") {
		return json(JSON.stringify({ error: "unknown endpoint" }), 404, 3600);
	}
	if (url.searchParams.get("universeIds") !== String(UNDERENGINEERED_UNIVERSE_ID)) {
		return json(JSON.stringify({ error: "unsupported universe" }), 400, 3600);
	}

	const cached = cache.get(endpoint);
	if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
		return json(cached.body, 200, Math.ceil((TTL_MS - (Date.now() - cached.fetchedAt)) / 1000));
	}

	try {
		const res = await fetch(`${UPSTREAM[endpoint]}?universeIds=${UNDERENGINEERED_UNIVERSE_ID}`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`Roblox responded ${res.status}`);
		const body = await res.text();
		cache.set(endpoint, { body, fetchedAt: Date.now() });
		return json(body, 200, TTL_MS / 1000);
	} catch (error) {
		console.warn(`[api/roblox/${endpoint}] ${error instanceof Error ? error.message : String(error)}`);
		if (cached) return json(cached.body, 200, 30);
		return json(JSON.stringify({ error: "upstream unavailable" }), 502, 30);
	}
};
