import data from "../media/bunger/metadata.json"

const container = document.getElementsByClassName("container")
data.forEach((e) => {

})

const create = () => {
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
create();