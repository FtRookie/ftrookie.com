import { initLightbox } from "./lightbox";

document.addEventListener("astro:page-load", () => {
    if (!document.querySelector(".imagebar")) return;
    initLightbox();
})
