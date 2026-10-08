function syncToggle() {
	const isDark = document.documentElement.getAttribute("data-theme") === "dark";
	document.getElementById("theme-toggle")?.setAttribute("aria-pressed", String(isDark));
}

function toggleTheme() {
	const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
	document.documentElement.setAttribute("data-theme", newTheme);
	localStorage.setItem("theme", newTheme);
	syncToggle();
}

function setup() {
	document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
	syncToggle();
}

setup();
document.addEventListener("astro:after-swap", setup);

document.addEventListener("astro:before-swap", (event) => {
	const theme = document.documentElement.getAttribute("data-theme");
	if (!theme) return;
	const e = event as unknown as { swap: () => void };
	const originalSwap = e.swap;
	e.swap = () => {
		originalSwap();
		document.documentElement.setAttribute("data-theme", theme);
	};
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
	if (!localStorage.getItem("theme")) {
		document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
		syncToggle();
	}
});
