const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.addEventListener("astro:page-load", () => {
	const nav = document.querySelector<HTMLElement>(".navbar");
	if (!nav) return;

	const arrows = Array.from(document.querySelectorAll<HTMLButtonElement>(".nav-arrow"));
	const listeners = new AbortController();
	const { signal } = listeners;

	const update = () => {
		const maxScroll = nav.scrollWidth - nav.clientWidth;
		for (const arrow of arrows) {
			const direction = Number(arrow.dataset.direction);
			arrow.hidden = direction < 0 ? nav.scrollLeft <= 1 : nav.scrollLeft >= maxScroll - 1;
		}
	};

	for (const arrow of arrows) {
		arrow.addEventListener(
			"click",
			() =>
				nav.scrollBy({
					left: Number(arrow.dataset.direction) * nav.clientWidth * 0.75,
					behavior: reducedMotion.matches ? "auto" : "smooth",
				}),
			{ signal },
		);
	}

	nav.addEventListener("scroll", update, { signal, passive: true });
	const resize = new ResizeObserver(update);
	resize.observe(nav);
	update();

	document.addEventListener(
		"astro:before-swap",
		() => {
			listeners.abort();
			resize.disconnect();
		},
		{ once: true },
	);
});
