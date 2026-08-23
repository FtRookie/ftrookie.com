import { initLightbox } from "./lightbox";
import { queryById } from "./dom";
import type { CollapsibleElement, ImageLI, Options, OptionsElements } from './gallery.types';

const sortDirectionIconTypes = {
    date: "numerical",
    author: "alphabetical",
    title: "alphabetical"
} as const;
type SortDirectionType = keyof typeof sortDirectionIconTypes;
type SortIconType = typeof sortDirectionIconTypes[SortDirectionType];

const capitalizeFirstLetter = (val: string): string =>
    val.charAt(0).toUpperCase() + val.slice(1);

const getChecked = (name: string): string[] =>
    Array.from(
        document.querySelectorAll<HTMLInputElement>(`input[name='${name}']:checked`),
        (input) => input.dataset.value!,
    );
const createInput = (
    container: HTMLElement,
    inputType: string,
    inputFor: string,
    id: string,
    content: string
): HTMLInputElement => {
    const div = document.createElement("div")
    const input = document.createElement("input")
    const label = document.createElement("label");
    input.type = inputType;
    input.id = `${inputFor}-${id}`;
    input.name = inputFor;
    input.dataset.value = id;
    label.htmlFor = input.id;
    label.textContent = content;
    div.append(input, label);
    container.appendChild(div);
    return input
}

const onload = () => {
    const instance = document.getElementById("options") as HTMLUListElement;
    const optionsContainer: Options = {
        instance,
        ...queryById<OptionsElements>(instance, [
            "sort-direction-button",
            "collapsible-sort-by",
            "collapsible-filter-author",
            "collapsible-filter-type",
        ]),
    };
    const collapsibles = Array.from(optionsContainer.instance.querySelectorAll(".option")) as CollapsibleElement[]

    const galleryContainer = document.getElementById("gallery") as HTMLUListElement
    const authors: Set<string> = new Set()
    const types: Set<string> = new Set()

    let sortedImagesArray = Array.from(galleryContainer.querySelectorAll("li")) as ImageLI[]

    for (const listItem of sortedImagesArray) {
        const image = listItem.querySelector(".lightbox")!.querySelector("img")!
        listItem.Image = image
        authors.add(image.dataset.metadataAuthor!)
        types.add(image.dataset.metadataType!)
    }

    for (const option of collapsibles) {
        option.collapsible = option.querySelector("button")!
        option.collapser = option.querySelector("div")!
    }

    const SORT_BY_COLLAPSER = optionsContainer["collapsible-sort-by"].collapser
    for (const sortType of Object.keys(sortDirectionIconTypes)) {
        const i = createInput(SORT_BY_COLLAPSER, "radio", "sort-type", sortType, sortType)
        if (sortType === "date") i.checked = true;
    }

    const FILTER_AUTHOR_COLLAPSER = optionsContainer["collapsible-filter-author"].collapser
    for (const author of authors) {
        createInput(FILTER_AUTHOR_COLLAPSER, "checkbox", "filter-author", author, author)
    }

    const FILTER_TYPE_COLLAPSER = optionsContainer['collapsible-filter-type'].collapser
    for (const type of types) {
        const pretty = capitalizeFirstLetter(type)
        createInput(FILTER_TYPE_COLLAPSER, "checkbox", "filter-type", type, pretty)
    }
    let currentSortDirection = "up"

    const filters = () => {
        const checkedAuthors = getChecked("filter-author")
        const checkedTypes = getChecked("filter-type")

        for (const li of sortedImagesArray) {
            const shouldShow =
                (checkedAuthors.length == 0 || checkedAuthors.includes(li.Image.dataset.metadataAuthor!)) &&
                (checkedTypes.length == 0 || checkedTypes.includes(li.Image.dataset.metadataType!))

            li.style.display = shouldShow ? "inline" : "none";
        }
    }

    const update = () => {
        const sortBySelected = document.querySelector<HTMLInputElement>("input[name='sort-type']:checked")!
        const sortType = sortBySelected.dataset.value!
        const corresponding = sortDirectionIconTypes[sortType as SortDirectionType] as SortIconType
        sortDirection.setAttribute("data-type", corresponding)

        sortedImagesArray.sort((li1, li2) => {
            const dir = currentSortDirection === "up" ? 1 : -1
            const attr1 = li1.Image.getAttribute(`data-metadata-${sortType}`)!;
            const attr2 = li2.Image.getAttribute(`data-metadata-${sortType}`)!;
            return attr1 === attr2 ? 0 : sortType === "date"
                ? (attr1 < attr2 ? 1 : -1) * dir
                : attr1.localeCompare(attr2) * dir
        });
        for (const li of sortedImagesArray) {
            galleryContainer.appendChild(li)
        }

        const sortByCollapsible = optionsContainer['collapsible-sort-by']
        const label = sortByCollapsible.querySelector("#label-sort-by") as HTMLSpanElement
        label.textContent = `sort by: ${sortType}`
        filters();
    }

    const sortDirection = optionsContainer["sort-direction-button"]
    sortDirection.onclick = () => {
        const order = sortDirection.getAttribute("data-order")
        sortDirection.setAttribute(
            "data-order",
            order === "up" ? "down" : "up"
        )
        currentSortDirection = (currentSortDirection === "up" ? "down" : "up")
        update();
    }

    for (const collapsible of collapsibles) {
        const collapseButton = collapsible.collapsible
        collapseButton.onclick = () => {
            collapsible.setAttribute(
                "data-state",
                collapsible.getAttribute("data-state") === "collapsed" ? "open" : "collapsed"
            )
        }
    }

    optionsContainer.instance.addEventListener("change", (e) => {
        if (!(e.target instanceof HTMLInputElement)) return;
        update();
    });

    const lightbox = initLightbox("#gallery");

    document.addEventListener("astro:before-swap", () => lightbox.destroy(), { once: true });
};

document.addEventListener("astro:page-load", () => {
    if (!document.querySelector("#gallery")) return;
    onload();
})
