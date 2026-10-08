// Fills in the live facts in #info on page load. If a request fails, the facts keep
// their "Unknown" placeholder from the page.
//
// Roblox's API sends no CORS headers, so its requests go through the site's own
// endpoint at /api/roblox/ (src/pages/api/roblox/[endpoint].ts). GitHub allows
// cross-origin requests, so it is called directly.

import { UNDERENGINEERED_UNIVERSE_ID as UNIVERSE_ID } from "@/scripts/roblox";
import type { LiveFact } from "@/scripts/underengineered.types";

const REPO = "FtRookie/overengineered";

interface RobloxGame {
	visits: number;
	favoritedCount: number;
	updated: string;
}

interface RobloxVotes {
	upVotes: number;
	downVotes: number;
}

interface GitHubRepo {
	stargazers_count: number;
	forks_count: number;
	pushed_at: string;
}

// `undefined` uses the visitor's locale: day, month name and year, in that locale's order and language.
const number = new Intl.NumberFormat(undefined);
const dateOptions: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const date = new Intl.DateTimeFormat(undefined, dateOptions);
// Date-only ISO strings ("2026-05-02") parse as UTC midnight, so format them in UTC or
// visitors west of UTC would see the previous day.
const dateOnly = new Intl.DateTimeFormat(undefined, { ...dateOptions, timeZone: "UTC" });

function formatDate(iso: string) {
	return (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? dateOnly : date).format(new Date(iso));
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error(`${url} responded ${res.status}`);
	return (await res.json()) as T;
}

function set(fact: LiveFact, text: string) {
	const el = document.querySelector<HTMLElement>(`[data-live="${fact}"]`);
	if (el) el.textContent = text;
}

/** Writes an ISO date into a fact as a <time> element, formatted in the visitor's locale. */
function setDate(fact: LiveFact, iso: string) {
	const el = document.querySelector<HTMLElement>(`[data-live="${fact}"]`);
	if (!el) return;
	const time = document.createElement("time");
	time.dateTime = iso;
	time.textContent = formatDate(iso);
	el.replaceChildren(time);
}

/** Reformats dates rendered at build time (e.g. "Created") in the visitor's locale. */
function localizeDates() {
	for (const time of document.querySelectorAll<HTMLTimeElement>("#info time[datetime]")) {
		time.textContent = formatDate(time.dateTime);
	}
}

document.addEventListener("astro:page-load", () => {
	if (!document.querySelector("[data-live]")) return;
	localizeDates();

	const requests = new AbortController();
	const { signal } = requests;
	document.addEventListener("astro:before-swap", () => requests.abort(), { once: true });

	const update = async (source: string, apply: () => Promise<void>) => {
		try {
			await apply();
		} catch (error) {
			if (!signal.aborted) console.debug(`Live ${source} stats unavailable; keeping build-time values.`, error);
		}
	};

	void update("Roblox", async () => {
		const [games, votes] = await Promise.all([
			getJson<{ data: RobloxGame[] }>(`/api/roblox/games?universeIds=${UNIVERSE_ID}`, signal),
			getJson<{ data: RobloxVotes[] }>(`/api/roblox/votes?universeIds=${UNIVERSE_ID}`, signal),
		]);
		const game = games.data[0];
		const vote = votes.data[0];
		if (!game || !vote) throw new Error("universe missing from response");
		set("visits", number.format(game.visits));
		set("favorites", number.format(game.favoritedCount));
		setDate("updated", game.updated);
		set("rating", `${number.format(vote.upVotes)} likes, ${number.format(vote.downVotes)} dislikes`);
	});

	void update("GitHub", async () => {
		const repo = await getJson<GitHubRepo>(`https://api.github.com/repos/${REPO}`, signal);
		set("starsForks", `${repo.stargazers_count} / ${repo.forks_count}`);
		setDate("lastPush", repo.pushed_at);
	});
});
