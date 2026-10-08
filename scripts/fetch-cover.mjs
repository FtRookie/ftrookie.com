// Downloads album art for a song into src/media/albumcovers/ and prints the
// entry to paste into src/media/albumcovers/albums.json, under the song's genre.
//
// Usage: npm run cover -- "Artist" "Song" [--force] [--out <dir>]
// Tries the iTunes Search API first, then Deezer. Neither needs an API key.
//
// Exit status:
//   0  cover saved
//   1  bad arguments
//   2  no cover found on either service
//   3  network or HTTP error (lookup or download) and no cover saved
//   4  target file already exists; nothing written (pass --force to overwrite)
//   5  could not write the file

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const EXIT = { saved: 0, usage: 1, notFound: 2, network: 3, exists: 4, write: 5 };

const args = process.argv.slice(2);
const force = args.includes("--force");
const outIndex = args.indexOf("--out");
const outDir = outIndex >= 0 ? args[outIndex + 1] : "src/media/albumcovers";
const [author, song] = args.filter((a, i) => !a.startsWith("--") && !(outIndex >= 0 && i === outIndex + 1));

// process.exit() while fetch connections are still closing crashes Node on Windows
// (libuv assertion in async.c), so failures throw and the status is set via exitCode.
class Exit extends Error {
	constructor(code, message) {
		super(message);
		this.code = code;
	}
}

// Filenames stay ASCII so they are safe on the Linux server and in URLs:
// Cyrillic is transliterated, accents are stripped, and anything else
// (e.g. Japanese) is dropped, falling back to "Artist Song".
const CYRILLIC = {
	а: "a",
	б: "b",
	в: "v",
	г: "g",
	д: "d",
	е: "e",
	ё: "yo",
	ж: "zh",
	з: "z",
	и: "i",
	й: "y",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "o",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "kh",
	ц: "ts",
	ч: "ch",
	ш: "sh",
	щ: "shch",
	ъ: "",
	ы: "y",
	ь: "",
	э: "e",
	ю: "yu",
	я: "ya",
	і: "i",
	ї: "yi",
	є: "ye",
	ґ: "g",
};

function toFileStem(text) {
	return text
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.split(/[^\p{L}\p{N}]+/u)
		.map((word) =>
			[...word]
				.map((ch) => {
					const lower = ch.toLowerCase();
					if (!(lower in CYRILLIC)) return ch;
					const latin = CYRILLIC[lower];
					return ch === lower ? latin : latin.charAt(0).toUpperCase() + latin.slice(1);
				})
				.join(""),
		)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("")
		.replace(/[^A-Za-z0-9]/g, "");
}

// Multi-line JSON entry in the same style as src/media/albumcovers/albums.json (tab-indented,
// one property per line), ready to paste into the array of the song's genre.
function formatEntry(album) {
	const indented = JSON.stringify(album, null, "\t").replace(/^/gm, "\t\t");
	return `${indented},`;
}

let networkError = false;

async function getJson(source, url) {
	console.log(`→ ${source}: Searching ${url}`);
	try {
		const res = await fetch(url);
		if (!res.ok) {
			networkError = true;
			console.log(`  ${source} responded HTTP ${res.status} ${res.statusText}`);
			return null;
		}
		return await res.json();
	} catch (error) {
		networkError = true;
		console.log(`  ${source} request failed: ${error.cause?.code ?? error.message}`);
		return null;
	}
}

async function fromITunes() {
	const url = new URL("https://itunes.apple.com/search");
	url.search = new URLSearchParams({ term: `${author} ${song}`, entity: "song", limit: "1" }).toString();
	const hit = (await getJson("iTunes", url))?.results?.[0];
	if (!hit?.artworkUrl100) {
		console.log("  No match on iTunes");
		return null;
	}
	return {
		source: "iTunes",
		album: hit.collectionName,
		artist: hit.artistName,
		track: hit.trackName,
		image: hit.artworkUrl100.replace(/\d+x\d+bb/, "1000x1000bb"),
	};
}

async function fromDeezer() {
	const url = new URL("https://api.deezer.com/search");
	url.search = new URLSearchParams({ q: `artist:"${author}" track:"${song}"`, limit: "1" }).toString();
	const hit = (await getJson("Deezer", url))?.data?.[0];
	if (!hit?.album?.cover_xl) {
		console.log("  No match on Deezer");
		return null;
	}
	return {
		source: "Deezer",
		album: hit.album.title,
		artist: hit.artist.name,
		track: hit.title,
		image: hit.album.cover_xl,
	};
}

async function main() {
	if (!author || !song || (outIndex >= 0 && !outDir)) {
		const received = args.length ? args.map((a) => JSON.stringify(a)).join(" ") : "(nothing)";
		throw new Exit(
			EXIT.usage,
			[
				"Expected an artist and a song as two separate quoted arguments.",
				`  Received: ${received}`,
				'  Usage:    npm run cover -- "Artist" "Song" [--force] [--out <dir>]',
				'  Example:  npm run cover -- "Shingo Nakamura" "1247"',
			].join("\n"),
		);
	}

	console.log(`Looking up cover for "${author} - ${song}"`);
	const match = (await fromITunes()) ?? (await fromDeezer());
	if (!match) {
		if (networkError) throw new Exit(EXIT.network, "Lookup failed because of a network/HTTP error; try again.");
		throw new Exit(EXIT.notFound, `No cover found for "${author} - ${song}" on iTunes or Deezer.`);
	}
	console.log(`✓ ${match.source} matched "${match.track}" by ${match.artist}, album "${match.album}"`);

	// Keep filenames short: drop "(feat. …)", edition tags like "(Deluxe Edition)" or
	// "(Remastered 2019)", and " - Single" / " - EP".
	const albumName = match.album
		.replace(/\s*[([]feat\.[^)\]]*[)\]]/gi, "")
		.replace(/\s*[([][^)\]]*\b(deluxe|edition|version|remaster(ed)?|anniversary|expanded)\b[^)\]]*[)\]]/gi, "")
		.replace(/\s+-\s+(Single|EP)$/i, "");
	const filename = `${toFileStem(albumName) || toFileStem(`${author} ${song}`) || "cover"}.jpg`;
	const target = path.join(outDir, filename);
	const entry = formatEntry({ author: match.artist, song: match.track, image: filename });

	const existed = existsSync(target);
	if (existed && !force) {
		console.log(`• ${target} already exists; nothing downloaded (pass --force to overwrite).`);
		console.log(`\n${entry}\n`);
		return EXIT.exists;
	}

	console.log(`→ Downloading ${match.image}`);
	let bytes;
	try {
		const res = await fetch(match.image);
		if (!res.ok) throw new Exit(EXIT.network, `Download failed: HTTP ${res.status} ${res.statusText}`);
		bytes = Buffer.from(await res.arrayBuffer());
	} catch (error) {
		if (error instanceof Exit) throw error;
		throw new Exit(EXIT.network, `Download failed: ${error.cause?.code ?? error.message}`);
	}

	try {
		await mkdir(outDir, { recursive: true });
		await writeFile(target, bytes);
	} catch (error) {
		throw new Exit(EXIT.write, `Could not write ${target}: ${error.code ?? error.message}`);
	}

	console.log(`✓ ${existed ? "Overwrote" : "Saved"} ${target} (${(bytes.length / 1024).toFixed(0)} KB)`);
	console.log(`\nAdd to src/media/albumcovers/albums.json, under the song's genre:\n${entry}\n`);
	return EXIT.saved;
}

try {
	process.exitCode = await main();
} catch (error) {
	if (!(error instanceof Exit)) throw error;
	console.error(`✗ ${error.message}`);
	process.exitCode = error.code;
}
console.log(`Exit ${process.exitCode}`);
