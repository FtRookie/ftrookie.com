document.addEventListener("astro:page-load", () => {
	const timenow = document.getElementById("timenow");
	if (!timenow) return;

	const listeners = new AbortController();
	const { signal } = listeners;

	const clankerprompt = document.getElementById("clankerprompt") as HTMLDialogElement;
	if (sessionStorage.getItem("clankerprompted") !== "true") {
		clankerprompt.showModal();
		sessionStorage.setItem("clankerprompted", "true");
	}

	document.getElementById("clankerno")?.addEventListener("click", () => clankerprompt.close(), { signal });

	document.getElementById("clankeryes")?.addEventListener(
		"click",
		() => {
			window.location.replace("SHOOCLANKER");
		},
		{ signal },
	);

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

	document.addEventListener(
		"astro:before-swap",
		() => {
			clearInterval(clockInterval);
			listeners.abort();
		},
		{ once: true },
	);
});
