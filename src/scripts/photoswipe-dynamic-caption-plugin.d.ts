declare module "photoswipe-dynamic-caption-plugin" {
    import type PhotoSwipeLightbox from "photoswipe/lightbox";

    interface DynamicCaptionOptions {
        type?: "auto" | "below" | "aside";
        captionContent?: string | ((slide: unknown) => string);
        mobileLayoutBreakpoint?: number;
        horizontalEdgeThreshold?: number;
        mobileCaptionOverlapRatio?: number;
        verticallyCentered?: boolean;
    }

    export default class PhotoSwipeDynamicCaption {
        constructor(lightbox: PhotoSwipeLightbox, options?: DynamicCaptionOptions);
    }
}
