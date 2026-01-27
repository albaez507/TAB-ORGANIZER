// ========================================
// METADATA
// Description: Auto-fetch metadata from URLs using Microlink API
// Dependencies: None
// ========================================

let fetchTimeout;

async function fetchMetadata(url) {
    if (!url.startsWith('http')) return;

    clearTimeout(fetchTimeout);
    fetchTimeout = setTimeout(async () => {
        const status = document.getElementById('auto-status');
        status.innerText = "⏳ Extrayendo info...";
        status.classList.add('loading-pulse');

        try {
            const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
            const { data } = await response.json();

            if (data) {
                document.getElementById('link-title').value = data.title || "";
                document.getElementById('link-desc').value = data.description || "";
                const iconUrl = data.logo?.url || data.image?.url || `https://www.google.com/s2/favicons?sz=128&domain=${new URL(url).hostname}`;
                document.getElementById('link-icon-preview').src = iconUrl;
                status.innerText = "✨ Auto-completado";
            }
        } catch (e) {
            status.innerText = "⚠️ Error al cargar info";
        } finally {
            status.classList.remove('loading-pulse');
        }
    }, 800);
}
