---
name: verify-build
description: Build the site and drive it in headless Chromium via Playwright — verifies favicons/heroes on every page, lightboxes, theme toggle, gallery filters, back links, and view transitions against the real preview server
---

# Verify the build in a real browser

## Setup

`playwright` is a devDependency, so `npm install` covers the library. The browser is a separate one-time download:

```bash
npx playwright install chromium
```

Chromium caches in `~/.cache/ms-playwright`, so the command is instant after the first ever run.

## Serve the built site

```bash
npm run build
PORT=4322 npm run preview -- --port 4322 > /tmp/preview.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:4322/home >/dev/null; do sleep 1; done'
```

Always use the dedicated port. `astro dev` usually occupies :4321, and a readiness check there "succeeds" against the dev server instead of the build — symptoms are `/@vite/client`, `/_image?href=...` URLs and `[astro] Initializing prefetch script` in the trace. The driver below asserts it is talking to the static build.

Stop it afterwards with `fuser -k 4322/tcp` (kills whatever listens on the port) and confirm with `ss -ltnp | grep 4322`. Do not use `pkill -f "astro preview"`: the real server process is `node .../astro/bin/astro.mjs preview --port 4322 --json` (the npm shim re-execs), so that pattern never matches the server — it only kills its own shell (exit 144) and leaks the server, which then silently answers the next run's readiness check. Killing by port also cannot hit a running `astro dev` on :4321.

## Drive it

The driver script MUST live inside the repo — ESM resolves `playwright` from the script's own path, not the cwd. Write `.smoke.tmp.mjs` at the repo root, `node .smoke.tmp.mjs`, delete it after.

```js
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = "http://localhost:4322";
mkdirSync("screenshots", { recursive: true });
const errors = [];
let fails = 0;
const ok = (name, pass, extra = "") => { if (!pass) fails++; console.log(`${pass ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") errors.push(`${m.text()} @ ${m.location()?.url ?? "?"}`); });
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
await page.addInitScript(() => { document.addEventListener("astro:page-load", () => { window.__pl = (window.__pl || 0) + 1; }); });

// view-transition navigation: click, then wait for the URL *and* astro:page-load (scripts re-initialised).
// page.click itself auto-waits until the element is the hit target, which rides out the transition fade.
const navTo = async (sel, path) => {
    const n = await page.evaluate(() => window.__pl || 0);
    await page.click(sel);
    await page.waitForURL((u) => u.pathname === path);
    await page.waitForFunction((n) => (window.__pl || 0) > n, n);
};
// PhotoSwipe: open = a loaded, on-screen main image (neighbour slides stay in the DOM off-screen); close removes .pswp
const loadedImg = (s) => [...document.querySelectorAll(s)].some((i) => { const r = i.getBoundingClientRect(); return i.naturalWidth > 0 && r.width > 50 && r.left > -r.width / 2 && r.right < innerWidth + r.width / 2; });
const lightboxOpen = () => page.waitForFunction(loadedImg, "img.pswp__img:not(.pswp__img--placeholder)", { timeout: 8000 });
const lightboxClose = async () => { await page.keyboard.press("Escape"); await page.waitForSelector(".pswp", { state: "detached", timeout: 4000 }); };

// sanity: static build, not a dev server
await page.goto(`${base}/home`);
ok("serving static build (no /@vite/client)", !(await page.content()).includes("/@vite/client"));

// every page: favicon resolves, hero renders
for (const p of ["/home", "/gallery", "/projects", "/likes", "/socials", "/artists", "/likes/gaming", "/likes/music", "/likes/coding", "/likes/pcbuilding", "/project/website", "/project/oecontributions"]) {
    await page.goto(`${base}${p}`);
    await page.waitForFunction(() => document.querySelector("#hero img")?.complete);
    const info = await page.evaluate(async () => {
        const href = document.querySelector('link[rel="icon"]')?.getAttribute("href") ?? "";
        return { status: href ? (await fetch(href)).status : 0, heroW: document.querySelector("#hero img")?.naturalWidth ?? 0 };
    });
    ok(`${p} favicon 200 + hero rendered`, info.status === 200 && info.heroW > 0, JSON.stringify(info));
}

// 404 route
const r404 = await page.goto(`${base}/this-does-not-exist`);
await page.waitForFunction(() => document.querySelector("img")?.complete);
ok("404 route: status 404 + image rendered", r404.status() === 404 && (await page.evaluate(() => document.querySelector("img")?.naturalWidth > 0)));

// gallery lightbox on fresh load
await page.goto(`${base}/gallery`);
await page.waitForSelector("#gallery img");
await page.click("#gallery li:first-of-type a.lightbox"); await lightboxOpen(); ok("gallery lightbox on fresh load", true);
await page.screenshot({ path: "screenshots/gallery-lightbox.png" });
await lightboxClose();

// theme toggle flips data-theme on <html>
const t1 = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
await page.click("#theme-toggle");
const t2 = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
ok(`theme toggle ${t1} -> ${t2}`, t1 !== t2);

// view transition: theme persists, lightbox re-inits (the regression-prone path)
await navTo('.navbar a[href="/home"]', "/home");
ok("theme persisted across view transition", (await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === t2);
await navTo('.navbar a[href="/gallery"]', "/gallery");
await page.waitForSelector("#gallery img");
await page.click("#gallery li:first-of-type a.lightbox"); await lightboxOpen(); ok("lightbox after view-transition swap", true);
await lightboxClose();

// gallery author filter (reads input dataset.value)
const before = await page.evaluate(() => [...document.querySelectorAll("#gallery li")].filter((li) => li.style.display !== "none").length);
await page.click("#collapsible-filter-author button.collapsible");
await page.click("input[name='filter-author']:first-of-type + label");
await page.waitForTimeout(300);
const after = await page.evaluate(() => [...document.querySelectorAll("#gallery li")].filter((li) => li.style.display !== "none").length);
ok(`gallery author filter ${before} -> ${after} visible`, after > 0 && after < before);

// back links on subpages
await page.goto(`${base}/likes/gaming`);
await navTo("a.naventry", "/likes"); ok("back link /likes/gaming -> /likes", true);

// oecontributions lightbox
await page.goto(`${base}/project/oecontributions`);
await page.click(".imagebar a.lightbox"); await lightboxOpen(); ok("oecontributions lightbox", true);
await lightboxClose();

// cold-load regression (why GLightbox was replaced): arrowing onto an image that is still downloading must show
// the spinner with the caption already in its final place, and nothing may move when the image lands.
// Runs in its own context: aborted thumbnail requests log console errors that must not pollute the check above.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const cold = await ctx.newPage();
  let phase = "load"; const seen = new Set();
  await cold.route(/\/_astro\/.*\.(webp|png)/, async (route) => {           // load: only the first 4 images; afterwards every new file takes 2 s
    const f = route.request().url().split("/").pop();
    if (phase === "load") { if (seen.size < 4 || seen.has(f)) { seen.add(f); return route.continue(); } return route.abort(); }
    if (seen.has(f)) return route.continue();
    await new Promise((r) => setTimeout(r, 2000)); seen.add(f); return route.continue();
  });
  await cold.goto(`${base}/gallery`); await cold.waitForSelector("#gallery a.lightbox"); await cold.waitForTimeout(400);
  phase = "open";
  await cold.locator("#gallery a.lightbox").nth(1).click();
  await cold.waitForFunction(loadedImg, "img.pswp__img:not(.pswp__img--placeholder)", { timeout: 8000 });
  for (let i = 0; i < 4; i++) { await cold.keyboard.press("ArrowRight"); await cold.waitForTimeout(100); }   // -> index 5, still downloading
  await cold.waitForTimeout(400);
  const probe = () => cold.evaluate(() => {
    const onScreen = (s) => [...document.querySelectorAll(s)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left > -r.width / 2 && r.right < innerWidth + r.width / 2; });
    const cap = onScreen(".pswp__dynamic-caption"), img = onScreen("img.pswp__img:not(.pswp__img--placeholder)");
    const cr = cap?.getBoundingClientRect(), ir = img?.getBoundingClientRect();
    return { spinner: !!document.querySelector(".pswp__preloader--active"), captionText: cap?.innerText.trim().slice(0, 40) ?? "", captionTop: Math.round(cr?.top ?? -1), captionLeft: Math.round(cr?.left ?? -1), imgLoaded: !!img && img.naturalWidth > 0, imgBottom: Math.round(ir?.bottom ?? -1) };
  });
  const during = await probe();
  ok("cold slide: spinner shown while loading", during.spinner && !during.imgLoaded, JSON.stringify(during));
  ok("cold slide: caption already placed while loading", during.captionText.length > 0 && during.captionTop > 0, during.captionText);
  await cold.waitForFunction(loadedImg, "img.pswp__img:not(.pswp__img--placeholder)", { timeout: 8000 });
  await cold.waitForTimeout(300);
  const after = await probe();
  ok("cold slide: no reflow when the image lands", Math.abs(after.captionTop - during.captionTop) <= 1 && Math.abs(after.captionLeft - during.captionLeft) <= 1 && after.captionTop >= after.imgBottom - 1, JSON.stringify({ during: [during.captionLeft, during.captionTop], after: [after.captionLeft, after.captionTop], imgBottom: after.imgBottom }));
  await ctx.close();
}

// kit.fontawesome.com errors when offline; Chromium logs the deliberate 404 document as an error
const real = errors.filter((e) => !/fontawesome/i.test(e) && !e.includes("/this-does-not-exist"));
ok("no console/page/HTTP errors", real.length === 0, real.join(" | "));
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
```

Screenshots: `page.screenshot({ path: "screenshots/name.png" })` — the `screenshots/` dir is gitignored.

## Gotchas

- Navigate through `navTo()`: it waits for the URL *and* the next `astro:page-load`, so page scripts (PhotoSwipe, filters, clock) are re-initialised before the next step. `waitForURL` alone resolves before scripts run.
- PhotoSwipe is initialised per `astro:page-load` and destroyed on `astro:before-swap`; the view-transition re-init is the regression-prone path, always test it.
- PhotoSwipe keeps the previous/next slides in the DOM off-screen, so "first match" selectors pick the wrong slide — always filter to the on-screen element (see `loadedImg`).
- The cold-load block aborts thumbnail requests on purpose; keep it in its own context so its console errors never reach the main error check.
- Clicks fired during the view-transition fade land on the `::view-transition` pseudo-tree (`target=<html>`). Playwright's `click` auto-waits for the element to be the hit target, so this only bites if you bypass it with `page.evaluate(() => el.click())` or `dispatchEvent`.
- A fresh browser context shows the home clanker prompt (full-screen overlay, once per `sessionStorage`) on the first `/home` visit. Clicks behind it time out, so keep the first `/home` visit a `goto` with no clicks — the driver above already does.
- First nav after server start can be slow; `waitForSelector`, never bare `waitForTimeout`.
