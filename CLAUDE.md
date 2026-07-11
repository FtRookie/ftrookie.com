# ftrookie.com — Codebase Guide for Claude

Personal portfolio site built with **Astro 6**, deployed as a static build via nginx on a self-hosted server. No frameworks (React/Vue/Svelte) — pure Astro components and vanilla TypeScript.

---

## Stack & Config

- **Astro 6**, `output: "static"`, `@astrojs/node` adapter in standalone mode
- **TypeScript** strict mode (`tsconfig.json` extends Astro's `strict` preset)
- **GLightbox** for image lightboxes (gallery, oecontributions pages)
- **FontAwesome** CDN kit — loaded globally via `BasicPage.astro`, icons only appear on `gallery.astro`, `artists.astro`, and `socials.astro`
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
| `astro:page-load` | After navigation completes, page visible | Re-initializing libraries (GLightbox, etc.) |
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
import type { CollapsibleElement, ImageLI } from "./gallery.types";
```

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

1. Drop the image file into `src/media/albumcovers/`
2. Add an entry to the `albums` array in `src/pages/likes/musictastes.astro`:

```typescript
{ author: "Artist Name", song: "Song Title", image: "filename.jpg" }
```

Astro will convert it to WebP automatically on next build.

### Adding gallery images

The gallery is a content collection (`bunger`) defined in `src/content.config.ts` with a `file()` loader over `src/media/bunger/metadata.json`. To add an image:

1. Drop the image file into `src/media/bunger/`
2. Add an entry to `metadata.json` — `id` must be unique, `path` is the filename relative to the JSON file, `type` must be one of the `z.enum` variants in the schema

The build validates every entry against the zod schema and fails if the image file is missing or a field is malformed — a typo cannot silently drop an image. `gallery.astro` renders via `getCollection("bunger")` and stamps `data-metadata-*` attributes server-side; `gallery.ts` reads those off the DOM for sorting/filtering (it does not import the JSON).

### Adding artists

Add an entry to the `artists` array in `src/pages/artists.astro`. The `imageUrl` field accepts external URLs (Twitter/Ko-Fi avatars are fine here since Astro cannot process remote images at build time).

### Adding games

Add an entry to the `recentGames` array in `src/pages/likes/gaming.astro`.

---

## File Layout

```
src/
  content.config.ts        — content collections: bunger gallery (file loader + zod schema, image() helper)
  components/
    Album.astro            — album cover card (used in musictastes)
    BasicPage.astro        — root layout: navbar (showNavbar prop) or back link (backHref prop), hero, theme toggle, footer
    PlaceholderImage.astro — saywhaaat placeholder Picture for pages with sparse content
    Head.astro             — <head> meta: OG tags, ClientRouter (no export const partial)
  pages/
    home.astro, gallery.astro, projects.astro, artists.astro, socials.astro
    likes/                 — gaming, musictastes, coding, pcbuilding
    project/               — website, oecontributions
  scripts/
    home.ts                — clanker prompt + live clock (clears interval on astro:before-swap)
    theme.ts               — dark/light mode; wires theme toggle button on astro:after-swap
    gallery.ts             — GLightbox + sort/filter logic (reads data-metadata-* off the DOM); initializes on astro:page-load
    gallery.types.ts       — TypeScript interfaces for gallery.ts (CollapsibleElement, ImageLI, etc.)
    lightbox.ts            — shared GLightbox config (initLightbox), used by gallery.ts + oecontributions.ts
    oecontributions.ts     — GLightbox init for .imagebar elements on astro:page-load
  styles/
    global.css             — theme vars, typography, navbar, layout — edit here for site-wide changes
    home.css, gallery.css, artists.css, etc. — page-specific styles
  media/
    bunger/                — character PNG assets + metadata.json (gallery collection data)
    albumcovers/           — album cover images (processed by Astro into WebP)
    *.gif, *.png           — misc media (GIFs passed through; PNGs converted to WebP)
public/
  *.png, *.svg, favicon.ico — static assets served at fixed URLs, not processed by Astro
```
