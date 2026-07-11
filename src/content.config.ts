import { defineCollection } from "astro:content";
import { z } from "astro/zod"
import { file } from "astro/loaders";

const bunger = defineCollection({
    loader: file("src/media/bunger/metadata.json"),
    schema: ({ image }) =>
        z.object({
            path: image(),
            author: z.string(),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
            type: z.enum(["sticker", "fullbody", "halfbody", "icon"]),
            price: z.number().nonnegative(),
            lightboxTitle: z.string(),
            lightboxDescription: z.string(),
        }),
});

export const collections = { bunger };
