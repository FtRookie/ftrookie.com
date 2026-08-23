import { initLightbox } from "./lightbox";

document.addEventListener("astro:page-load", () => {
    if (!document.querySelector(".imagebar")) return;
    const lightbox = initLightbox(".imagebar");
    document.addEventListener("astro:before-swap", () => lightbox.destroy(), { once: true });
});
