// Graceful wrappers for network requests made at build time (in .astro frontmatter).
// A failed request must never break the build: it logs a warning to the terminal
// (`astro dev` or `astro build`) and the page renders a local placeholder instead.

import type { ImageMetadata } from "astro";
import { inferRemoteSize } from "astro:assets";
import placeholder from "@/media/saywhat.png";

const TIMEOUT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS);
	});
	try {
		return await Promise.race([promise, timeout]);
	} catch (error) {
		throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		clearTimeout(timer);
	}
}

/** Runs `task`; on any failure or timeout, logs a warning and returns `fallback`. */
export async function withFallback<T, F>(label: string, task: () => Promise<T>, fallback: F): Promise<T | F> {
	try {
		return await withTimeout(task(), label);
	} catch (error) {
		const mode = import.meta.env.DEV ? "dev" : "build";
		console.warn(
			`[build-fetch:${mode}] ${error instanceof Error ? error.message : String(error)}; using fallback`,
		);
		return fallback;
	}
}

/**
 * Resolves a remote image URL and checks the image itself downloads. Returns the URL
 * (for `<Picture src={…} inferSize>`) or the local placeholder image if anything fails.
 */
export function remoteImage(label: string, getUrl: () => Promise<string>): Promise<string | ImageMetadata> {
	return withFallback(
		label,
		async () => {
			const url = await getUrl();
			await inferRemoteSize(url);
			return url;
		},
		placeholder,
	);
}
