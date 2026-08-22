import type { ImageMetadata } from "astro";
import thinker from "../media/bunger/newFTRookie_thinker.png";
import judgment from "../media/bunger/newFTRookie_judge.png";
import angry from "../media/bunger/newFTRookie_angry.png";
import angryAlt from "../media/bunger/newFTRookie_angry-alt.png";
import thumbsup from "../media/bunger/newFTRookie_thumbsup.png";

export const bungers = {
    thinker,
    judgment,
    angry,
    "angry-alt": angryAlt,
    thumbsup,
} satisfies Record<string, ImageMetadata>;

export type Bunger = keyof typeof bungers;
