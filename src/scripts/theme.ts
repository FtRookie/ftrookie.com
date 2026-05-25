function applyTheme() {
    const saved = localStorage.getItem('theme');
    const theme = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function setup() {
    applyTheme();
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
}

setup();
document.addEventListener('astro:after-swap', setup);

document.addEventListener('astro:before-swap', (event) => {
    const theme = document.documentElement.getAttribute('data-theme');
    if (!theme) return;
    const e = event as unknown as { swap: () => void };
    const originalSwap = e.swap;
    e.swap = () => {
        originalSwap();
        document.documentElement.setAttribute('data-theme', theme);
    };
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
});
