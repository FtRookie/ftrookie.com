/** A <details class="option"> filter panel; opening/closing is handled natively. */
export interface CollapsibleElement extends HTMLDetailsElement {
	collapsible: HTMLElement;
	collapser: HTMLDivElement;
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
