---
name: verify-build
description: Build the site and drive it in headless Chromium — verifies lightboxes, theme toggle, gallery filters, back links, and view transitions against the real preview server
---

# Verify the build in a real browser

## Setup (once per clean node_modules)

```bash
npm install --no-save playwright
npx playwright install chromium
```

Chromium caches in `~/.cache/ms-playwright`, so the second line is instant after the first ever run.

## Serve the built site

```bash
npm run build
npm run preview > /tmp/preview.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:4321/home >/dev/null; do sleep 1; done'
```

Stop it afterwards with `pkill -f "astro preview"` (exits 144 when it kills its own shell — harmless).

## Drive it

The driver script MUST live inside the repo — ESM resolves `playwright` from the script's own path, not the cwd. Write `.smoke.tmp.mjs` at the repo root, `node .smoke.tmp.mjs`, delete it after.

```js
import { chromium } from "playwright";

const base = "http://localhost:4321";
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

// gallery lightbox on fresh load
await page.goto(`${base}/gallery`);
await page.waitForSelector("#gallery img");
await page.click("#gallery li:first-of-type a.glightbox");
await page.waitForSelector(".gslide-media", { state: "visible" });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// theme toggle flips data-theme on <html>
const t1 = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
await page.click("#theme-toggle");
const t2 = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
console.log(`theme: ${t1} -> ${t2} ${t1 !== t2 ? "OK" : "FAIL"}`);

// view transition: navigate via navbar, theme persists, lightbox re-inits
await page.click('.navbar a[href="/home"]');
await page.waitForURL("**/home");
await page.waitForTimeout(500);
console.log(`theme persisted: ${await page.evaluate(() => document.documentElement.getAttribute("data-theme")) === t2 ? "OK" : "FAIL"}`);
await page.click('.navbar a[href="/gallery"]');
await page.waitForURL("**/gallery");
await page.waitForSelector("#gallery img");
await page.click("#gallery li:first-of-type a.glightbox");
await page.waitForSelector(".gslide-media", { state: "visible" });
console.log("lightbox after view-transition swap: OK");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// gallery author filter (reads input dataset.value)
await page.click("#collapsible-filter-author button.collapsible");
await page.click("input[name='filter-author']:first-of-type + label");
await page.waitForTimeout(300);
console.log(`filtered visible: ${await page.evaluate(() =>
    [...document.querySelectorAll("#gallery li")].filter((li) => li.style.display !== "none").length)}`);

// back links on subpages
await page.goto(`${base}/likes/gaming`);
await page.click("a.naventry");
await page.waitForURL("**/likes");

// oecontributions lightbox
await page.goto(`${base}/project/oecontributions`);
await page.click(".imagebar a.glightbox");
await page.waitForSelector(".gslide-media", { state: "visible" });
await page.keyboard.press("Escape");

console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no console errors");
await browser.close();
```

Screenshots: `page.screenshot({ path: "screenshots/name.png" })` — the `screenshots/` dir is gitignored.

## Gotchas

- `kit.fontawesome.com` throws console errors when offline — filter those out before judging.
- GLightbox is initialized per `astro:page-load`; the view-transition re-init is the regression-prone path, always test it.
- First `nav` after server start can be slow; `waitForSelector`, never bare `sleep`.
