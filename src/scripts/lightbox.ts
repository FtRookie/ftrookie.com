import PhotoSwipeLightbox from "photoswipe/lightbox";
import PhotoSwipeDynamicCaption from "photoswipe-dynamic-caption-plugin";
import "photoswipe/style.css";
import "photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css";
import "../styles/photoswipe-theme.css";

const icon = (d: string) =>
    `<svg class="pswp__icn" viewBox="0 0 24 24" aria-hidden="true" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const initLightbox = (gallery: string) => {
    const lightbox = new PhotoSwipeLightbox({
        gallery,
        children: "a.lightbox",
        pswpModule: () => import("photoswipe"),
        mainClass: "pswp--site",
        preload: [1, 2],
        wheelToZoom: true,
        zoom: false,
        bgOpacity: 0.92,
        preloaderDelay: 100,
        indexIndicatorSep: "/",
        showAnimationDuration: 300,
        hideAnimationDuration: 300,
        paddingFn: (viewportSize) =>
            viewportSize.x < 600
                ? { top: 56, bottom: 16, left: 8, right: 8 }
                : { top: 64, bottom: 24, left: 64, right: 64 },
        arrowPrevSVG: icon('<polyline points="15 6 9 12 15 18"/>'),
        arrowNextSVG: icon('<polyline points="9 6 15 12 9 18"/>'),
        closeSVG: icon('<path d="M18 6L6 18M6 6l12 12"/>'),
    });
    new PhotoSwipeDynamicCaption(lightbox, {
        type: "below",
        captionContent: ".lightbox-caption",
        mobileLayoutBreakpoint: 0,
    });
    lightbox.init();
    return lightbox;
};
