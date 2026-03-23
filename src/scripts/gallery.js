import { check } from "astro:schema"
import data from "../media/bunger/metadata.json"

const galleryContainer = document.getElementById("gallery")

const images = new Map()
const authors = new Set()
const types = new Set()

for (const imageData of data) {
    authors.add(imageData.author)
    types.add(imageData.type)

    const listItem = document.getElementById(imageData.title);
    const glightbox = listItem.getElementsByClassName("glightbox")[0]
    const image = glightbox.getElementsByTagName("img")[0]
    if (!image) console.error(`${imageData.id} has no corresponding image`)
    images.set(imageData, image)

    for (const [attr, val] of Object.entries(imageData)) {
        image.setAttribute(`data-metadata-${attr}`, val)
    }
}

let sortedImagesArray = Array.from(galleryContainer.getElementsByTagName("li"))

const sortDirectionIconTypes = {
    "date": "numerical",
    "author": "alphabetical",
    "title": "alphabetical"
}

function capitalizeFirstLetter(val) { // Random function grabbed off the internet
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

const init = () => {
    const SORT_BY = document.getElementById("collapsible-sort-by")
    const SORT_BY_COLLAPSER = SORT_BY.getElementsByClassName("collapser")[0]
    for (const sorttype of Object.keys(sortDirectionIconTypes)) {
        let ischecked
        if (sorttype == "date") ischecked = "value='data' checked"
        SORT_BY_COLLAPSER.insertAdjacentHTML("beforeend",
            `<div>
            <input type="radio"id="sort-type-${sorttype}"name="sort-type" ${ischecked}/>
            <label class="radio" for="sort-type-${sorttype}">${sorttype}</label>
            </div>`
        )
    }

    const FILTER_AUTHOR = document.getElementById("collapsible-filter-author")
    const FILTER_AUTHOR_COLLAPSER = FILTER_AUTHOR.getElementsByClassName("collapser")[0]
    for (const author of authors) {
        const lower = author.toLowerCase()
        FILTER_AUTHOR_COLLAPSER.insertAdjacentHTML("beforeend",
            `<div>
            <input type="checkbox"id="filter-author-${lower}"name="filter-author"/>
        <label class="checkbox"for="filter-author-${lower}">${author}</label>
        </div>`
        )
    }

    const FILTER_TYPE = document.getElementById("collapsible-filter-type")
    const FILTER_TYPE_COLLAPSER = FILTER_TYPE.getElementsByClassName("collapser")[0]
    for (const type of types) {
        const lower = type.toLowerCase()
        const pretty = capitalizeFirstLetter(type)
        FILTER_TYPE_COLLAPSER.insertAdjacentHTML("beforeend",
            `<div>
        <input type="checkbox"id="filter-type-${lower}"name="filter-type"/>
        <label class="checkbox" for="filter-type-${lower}">${pretty}</label>
        </div>`
        )
    }
}

const onload = () => {
    init();
    let currentSortDirection = "up"
    // Sort Direction
    const sortDirection = document.getElementById("sort-direction-button")
    sortDirection.onclick = () => {
        const order = sortDirection.getAttribute("data-order")
        if (order == "up") {
            sortDirection.setAttribute("data-order", "down")
            currentSortDirection = "down"
        }
        if (order == "down") {
            sortDirection.setAttribute("data-order", "up")
            currentSortDirection = "up"
        }
        update();
    }

    // Collapsible Sort/Filter options
    const options = document.getElementById("options")
    const collapsibles = options.getElementsByClassName("option")

    for (const collapsible of collapsibles) {
        const collapseButton = collapsible.getElementsByClassName("collapsible")[0]
        collapseButton.onclick = () => {
            const state = collapsible.getAttribute("data-state")
            if (state == "collapsed") {
                collapsible.setAttribute("data-state", "open")
                return
            }
            if (state == "open") {
                collapsible.setAttribute("data-state", "collapsed")
                return
            }
        }
    }

    // Inputs
    const inputs = document.getElementsByTagName("input")

    const filters = () => {
        const checkedAuthors = []
        const authorInputs = document.querySelectorAll("input[name='filter-author']:checked")
        for (const authorInput of authorInputs) {
            const author = authorInput.id.split("-")[2] // filter-author-${author}
            checkedAuthors.push(author)
        }

        const checkedTypes = []
        const typeInputs = document.querySelectorAll("input[name='filter-type']:checked")
        for (const typeInput of typeInputs) {
            const type = typeInput.id.split("-")[2] // filter-type-${type}
            checkedTypes.push(type)
        }

        for (const [imageData, image] of images.entries()) {
            const shouldShow =
                (checkedAuthors.length == 0 || checkedAuthors.includes(imageData.author)) &&
                (checkedTypes.length == 0 || checkedTypes.includes(imageData.type))

            shouldShow ? image.setAttribute("data-hide", "false") : image.setAttribute("data-hide", "true")
        }
    }

    const update = () => {
        const sortBySelected = document.querySelector("input[name='sort-type']:checked")
        const sortType = sortBySelected.id.split("-")[2]
        const corresponding = sortDirectionIconTypes[sortType]
        sortDirection.setAttribute("data-type", corresponding)

        sortedImagesArray.sort((li1, li2) => {
            const img1 = li1.getElementsByTagName("img")[0]
            const img2 = li2.getElementsByTagName("img")[0]
            const attr1 = img1.getAttribute(`data-metadata-${sortType}`)
            const attr2 = img2.getAttribute(`data-metadata-${sortType}`)
            const dir = attr1 == attr2 ? 0 : currentSortDirection == "down" ? -1 : 1
            switch (sortType) {
                case "date":
                    return attr1 > attr2 ? (-dir) : dir // ISO 8601 comparisons are reversed
                default:
                    return attr1 < attr2 ? (-dir) : dir
            }
        })
        console.log(sortedImagesArray)
        for (const li of sortedImagesArray) {
            galleryContainer.appendChild(li)
        }

        const sortByCollapsible = document.getElementById("collapsible-sort-by")
        const sortByCollapsibleButton = sortByCollapsible.getElementsByClassName("collapsible")[0]
        sortByCollapsibleButton.innerHTML = `
        sort by: ${sortType}
        <i class="fa-solid fa-angle-right"></i>
        <i class="fa-solid fa-angle-down"></i>`
        filters();
    }

    for (const input of inputs) {
        input.addEventListener("change", update)
    }

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
    const galleryElement = document.querySelector("#gallery");
    if (!galleryElement) return; // Bootleg fucking patch I hate it but must use I guess
    onload();
})