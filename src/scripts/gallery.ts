import GLightbox from "glightbox";
import data from "../media/bunger/metadata.json"
import { queryById } from "./dom";
import type { CollapsibleElement, Gallery, ImageLI, Options, OptionsElements } from './gallery.types';
import type { ImageData } from './metadata.types';

const sortDirectionIconTypes = {
    date: "numerical",
    author: "alphabetical",
    title: "alphabetical"
} as const;
type SortDirectionType = keyof typeof sortDirectionIconTypes;
type SortIconType = typeof sortDirectionIconTypes[SortDirectionType];

const capitalizeFirstLetter = (val: string): string => {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}
const parseData = (data: string): string => {
    const split = data.split("-")[2];
    if (split == "") throw new Error(`Unable to parse data string '${data}'`)
    return split
}

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
    label.htmlFor = input.id;
    label.textContent = content;
    div.append(input, label);
    container.appendChild(div);
    return input
}

const images: Map<ImageData, HTMLImageElement> = new Map()
const authors: Set<string> = new Set()
const types: Set<string> = new Set()


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

    const galleryContainer = document.getElementById("gallery") as Gallery
    galleryContainer.images = [];

    for (const i of data) {
        const imageData = i as ImageData
        authors.add(imageData.author)
        types.add(imageData.type)

        const listItem = document.getElementById(imageData.title) as ImageLI
        galleryContainer.images.push(listItem)
        const image = listItem.querySelector(".glightbox")!.querySelector("img")!
        listItem.Image = image
        images.set(imageData, image)

        for (const [attr, val] of Object.entries(imageData)) {
            image.setAttribute(`data-metadata-${attr}`, val)
        }
    }

    let sortedImagesArray = Array.from(galleryContainer.querySelectorAll("li")) as ImageLI[]

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
        const checkedAuthors: string[] = []
        const authorInputs = document.querySelectorAll("input[name='filter-author']:checked")
        for (const authorInput of authorInputs) {
            const author = parseData(authorInput.id) as ImageData["author"]
            checkedAuthors.push(author)
        }

        const checkedTypes: string[] = []
        const typeInputs = document.querySelectorAll("input[name='filter-type']:checked")
        for (const typeInput of typeInputs) {
            const type = parseData(typeInput.id) as ImageData["type"]
            checkedTypes.push(type)
        }

        for (const [imageData, image] of images.entries()) {
            const li = image.closest('li') as HTMLLIElement;
            const shouldShow =
                (checkedAuthors.length == 0 || checkedAuthors.includes(imageData.author)) &&
                (checkedTypes.length == 0 || checkedTypes.includes(imageData.type))

            li.style.display = shouldShow ? "inline" : "none";
        }
    }

    const update = () => {
        const sortBySelected = document.querySelector("input[name='sort-type']:checked")!
        const sortType = parseData(sortBySelected.id)
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
};

document.addEventListener("astro:page-load", () => {
    if (!document.querySelector("#gallery")) return;
    onload();
})
