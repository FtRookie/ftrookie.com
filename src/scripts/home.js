const clankerprompt = document.getElementById("clankerprompt");
clankerprompt.style.display = "flex";
if (sessionStorage.getItem("clankerprompted") != "true") {
    clankerprompt.style.display = "flex";
    sessionStorage.setItem("clankerprompted", "true")
}

setInterval(function () {
    let m = new Date().toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        timeZoneName: "long",
        weekday: "long",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        second: "2-digit",
    })

    const d = document.getElementById("timenow");
    if (d) {
        d.innerHTML = `${m}`;
    }
});