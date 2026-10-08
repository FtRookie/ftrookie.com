import type { ImageMetadata } from "astro";

/** One image in a LightboxBar strip. */
export interface LightboxImage {
	image: ImageMetadata;
	/** Describes what the image shows, for screen readers. */
	alt: string;
	/** Bold first line of the lightbox caption. */
	title: string;
	/** Optional second line of the lightbox caption. */
	description?: string;
}
