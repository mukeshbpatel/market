async function loadSiteMenu() {
    const menuContainer = document.getElementById('siteMenu');
    if (!menuContainer) return;

    try {
        const response = await fetch('/common/menu.html');
        if (!response.ok) throw new Error('Menu not found');
        const html = await response.text();
        menuContainer.innerHTML = html;
    } catch (error) {
        console.warn('Failed to load shared menu:', error);
        menuContainer.innerHTML = `
            <nav class="nav-menu">
                <a href="index.html">Monthly Tracker</a>
                <a href="weekly.html">Weekly Tracker</a>
                <a href="beta.html">Beta Grid</a>
                <a href="technical.html">Technical Analysis</a>
                <a href="fundamental.html">Fundamental Analysis</a>
            </nav>
        `;
    }
}

document.addEventListener('DOMContentLoaded', loadSiteMenu);
