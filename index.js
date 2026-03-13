const clankerprompt = document.getElementById("clankerprompt");

if (sessionStorage.getItem("clankerprompted") != "true") {
    clankerprompt.style.display = "flex";
    sessionStorage.setItem("clankerprompted", "true")
}

function yesclanker() {
    window.location.replace("SHOOCLANKER.html");
}
function noclanker() {
    clankerprompt.style.display = "none";
}
