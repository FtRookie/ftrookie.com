import { initLightbox } from "./lightbox";

document.addEventListener("astro:page-load", () => {
    if (!document.querySelector("#smugcats")) return;
    const lightbox = initLightbox("#smugcats");
    document.addEventListener("astro:before-swap", () => lightbox.destroy(), { once: true });
});
