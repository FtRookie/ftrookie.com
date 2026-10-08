# ftrookie.com — Codebase Guide for Claude

Personal portfolio site built with **Astro 6**, deployed as a static build via nginx on a self-hosted server. No frameworks (React/Vue/Svelte) — pure Astro components and vanilla TypeScript.

---

## Stack & Config

- **Astro 6**, `output: "static"`, `@astrojs/node` adapter in standalone mode
- **TypeScript** strict mode (`tsconfig.json` extends Astro's `strict` preset)
- **PhotoSwipe 5** + `photoswipe-dynamic-caption-plugin` for image lightboxes (gallery, oecontributions pages) — see "Lightbox" under Content Patterns
- **FontAwesome** CDN kit — loaded globally via `BasicPage.astro`, icons only appear on `gallery.astro`, `artists.astro`, `socials.astro`, `likes/music.astro`, and `likes/gaming.astro`
- **View Transitions** enabled via `<ClientRouter />` in `Head.astro`
- Build: `npm run build` — compiles the site. Run `npx astro check` separately for full TypeScript diagnostics on `.astro` files.

---

## Images

### Where to store them

- **`src/media/`** — all source images that Astro should process (gets WebP conversion, srcsets, build-time optimization via Sharp)
- **`public/`** — only files that must be served as-is at a fixed URL (favicons, SVGs referenced from outside Astro)

### Which component to use

Use `<Image>` from `astro:assets` when displaying a single image at a fixed size — it generates an optimized output in the correct format.

Use `<Picture>` when the image needs multiple format fallbacks (e.g., a GIF that must stay animated, or a layout-constrained image needing `<source>` tags).

Use a plain `<img>` only for remote URLs that Astro cannot fetch at build time (e.g., artist avatar URLs on `artists.astro`).

### Loading attribute

- `loading="eager"` — only for above-the-fold images (hero, favicon, first visible image on page)
- `loading="lazy"` — everything else, especially images in lists or below the fold

### Dynamic imports with import.meta.glob

When images are selected at runtime from a directory (e.g., album covers), use the lazy glob pattern and `await` the module in Astro frontmatter:

```astro
---
const images = import.meta.glob<{ default: ImageMetadata }>(
    "/src/media/albumcovers/*.{jpg,png,gif}",
);
const imageModule = await images[`/src/media/albumcovers/${filename}`]?.();
---
{imageModule && <Image src={imageModule.default} alt="description" loading="lazy" />}
```

Do not pass a `Promise` directly to `src` — always `await` first. The glob function returns `() => Promise<{ default: ImageMetadata }>`, so call it with `?.()` to handle missing keys safely.

---

## View Transitions & Script Lifecycle

This site uses `<ClientRouter />` (Astro's View Transitions). Scripts in `.astro` files run only once across navigations — not on every page load.

### Lifecycle events

| Event | When it fires | Use it for |
|---|---|---|
| `astro:page-load` | After navigation completes, page visible | Re-initializing libraries (PhotoSwipe, etc.) |
| `astro:after-swap` | After DOM swap, before scripts run | Restoring theme, scroll position, any state |
| `astro:before-swap` | Before DOM is replaced | Cleaning up intervals, removing event listeners |

### Rules for scripts

- Wrap any code that initializes per-page DOM behavior in `document.addEventListener("astro:page-load", ...)`.
- Any `setInterval` or `setTimeout` must be cleared in an `astro:before-swap` listener using `{ once: true }` so the cleanup only runs once per navigation.
- Never leave intervals running without a cleanup path — they survive page transitions and stack up.

```typescript
const id = setInterval(tick, 1000);
document.addEventListener("astro:before-swap", () => clearInterval(id), { once: true });
```

- Replace `DOMContentLoaded` with `astro:page-load` in any new scripts.

### Do not use inline event handlers

Do not put JavaScript in HTML `onclick` attributes. Attach event listeners in a script instead:

```astro
<!-- wrong -->
<button onclick="doSomething()">Click</button>

<!-- correct: handle in a script using astro:after-swap -->
<button id="my-button">Click</button>
```
```typescript
// in a .ts file or <script> tag
function setup() {
    document.getElementById('my-button')?.addEventListener('click', doSomething);
}
setup();
document.addEventListener('astro:after-swap', setup);
```

### Do not use `is:inline data-astro-rerun` for layout control

Using an inline script to imperatively modify layout (e.g., hiding the navbar by setting `style.display`) is fragile. Use component props instead:

```astro
<!-- wrong: hiding navbar with an inline script -->
<script is:inline data-astro-rerun>
    document.querySelector(".navbar").style.display = "none";
</script>

<!-- correct: pass a prop to the layout component -->
<Basic showNavbar={false}>
```

`BasicPage.astro` accepts a `showNavbar` prop (default `true`) that conditionally renders the navbar, and a `backHref` prop that hides the navbar and renders a "< Back" link instead. Subpages (`/likes/*`, `/project/*`) use `<Basic backHref="/likes">` directly — there are no wrapper components.

---

## TypeScript Conventions

### Typing component props

Define a `Props` interface inside the frontmatter fence. The Astro VS Code extension picks this up for autocomplete when using the component. Always include this — never destructure `Astro.props` without it:

```astro
---
import type { ImageMetadata } from "astro";

interface Props {
    title?: string;
    favicon?: ImageMetadata;
    hero?: string;
}
const { title = "FtRookie", favicon, hero = title } = Astro.props;
---
```

### Types belong in `.ts` files

Do not define or export TypeScript types from `.astro` page files. Types used across multiple files belong in dedicated `*.types.ts` files in `src/scripts/`:

```typescript
// src/scripts/gallery.types.ts  ✅
export interface CollapsibleElement extends HTMLDivElement { ... }
```

```astro
// src/pages/gallery.astro  ✗ — do not export types from here
export interface CollapsibleElement extends HTMLDivElement { ... }
```

### Do not use `export const partial` in components

`export const partial = true` only has meaning on page files in `src/pages/` that are fetched as partial HTML responses. It has no effect in `src/components/` and should not be used there.

### Type imports

Use `import type` for anything that only exists at compile time:

```typescript
import type { CollapsibleElement, ImageLI } from "@/scripts/gallery.types";
```

### Import paths

Import anything under `src/` through the `@/` alias (mapped to `src/*` in `tsconfig.json`), never with relative `./` or `../` paths. This applies to frontmatter imports, `.ts` files, CSS imports, and `<script src>` tags:

```astro
---
import Basic from "@/components/BasicPage.astro";
import Yippee from "@/media/bunger/yippee.png";
import "@/styles/home.css";
---
<script src="@/scripts/home.ts"></script>
```

`import.meta.glob` patterns keep the root-absolute `/src/...` form shown under "Dynamic imports with import.meta.glob".

### Typed data lists use `satisfies`

Every user-defined list in frontmatter (any array or map of entries you edit by hand: games, artists, projects, socials, image strips, facts, caption maps) ends in `satisfies T`, never a `: T` annotation and never untyped. Lists too large for frontmatter move to JSON loaded as a content collection with a zod schema instead (the gallery and music albums), since JSON imports get no `satisfies` checking:

```typescript
const buildImages = [
    { image: Felon, alt: "Felon by Ericht", title: "Felon", description: "…" },
] satisfies LightboxImage[];
```

This gives autocomplete for every field while typing an entry and flags missing fields and misspelt keys (`descripton` → "Did you mean 'description'?"). It is a compile-time check only: `npm run build` does not type-check, so run `npx astro check` to catch these errors.

When a map may be empty or is looked up by arbitrary keys, `satisfies` infers only the keys present; widen it at the lookup site, e.g. `(descriptions as Record<string, string | undefined>)[file]`.

Shared entry types live in `*.types.ts` (e.g. `LightboxImage` in `src/scripts/lightbox.types.ts`); types used by one page stay in its frontmatter.

### Discriminated unions

When a field describes the category of an object, use a string literal union:

```typescript
type: "sticker" | "fullbody" | "halfbody" | "icon"
```

Add new variants here before adding them to data files — TypeScript will catch mismatches at build time. For the gallery collection this union lives as a `z.enum` in `src/content.config.ts`.

### Run type checking

`npm run build` compiles the site. For thorough type checking of `.astro` files: `npx astro check`.

---

## CSS Conventions

### Theme system

Light/dark theme is toggled via `data-theme` attribute on `:root`. All color values must go through CSS custom properties defined in `src/styles/global.css`:

```css
:root[data-theme="light"] { --primary-bg: #ddd; --primary-text: #111; }
:root[data-theme="dark"]  { --primary-bg: #222; --primary-text: #fff; }
```

Never hardcode colors in component styles. Always use a `var(--...)` token. If you need a new color role, define it in both theme blocks in `global.css` first.

### Responsive sizing with clamp()

Use `clamp(min, preferred, max)` for font sizes and spacing that should scale with the viewport but stay within readable bounds:

```css
font-size: clamp(1rem, 2.5vw, 2rem);
padding: clamp(0.5rem, 3vw, 2rem);
```

Rule: the max should be at least 2× the min to remain accessible at 200% browser zoom.

Do not use bare viewport units without a clamp wrapper — `font-size: 3vw` or `font-size: 5vh` alone will be unreadably large on desktop or tiny on mobile. Always write:

```css
font-size: clamp(minimum, viewport-value, maximum);
```

Do not use absolute keyword sizes (`x-large`, `xx-large`, `small`, etc.) — they are not responsive and not predictable across browsers. Use `rem` or `clamp()` instead.

### Shorthand values

Use space-separated values in shorthand properties — never commas:

```css
padding: 0.25rem 1rem;   /* correct */
padding: 0.25rem, 1rem;  /* invalid — values are silently ignored */
```

This applies to `padding`, `margin`, and `border` shorthands.

### Responsive layouts: intrinsic CSS vs @media

Prefer intrinsic CSS over `@media` pixel breakpoints — pixel values become stale as content changes and require ongoing maintenance. Use `clamp()` and `auto-fit`/`minmax` wherever the intent is "scale with available space."

`@media` is appropriate when the change is driven by a **semantic condition** with no arbitrary number to maintain:

- `(orientation: portrait)` — height-dominated screens (phones, rotated tablets); use to switch a multi-column grid to a single column
- `(prefers-reduced-motion)` — accessibility: disable animations
- `print` — print stylesheets

Example — 2-column grid that becomes a single column in portrait:

```css
#list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
}

@media (orientation: portrait) {
    #list { grid-template-columns: 1fr; }
}
```

Do not use `@media (max-width: Npx)` — pick an intrinsic approach instead. `auto-fit` with `minmax` and `min()` handles "collapse when too narrow" without a hardcoded breakpoint:

```css
grid-template-columns: repeat(auto-fit, minmax(min(350px, 100%), 1fr));
```

How it works: `min(350px, 100%)` evaluates to `100%` when the container is narrower than `350px`, so only one column fits. Use this when you want "as many columns as fit" rather than a fixed count.

For font sizes and spacing, `clamp()` handles the same job — see "Responsive sizing with clamp()" above.

### display values

Valid `display` values include `flex`, `block`, `inline`, `grid`, `inline-flex`, `none`. `div` is not a valid `display` value.

`flex-direction`, `justify-content`, `align-items`, and `gap` only take effect when `display` is `flex` or `grid`. Do not set `flex-direction: column` on an element with `display: block`.

---

## HTML Conventions

### Document structure

Full pages (`src/pages/*.astro`) must have a proper `<html>`, `<head>`, and `<body>` structure. All meta tags, `<title>`, `<link>`, `<style>`, and `<script>` elements belong inside `<head>`:

```astro
<html lang="en">
    <head>
        <title>...</title>
        <style>...</style>
    </head>
    <body>
        ...
    </body>
</html>
```

Do not place `<style>` or `<title>` as direct children of `<html>` outside `<head>`.

### Language attribute

The `lang` attribute uses BCP 47 syntax with a hyphen: `lang="en"` or `lang="en-US"`. `lang="en_US"` (underscore) is invalid.

### Semantic elements used in this project

- `<article>` — each project card or commission artist entry (self-contained, linkable)
- `<nav>` — the main navigation bar
- `<footer>` — page credits and legal-style notices
- `<em>` — inline stress emphasis (e.g., the disclaimer note on artists page)
- `<ul>` / `<li>` — any list of items (games, genres, artists, album entries)

### IDs vs classes

An `id` must be unique per page — only one element may have a given id. If the same style needs to apply to multiple elements, use a class instead.

```astro
<!-- wrong: same id on two elements -->
<Picture id="yippee" src={A} />
<Picture id="yippee" src={B} />

<!-- correct: class applies to both -->
<Picture class="yippee" src={A} />
<Picture class="yippee" src={B} />
```

### Alt text

Every `<Image>`, `<Picture>`, and `<img>` must have an `alt` attribute. For decorative images use `alt=""`. For content images describe what's shown — for album art, `alt={`${author} - ${song}`}` is correct. Do not use file paths or hashed asset URLs as alt text.

---

## Content Patterns

### Data-driven lists

When a page displays a list of similar items (albums, artists, games), define the data as a typed array in the frontmatter and render with `.map()`. This means adding a new entry is a single-line data change:

```astro
---
interface Game { name: string; url: string; }

const recentGames: Game[] = [
    { name: "Deadlock", url: "https://store.steampowered.com/app/1422450/Deadlock/" },
    // add new games here
];
---
<ul>
    {recentGames.map((game) => (
        <li><a href={game.url}>{game.name}</a></li>
    ))}
</ul>
```

Do not copy-paste markup blocks for similar items. If you find yourself repeating the same JSX structure more than twice, move the data to an array.

### Adding album covers

1. Fetch the cover with `npm run cover -- "Artist Name" "Song Title"`. It searches iTunes, then Deezer (no API key), saves a 1000px JPG into `src/media/albumcovers/`, and prints the matched album so a wrong match can be caught. It will not overwrite an existing file without `--force`. Exit status: 0 saved, 1 bad arguments, 2 no match, 3 network/HTTP error, 4 file already exists, 5 write failed (documented at the top of `scripts/fetch-cover.mjs`). Alternatively, drop an image file into `src/media/albumcovers/` by hand.
2. Add the entry to `src/media/albumcovers/albums.json`, inside the array of its genre. The script prints this line ready to paste:

```json
{
	"author": "Artist Name",
	"song": "Song Title",
	"image": "filename.jpg"
},
```

Add an optional `"description"` for a small caption under the title. The file is the `albums` content collection (schema in `src/content.config.ts`): genre keys must be one of `GENRES` in `src/scripts/music.ts` (which also sets the display order; add a new genre there first), and `image` must exist, or the build fails (and dev shows an error overlay via `getCompleteCollection`). The file is formatted as `JSON.stringify(data, null, "	")`: every entry multi-line, no blank lines; keep a genre's songs by the same first-listed artist next to each other. A genre with only one song is shown under "Other". Astro converts the covers to WebP on build.

### Adding gallery images

The gallery is a content collection (`bunger`) defined in `src/content.config.ts` with a `file()` loader over `src/media/bunger/metadata.json`. To add an image:

1. Drop the image file into `src/media/bunger/`
2. Add an entry to `metadata.json` — `id` must be unique, `path` is the filename relative to the JSON file, `type` must be one of the `z.enum` variants in the schema

The build validates every entry against the zod schema and fails if the image file is missing or a field is malformed — a typo cannot silently drop an image. `gallery.astro` renders via `getCollection("bunger")` and stamps `data-metadata-*` attributes server-side; `gallery.ts` reads those off the DOM for sorting/filtering (it does not import the JSON).

### Lightbox

Every lightbox trigger follows one markup contract, rendered in `gallery.astro`, `smugcats.astro` and `LightboxBar.astro`:

```astro
<a href={full.src} data-pswp-width={width} data-pswp-height={height} class="lightbox">
    <Picture src={thumb} alt={title} />
    <LightboxCaption title={title} description={description} />
</a>
```

- `data-pswp-width` / `data-pswp-height` are mandatory and must match the `href` image — PhotoSwipe sizes the slide from them *before* the file loads, which is what prevents the caption-first flash and relayout that GLightbox had. Take them from `ImageMetadata` (`image.width`) or `getImage()` (`full.attributes.width`).
- The `<Picture>` thumbnail doubles as the placeholder while the full image loads.
- Captions always go through `LightboxCaption.astro`, which renders the hidden `.lightbox-caption` span the caption plugin reads as HTML: a bold title, plus a line break and the description when one is given. Never hand-write the span.
- Descriptions come from: `lightboxDescription` in `metadata.json` (gallery), the optional `description` on each `LightboxBar` image, and the `descriptions` map keyed by filename in `smugcats.astro`.
- Initialise with `initLightbox("#gallery")` (any selector; multiple matches become separate galleries) and call `destroy()` on `astro:before-swap` with `{ once: true }`.
- Chrome colours come from the `--lightbox-*` tokens in `global.css`; style the lightbox only through `photoswipe-theme.css` (`.pswp--site` scope), never `pswp__*` classes in page CSS.

### Adding artists

Add an entry to the `artists` array in `src/pages/artists.astro`. The `imageUrl` field accepts external URLs (Twitter/Ko-Fi avatars are fine here since Astro cannot process remote images at build time).

### Adding games

Every game, Steam or not, lives in `src/data/games.json` (the `games` collection; schema in `src/content.config.ts`), mostly copied from the Steam library page. Only `name` is required, plus an `appId` (the number in the Steam store URL) or a `url`; everything else is optional and may be left out when unknown: `url` (another page, e.g. a non-Steam store or stats profile, linked by hostname next to "Steam page"), `hours`, `lastPlayed` (`YYYY-MM-DD`), `achievements` (`"61/66"`), and `notes` (Markdown) shown inside the game's dropdown. `gaming.astro` derives everything from the JSON: "Most played" (top `MOST_PLAYED_COUNT` by `hours`, each a dropdown showing the game's Steam header image, fetched at build time from the store API's current `header_image` (the unhashed `.../apps/<appId>/header.jpg` can be years old, so it is only a fallback) with the placeholder as last resort, and loaded only when opened), "Other games" (every game outside that top list, grouped by `genre` under `h3`s and sorted by playtime without showing it, as plain links to the Steam page, or `url` without an `appId`, in two columns; `genre` is one of `GAME_GENRES` in `src/scripts/games.ts` (FPS, Military, Story, Co-op), and games without one go under "Miscellaneous"), and "Recently played" (top `RECENT_COUNT` by `lastPlayed`, dated games only). The file is kept sorted by `hours`, unknown last. War Thunder's `hours` is StatShark's all-launcher playtime, not Steam's.

---

## File Layout

```
src/
  content.config.ts        — content collections: bunger gallery, music albums, Steam games (file loaders + zod schemas, image() helper)
  data/
    games.json             — Steam library export for the gaming page (games collection)
  components/
    Album.astro            — album cover card: cover ImageMetadata, "author - song" title, optional description (used in music)
    BasicPage.astro        — root layout: navbar (showNavbar prop) or back link (backHref prop), hero, theme toggle, footer
    LightboxBar.astro      — horizontal strip of lightbox anchors, sized by aspect ratio (used in oecontributions, underengineered)
    LightboxCaption.astro  — the hidden caption span every lightbox trigger uses (title + optional description)
    PlaceholderImage.astro — saywhaaat placeholder Picture for pages with sparse content
    Head.astro             — <head> meta: OG tags, ClientRouter (no export const partial)
  pages/
    home.astro, gallery.astro, projects.astro, artists.astro, socials.astro
    likes/                 — gaming, music, coding, pcbuilding
    project/               — website, oecontributions, underengineered
    api/roblox/[endpoint].ts — on-demand (prerender = false) same-origin proxy for Roblox's games/votes API, locked to the Underengineered universe, 5-minute in-memory cache
  scripts/
    home.ts                — clanker prompt + live clock (clears interval on astro:before-swap)
    theme.ts               — dark/light mode; wires theme toggle button (and its aria-pressed) on astro:after-swap
    navbar.ts              — shows/hides the nav overflow arrows and scrolls the nav on click; initializes on astro:page-load
    gallery.ts             — PhotoSwipe init + sort/filter logic (reads data-metadata-* off the DOM); initializes on astro:page-load
    gallery.types.ts       — TypeScript interfaces for gallery.ts (CollapsibleElement, ImageLI, etc.)
    lightbox.types.ts      — LightboxImage: entry type for LightboxBar image arrays (image, alt, title, description?)
    lightbox.ts            — shared PhotoSwipe config: initLightbox(gallerySelector) → options, chrome icons, caption plugin; used by gallery.ts + oecontributions.ts
    photoswipe-dynamic-caption-plugin.d.ts — ambient types for the caption plugin (ships none)
    oecontributions.ts     — PhotoSwipe init for .imagebar elements on astro:page-load
    underengineered.ts     — refreshes [data-live] facts on the underengineered page (Roblox via /api/roblox, GitHub directly); keeps build-time values on failure
    underengineered.types.ts — LiveFact union for the data-live keys
    roblox.ts              — UNDERENGINEERED_UNIVERSE_ID and robloxGameIcon() (Thumbnails API; icon URLs expire after ~180 days)
    music.ts               — GENRES (order + allowed albums.json keys), AlbumSource type, albumEntries() parser for the albums collection
    collections.ts         — getCompleteCollection(): getCollection that throws when entries were dropped by schema errors (visible in dev)
    buildFetch.ts          — withFallback()/remoteImage(): build-time fetches warn and fall back to a placeholder instead of failing the build
  styles/
    global.css             — theme vars (incl. --lightbox-* tokens), typography, navbar, layout — edit here for site-wide changes
    photoswipe-theme.css   — lightbox chrome (square buttons, centred spinner, caption type), scoped to .pswp--site
    home.css, gallery.css, artists.css, etc. — page-specific styles
  media/
    bunger/                — character PNG assets + metadata.json (gallery collection data)
    albumcovers/           — album cover images (processed by Astro into WebP) + albums.json (music page songs, grouped by genre)
    *.gif, *.png           — misc media (GIFs passed through; PNGs converted to WebP)
scripts/
  fetch-cover.mjs          — `npm run cover`: downloads album art from iTunes/Deezer into src/media/albumcovers/
public/
  *.png, *.svg, favicon.ico — static assets served at fixed URLs, not processed by Astro
```
