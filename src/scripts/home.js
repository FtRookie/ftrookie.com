const clankerprompt = document.getElementById("clankerprompt");
if (sessionStorage.getItem("clankerprompted") != "true") {
    clankerprompt.style.display = "flex";
    sessionStorage.setItem("clankerprompted", "true")
}

setInterval(function () {
    let m = new Date(
        new Date().toLocaleString("en-US", {
            timeZone: "PST",
        }),
    );

    const d = document.getElementById("timenow");
    if (d) {
        d.innerHTML = `${m}`;
    }
});