// Detect system preference and apply theme
function initializeTheme() {
    // Check if user has saved a preference
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        // Use saved preference
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }
}

// Initialize theme on page load
initializeTheme();
document.addEventListener("astro:after-swap", initializeTheme);

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const newTheme = e.matches ? 'dark' : 'light';
    // Only apply if user hasn't saved a preference
    if (!localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', newTheme);
    }
});

// Toggle theme function for button
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}
// Written by Claude Haiku 4.5