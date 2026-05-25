export interface ImageData {
    title: string;
    path: string;
    author: string;
    date: string;
    type: "sticker" | "fullbody" | "halfbody" | "icon";
    price: number;
    lightboxTitle: string;
    lightboxDescription: string;
}
