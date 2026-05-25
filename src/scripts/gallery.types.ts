export interface CollapsibleElement extends HTMLDivElement {
    collapsible: HTMLButtonElement;
    collapser: HTMLDivElement;
}

export interface Gallery extends HTMLUListElement {
    images: HTMLLIElement[];
}

export type OptionsElements = {
    "sort-direction-button": HTMLButtonElement;
    "collapsible-sort-by": CollapsibleElement;
    "collapsible-filter-author": CollapsibleElement;
    "collapsible-filter-type": CollapsibleElement;
};

export type Options = OptionsElements & {
    instance: HTMLUListElement;
};

export interface ImageLI extends HTMLLIElement {
    Image: HTMLImageElement;
}
