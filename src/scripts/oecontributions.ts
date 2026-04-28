import GLightbox from "glightbox";

document.addEventListener("astro:page-load", () => {
    const barElement = document.querySelector(".imagebar");
    if (!barElement) return; // Bootleg patch
    GLightbox({
        selector: '.glightbox',
        touchNavigation: true,
        loop: true,
        zoomable: true,
        draggable: true,
        closeButton: true,
        closeOnOutsideClick: true,
        openEffect: "none",
        closeEffect: "none",
        slideEffect: "none",
        preload: true,
        keyboardNavigation: true,
    });
    console.log("init oecontributions.ts")
})