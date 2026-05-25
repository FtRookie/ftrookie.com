document.addEventListener("astro:page-load", () => {
    const timenow = document.getElementById("timenow");
    if (!timenow) return;

    const clankerprompt = document.getElementById("clankerprompt") as HTMLElement;
    if (sessionStorage.getItem("clankerprompted") !== "true") {
        clankerprompt.style.display = "flex";
        sessionStorage.setItem("clankerprompted", "true");
    }

    document.getElementById("clankerno")?.addEventListener("click", () => {
        clankerprompt.style.display = "none";
    });

    document.getElementById("clankeryes")?.addEventListener("click", () => {
        window.location.replace("SHOOCLANKER");
    });

    const tick = () => {
        timenow.textContent = new Date().toLocaleString("en-US", {
            timeZone: "America/Los_Angeles",
            timeZoneName: "long",
            weekday: "long",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            second: "2-digit",
        });
    };
    tick();
    const clockInterval = setInterval(tick, 1000);

    document.addEventListener("astro:before-swap", () => clearInterval(clockInterval), { once: true });
});
