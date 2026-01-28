// ========================================
// UI
// Description: All rendering functions, toasts, and drag & drop handlers
// Dependencies: data.js, links.js
// ========================================

// ================= THEME FUNCTIONS =================
const THEME_STORAGE_KEY = 'tab-organizer-theme';

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme === 'light' ? 'light' : '');
    if (newTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
    }

    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    updateThemeToggleIcon(newTheme);
}

function updateThemeToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    if (theme === 'light') {
        btn.textContent = '☀️';
        btn.title = 'Cambiar a modo oscuro';
    } else {
        btn.textContent = '🌙';
        btn.title = 'Cambiar a modo claro';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    let theme = 'dark'; // default

    if (savedTheme) {
        theme = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        theme = 'light';
    }

    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    updateThemeToggleIcon(theme);
}

// ================= STATUS BADGE HELPER =================
function getStatusBadge(status) {
    if (!status) return '';

    // Priority order: Applied > Understood > Watched > Watching
    if (status.applied) {
        return '<span class="status-badge badge-applied">⭐ Aplicado</span>';
    }
    if (status.understood) {
        return '<span class="status-badge badge-understood">🟢 Entendido</span>';
    }
    if (status.watched) {
        return '<span class="status-badge badge-watched">🔵 Visto</span>';
    }
    if (status.watching) {
        return '<span class="status-badge badge-watching">🟡 Viendo</span>';
    }
    return '';
}

// ========================================
// DRAG & DROP - CLEAN MINIMAL IMPLEMENTATION
// ========================================

// Global drag state
let draggedData = null;
let dragType = null; // 'link' or 'category'
let lastSwapPreviewIndex = null; // Track which card has swap preview

// ================== FUNCIONALIDAD 1 & 2: LINKS ==================

function handleLinkDragStart(event, libKey, catKey, linkIndex) {
    // Prevent link drag from interfering with category drag
    event.stopPropagation();

    // Store dragged link data
    draggedData = { libKey, catKey, linkIndex };
    dragType = 'link';
    lastSwapPreviewIndex = null;

    // Configure drag
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'link',
        libKey,
        catKey,
        linkIndex
    }));

    // Add dragging class to the card
    const card = event.target.closest('.link-card');
    if (card) {
        setTimeout(() => {
            card.classList.add('dragging');
        }, 0);
    }

    // Mark drop zones as available (minimal visual feedback)
    setTimeout(() => {
        document.querySelectorAll('.category-drop-zone').forEach(zone => {
            zone.classList.add('drop-zone-available');
        });
    }, 10);
}

function handleLinkDragEnd(event) {
    // Remover clase dragging
    const card = event.target.closest('.link-card');
    if (card) {
        card.classList.remove('dragging');
    }

    // Limpiar todo el estado
    cleanupAllDragStates();
}

function handleLinkDragOver(event, libKey, catKey) {
    if (dragType !== 'link') return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    const zone = event.currentTarget;

    // Mark this zone as active drop target
    document.querySelectorAll('.drop-target-active').forEach(z => {
        if (z !== zone) z.classList.remove('drop-target-active');
    });

    if (!zone.classList.contains('drop-target-active')) {
        zone.classList.add('drop-target-active');
    }

    // Show swap preview animation for reordering within same category
    if (draggedData && draggedData.libKey === libKey && draggedData.catKey === catKey) {
        showSwapPreview(event, zone);
    } else {
        // For different categories, show simple drop indicator
        showLinkDropIndicator(event, zone);
    }
}

function handleLinkDragLeave(event) {
    const zone = event.currentTarget;
    const relatedTarget = event.relatedTarget;

    // Only remove if we actually left the zone
    if (!zone.contains(relatedTarget)) {
        zone.classList.remove('drop-target-active');
        clearSwapPreviews();
        removeDropIndicators();
    }
}

function handleLinkDrop(event, targetLibKey, targetCatKey) {
    event.preventDefault();
    event.stopPropagation();

    if (dragType !== 'link' || !draggedData) {
        cleanupAllDragStates();
        return;
    }

    const { libKey: sourceLibKey, catKey: sourceCatKey, linkIndex: sourceIndex } = draggedData;

    // Verificar que existen los datos
    const sourceCategory = DATA.libraries[sourceLibKey]?.categories[sourceCatKey];
    if (!sourceCategory || !sourceCategory.links || !sourceCategory.links[sourceIndex]) {
        console.error('Link origen no encontrado');
        cleanupAllDragStates();
        return;
    }

    const targetCategory = DATA.libraries[targetLibKey]?.categories[targetCatKey];
    if (!targetCategory) {
        console.error('Categoría destino no encontrada');
        cleanupAllDragStates();
        return;
    }

    // Copiar el link
    const link = { ...sourceCategory.links[sourceIndex] };

    // FUNCIONALIDAD 2: Reordenar dentro de la misma categoría
    if (sourceLibKey === targetLibKey && sourceCatKey === targetCatKey) {
        const dropIndex = getDropIndex(event, targetLibKey, targetCatKey);

        if (dropIndex !== null && dropIndex !== sourceIndex) {
            // Remover de posición original
            sourceCategory.links.splice(sourceIndex, 1);

            // Insertar en nueva posición (ajustar si movemos hacia abajo)
            const adjustedIndex = dropIndex > sourceIndex ? dropIndex - 1 : dropIndex;
            sourceCategory.links.splice(adjustedIndex, 0, link);

            save();
            render();
            showToast('✅ Link reordenado');
        }
    } else {
        // FUNCIONALIDAD 1: Mover entre categorías
        // Remover de origen
        sourceCategory.links.splice(sourceIndex, 1);

        // Agregar a destino
        if (!targetCategory.links) targetCategory.links = [];

        const dropIndex = getDropIndex(event, targetLibKey, targetCatKey);
        if (dropIndex !== null) {
            targetCategory.links.splice(dropIndex, 0, link);
        } else {
            targetCategory.links.push(link);
        }

        save();
        render();
        showToast(`✅ Link movido a "${targetCategory.name}"`);
    }

    cleanupAllDragStates();
}

// Calcular índice de inserción basado en posición del mouse
function getDropIndex(event, libKey, catKey) {
    const zone = event.currentTarget;
    const linkCards = zone.querySelectorAll('.link-card:not(.dragging)');

    if (linkCards.length === 0) return 0;

    const mouseY = event.clientY;

    for (let i = 0; i < linkCards.length; i++) {
        const card = linkCards[i];
        const rect = card.getBoundingClientRect();
        const cardMiddle = rect.top + rect.height / 2;

        if (mouseY < cardMiddle) {
            return i;
        }
    }

    return linkCards.length;
}

// Show simple drop indicator line for cross-category drops
function showLinkDropIndicator(event, zone) {
    removeDropIndicators();
    clearSwapPreviews();

    const linkCards = zone.querySelectorAll('.link-card:not(.dragging)');
    if (linkCards.length === 0) return;

    const mouseY = event.clientY;
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';

    for (let i = 0; i < linkCards.length; i++) {
        const card = linkCards[i];
        const rect = card.getBoundingClientRect();
        const cardMiddle = rect.top + rect.height / 2;

        if (mouseY < cardMiddle) {
            card.parentNode.insertBefore(indicator, card);
            return;
        }
    }

    // Insert at end
    const lastCard = linkCards[linkCards.length - 1];
    lastCard.parentNode.insertBefore(indicator, lastCard.nextSibling);
}

// Show swap preview animation when reordering within same category
function showSwapPreview(event, zone) {
    removeDropIndicators();

    const linkCards = zone.querySelectorAll('.link-card:not(.dragging)');
    if (linkCards.length === 0) return;

    const mouseY = event.clientY;
    let targetIndex = null;

    // Find which card we're hovering over
    for (let i = 0; i < linkCards.length; i++) {
        const card = linkCards[i];
        const rect = card.getBoundingClientRect();

        if (mouseY >= rect.top && mouseY <= rect.bottom) {
            targetIndex = i;
            break;
        }
    }

    // If hovering between cards, find insertion point
    if (targetIndex === null) {
        for (let i = 0; i < linkCards.length; i++) {
            const card = linkCards[i];
            const rect = card.getBoundingClientRect();
            const cardMiddle = rect.top + rect.height / 2;

            if (mouseY < cardMiddle) {
                targetIndex = i;
                break;
            }
        }
        if (targetIndex === null) {
            targetIndex = linkCards.length;
        }
    }

    // Only update if target changed
    if (targetIndex === lastSwapPreviewIndex) return;
    lastSwapPreviewIndex = targetIndex;

    // Clear previous swap previews
    clearSwapPreviews();

    // Apply swap preview to the target card
    if (targetIndex !== null && targetIndex < linkCards.length) {
        const sourceIndex = draggedData.linkIndex;
        const targetCard = linkCards[targetIndex];

        // Adjust for visual offset: if dragging to a position before/after source
        if (targetIndex !== sourceIndex) {
            if (targetIndex < sourceIndex) {
                targetCard.classList.add('swap-preview');
            } else {
                targetCard.classList.add('swap-preview-down');
            }
        }
    }
}

// Clear all swap preview classes
function clearSwapPreviews() {
    document.querySelectorAll('.swap-preview, .swap-preview-down').forEach(el => {
        el.classList.remove('swap-preview', 'swap-preview-down');
    });
    lastSwapPreviewIndex = null;
}

// ================== FUNCIONALIDAD 3 & 4: CATEGORIES ==================

function handleCategoryDragStart(event, libKey, catKey) {
    // Guardar datos de la categoría siendo arrastrada
    draggedData = { libKey, catKey };
    dragType = 'category';

    // Configurar el drag
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'category',
        libKey,
        catKey
    }));

    // Encontrar la card correcta
    const card = event.target.closest('.category-card');
    if (card) {
        setTimeout(() => {
            card.classList.add('dragging-category');
        }, 0);
    }

    // Resaltar libraries en sidebar como destinos válidos
    setTimeout(() => {
        document.querySelectorAll('.library-item').forEach(lib => {
            lib.classList.add('library-drop-zone');
        });
        // También resaltar otras categorías para reordenamiento
        document.querySelectorAll('.category-card').forEach(cat => {
            if (!cat.classList.contains('dragging-category')) {
                cat.classList.add('category-reorder-zone');
            }
        });
    }, 10);
}

function handleCategoryDragEnd(event) {
    const card = event.target.closest('.category-card');
    if (card) {
        card.classList.remove('dragging-category');
    }

    cleanupAllDragStates();
}

function handleLibraryDragOver(event, targetLibKey) {
    if (dragType !== 'category') return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const libItem = event.currentTarget;

    // Remover active de otras libraries
    document.querySelectorAll('.library-drop-active').forEach(lib => {
        if (lib !== libItem) lib.classList.remove('library-drop-active');
    });

    if (!libItem.classList.contains('library-drop-active')) {
        libItem.classList.add('library-drop-active');
    }
}

function handleLibraryDragLeave(event) {
    const libItem = event.currentTarget;
    const relatedTarget = event.relatedTarget;

    if (!libItem.contains(relatedTarget)) {
        libItem.classList.remove('library-drop-active');
    }
}

function handleLibraryDrop(event, targetLibKey) {
    event.preventDefault();
    event.stopPropagation();

    if (dragType !== 'category' || !draggedData) {
        cleanupAllDragStates();
        return;
    }

    const { libKey: sourceLibKey, catKey } = draggedData;

    // Si es la misma library, no hacer nada
    if (sourceLibKey === targetLibKey) {
        cleanupAllDragStates();
        return;
    }

    const sourceLib = DATA.libraries[sourceLibKey];
    const targetLib = DATA.libraries[targetLibKey];

    if (!sourceLib || !targetLib || !sourceLib.categories[catKey]) {
        cleanupAllDragStates();
        return;
    }

    // FUNCIONALIDAD 3: Mover categoría entre libraries
    const category = { ...sourceLib.categories[catKey] };
    delete sourceLib.categories[catKey];

    if (!targetLib.categories) targetLib.categories = {};
    targetLib.categories[catKey] = category;

    save();
    render();
    showToast(`✅ Categoría movida a "${targetLib.name}"`);

    cleanupAllDragStates();
}

// FUNCIONALIDAD 4: Reordenar categorías dentro de library
function handleCategoryReorderDragOver(event, targetLibKey, targetCatKey) {
    if (dragType !== 'category') return;
    if (!draggedData || draggedData.catKey === targetCatKey) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const card = event.currentTarget;

    // Mostrar indicador de reordenamiento
    removeDropIndicators();

    const rect = card.getBoundingClientRect();
    const mouseY = event.clientY;
    const cardMiddle = rect.top + rect.height / 2;

    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator category-indicator';

    if (mouseY < cardMiddle) {
        card.parentNode.insertBefore(indicator, card);
    } else {
        card.parentNode.insertBefore(indicator, card.nextSibling);
    }
}

function handleCategoryReorderDrop(event, targetLibKey, targetCatKey) {
    event.preventDefault();
    event.stopPropagation();

    if (dragType !== 'category' || !draggedData) {
        cleanupAllDragStates();
        return;
    }

    const { libKey: sourceLibKey, catKey: sourceCatKey } = draggedData;

    // Solo reordenar si es la misma library
    if (sourceLibKey !== targetLibKey) {
        cleanupAllDragStates();
        return;
    }

    // Si es la misma categoría, no hacer nada
    if (sourceCatKey === targetCatKey) {
        cleanupAllDragStates();
        return;
    }

    const lib = DATA.libraries[sourceLibKey];
    if (!lib || !lib.categories) {
        cleanupAllDragStates();
        return;
    }

    // FUNCIONALIDAD 4: Reordenar categorías
    const catKeys = Object.keys(lib.categories);
    const sourceIndex = catKeys.indexOf(sourceCatKey);
    const targetIndex = catKeys.indexOf(targetCatKey);

    if (sourceIndex === -1 || targetIndex === -1) {
        cleanupAllDragStates();
        return;
    }

    // Calcular si insertar antes o después basado en posición del mouse
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const mouseY = event.clientY;
    const cardMiddle = rect.top + rect.height / 2;

    let newIndex = mouseY < cardMiddle ? targetIndex : targetIndex + 1;
    if (newIndex > sourceIndex) newIndex--;

    // Crear nuevo orden
    const movedCatKey = catKeys.splice(sourceIndex, 1)[0];
    catKeys.splice(newIndex, 0, movedCatKey);

    // Reconstruir objeto de categorías en nuevo orden
    const newCategories = {};
    catKeys.forEach(key => {
        newCategories[key] = lib.categories[key];
    });
    lib.categories = newCategories;

    save();
    render();
    showToast('✅ Categoría reordenada');

    cleanupAllDragStates();
}

// ================== HELPERS ==================

function removeDropIndicators() {
    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
}

function cleanupAllDragStates() {
    draggedData = null;
    dragType = null;
    lastSwapPreviewIndex = null;

    // Clean up link drag classes
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drop-zone-available').forEach(el => el.classList.remove('drop-zone-available'));
    document.querySelectorAll('.drop-target-active').forEach(el => el.classList.remove('drop-target-active'));

    // Clean up category drag classes
    document.querySelectorAll('.dragging-category').forEach(el => el.classList.remove('dragging-category'));
    document.querySelectorAll('.library-drop-zone').forEach(el => el.classList.remove('library-drop-zone'));
    document.querySelectorAll('.library-drop-active').forEach(el => el.classList.remove('library-drop-active'));
    document.querySelectorAll('.category-reorder-zone').forEach(el => el.classList.remove('category-reorder-zone'));

    // Clean up swap previews and indicators
    clearSwapPreviews();
    removeDropIndicators();
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

let currentSearchQuery = '';

// Handle search input
function handleSearch(query) {
    currentSearchQuery = query.toLowerCase().trim();

    // Sync both search inputs
    const desktopInput = document.getElementById('search-input');
    const mobileInput = document.getElementById('mobile-search-input');

    if (desktopInput && desktopInput.value !== query) {
        desktopInput.value = query;
    }
    if (mobileInput && mobileInput.value !== query) {
        mobileInput.value = query;
    }

    // Update clear button visibility for all clear buttons
    document.querySelectorAll('.search-clear').forEach(clearBtn => {
        clearBtn.classList.toggle('visible', query.length > 0);
    });

    // Hide shortcut hint when typing
    const shortcutHint = document.querySelector('.search-shortcut');
    if (shortcutHint) {
        shortcutHint.style.display = query.length > 0 ? 'none' : '';
    }

    // Re-render with search filter
    render();
}

// Clear search
function clearSearch() {
    const desktopInput = document.getElementById('search-input');
    const mobileInput = document.getElementById('mobile-search-input');

    if (desktopInput) desktopInput.value = '';
    if (mobileInput) mobileInput.value = '';

    handleSearch('');

    // Focus the appropriate input based on screen size
    if (window.innerWidth >= 768 && desktopInput) {
        desktopInput.focus();
    } else if (mobileInput) {
        mobileInput.focus();
    }
}

// Focus search input (keyboard shortcut)
function focusSearch() {
    // Focus the appropriate input based on screen size
    const desktopInput = document.getElementById('search-input');
    const mobileInput = document.getElementById('mobile-search-input');

    if (window.innerWidth >= 768 && desktopInput) {
        desktopInput.focus();
        desktopInput.select();
    } else if (mobileInput) {
        mobileInput.focus();
        mobileInput.select();
    }
}

// Initialize keyboard shortcuts
function initSearchShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K to focus search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            focusSearch();
        }

        // Escape to clear search if input is focused
        if (e.key === 'Escape') {
            const desktopInput = document.getElementById('search-input');
            const mobileInput = document.getElementById('mobile-search-input');
            const activeElement = document.activeElement;

            if ((desktopInput && activeElement === desktopInput) ||
                (mobileInput && activeElement === mobileInput)) {
                if (currentSearchQuery) {
                    clearSearch();
                } else {
                    activeElement.blur();
                }
            }
        }
    });
}

// Check if a library matches search query
function libraryMatchesSearch(lib, libKey) {
    if (!currentSearchQuery) return true;

    // Check library name
    if (lib.name.toLowerCase().includes(currentSearchQuery)) return true;

    // Check if any category or link in this library matches
    if (lib.categories) {
        for (const catKey in lib.categories) {
            if (categoryMatchesSearch(lib.categories[catKey], libKey, catKey)) {
                return true;
            }
        }
    }

    return false;
}

// Check if a category matches search query
function categoryMatchesSearch(category, libKey, catKey) {
    if (!currentSearchQuery) return true;

    // Check category name
    if (category.name.toLowerCase().includes(currentSearchQuery)) return true;

    // Check category description
    if (category.description && category.description.toLowerCase().includes(currentSearchQuery)) return true;

    // Check if any link in this category matches
    if (category.links) {
        for (const link of category.links) {
            if (linkMatchesSearch(link)) return true;
        }
    }

    return false;
}

// Check if a link matches search query
function linkMatchesSearch(link) {
    if (!currentSearchQuery) return true;

    // Check link title
    if (link.title && link.title.toLowerCase().includes(currentSearchQuery)) return true;

    // Check link description
    if (link.description && link.description.toLowerCase().includes(currentSearchQuery)) return true;

    // Check link URL
    if (link.url && link.url.toLowerCase().includes(currentSearchQuery)) return true;

    // Check quick note
    if (link.quickNote && link.quickNote.toLowerCase().includes(currentSearchQuery)) return true;

    return false;
}

// Initialize search on page load
document.addEventListener('DOMContentLoaded', () => {
    initSearchShortcuts();

    // Update shortcut hint based on platform
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcutHint = document.getElementById('search-shortcut-hint');
    if (shortcutHint && isMac) {
        shortcutHint.textContent = '⌘K';
    }
});

// ================= UI RENDER =================
function render() {
    ensureDataStructure();
    renderLibrarySidebar();
    renderMobileLibraryDropdown();
    renderCategories();
    document.getElementById('manageBtn').innerText = manageCategories ? 'Hecho' : 'Gestionar';
}

function renderLibrarySidebar() {
    const list = document.getElementById('library-list');
    list.innerHTML = '';

    Object.keys(DATA.libraries).forEach(libKey => {
        const lib = DATA.libraries[libKey];
        const isActive = libKey === DATA.currentLibrary;
        const catCount = Object.keys(lib.categories || {}).length;

        // Check if library matches search
        const matchesSearch = libraryMatchesSearch(lib, libKey);

        const div = document.createElement('div');
        div.className = `library-item p-3 rounded-xl border border-transparent ${isActive ? 'active' : ''} ${currentSearchQuery && matchesSearch ? 'search-match' : ''} ${currentSearchQuery && !matchesSearch ? 'search-hidden' : ''}`;

        // Drop handlers for moving categories to this library
        div.ondragover = (e) => handleLibraryDragOver(e, libKey);
        div.ondragleave = (e) => handleLibraryDragLeave(e);
        div.ondrop = (e) => handleLibraryDrop(e, libKey);

        div.innerHTML = `
            <div class="flex items-center gap-2" onclick="selectLibrary('${libKey}')">
                <span class="text-lg">${lib.icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">${lib.name}</p>
                    <p class="text-[10px] text-slate-500">${catCount} cat.</p>
                </div>
            </div>
            ${manageCategories ? `
                <div class="flex gap-1 mt-2 pt-2 border-t border-white/5">
                    <button onclick="event.stopPropagation(); openLibraryModal('${libKey}')" class="flex-1 text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition">Edit</button>
                    <button onclick="event.stopPropagation(); deleteLibrary('${libKey}')" class="flex-1 text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">Del</button>
                </div>
            ` : ''}
        `;
        list.appendChild(div);
    });
}

function renderMobileLibraryDropdown() {
    const dropdown = document.getElementById('mobile-library-dropdown');
    dropdown.innerHTML = '';

    Object.keys(DATA.libraries).forEach(libKey => {
        const lib = DATA.libraries[libKey];
        const option = document.createElement('option');
        option.value = libKey;
        option.textContent = `${lib.icon} ${lib.name}`;
        option.selected = libKey === DATA.currentLibrary;
        dropdown.appendChild(option);
    });
}

function renderCategories() {
    const container = document.getElementById('sections-container');
    container.innerHTML = '';

    const currentLib = getCurrentLibrary();
    if (!currentLib || !currentLib.categories) return;

    const searchAll = document.getElementById('search-all-libraries')?.checked;
    const hasSearchQuery = currentSearchQuery.length > 0;

    // Determine which categories to show
    let categoriesToRender = [];

    // When searching, always search across all libraries
    if (hasSearchQuery || searchAll) {
        // Show categories from all libraries
        Object.keys(DATA.libraries).forEach(libKey => {
            const lib = DATA.libraries[libKey];
            Object.keys(lib.categories || {}).forEach(catKey => {
                const category = lib.categories[catKey];
                // Only include if category matches search
                if (!hasSearchQuery || categoryMatchesSearch(category, libKey, catKey)) {
                    categoriesToRender.push({ libKey, catKey, category });
                }
            });
        });
    } else {
        // Show only current library's categories
        Object.keys(currentLib.categories).forEach(catKey => {
            categoriesToRender.push({
                libKey: DATA.currentLibrary,
                catKey,
                category: currentLib.categories[catKey]
            });
        });
    }

    // Apply focus filter
    if (focusCategory) {
        categoriesToRender = categoriesToRender.filter(item => item.catKey === focusCategory);
    }

    if (categoriesToRender.length === 0) {
        const emptyMessage = hasSearchQuery
            ? `<p class="text-slate-500">No se encontraron resultados para "<span class="text-white">${currentSearchQuery}</span>"</p>
               <button onclick="clearSearch()" class="mt-4 px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition">Limpiar busqueda</button>`
            : `<p class="text-slate-500">No hay categorias en esta libreria.</p>
               <button onclick="openCategoryModal()" class="mt-4 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition">+ Crear Categoria</button>`;

        container.innerHTML = `
            <div class="glass rounded-3xl p-12 text-center">
                ${emptyMessage}
            </div>
        `;
        return;
    }

    categoriesToRender.forEach(({ libKey, catKey, category: s }) => {
        const isOpen = openSections.has(catKey);
        const div = document.createElement('div');
        div.className = `glass category-card rounded-3xl overflow-hidden border-l-[6px] shadow-lg mb-6 transition-all`;
        div.style.borderColor = s.color;

        // FUNCIONALIDAD 4: Drop handlers para reordenar categorías
        div.ondragover = (e) => handleCategoryReorderDragOver(e, libKey, catKey);
        div.ondrop = (e) => handleCategoryReorderDrop(e, libKey, catKey);

        div.innerHTML = `
            <div class="category-header flex flex-col md:flex-row justify-between items-start md:items-center p-6 cursor-pointer hover:bg-white/[0.02] transition"
                 draggable="true"
                 ondragstart="handleCategoryDragStart(event, '${libKey}', '${catKey}')"
                 ondragend="handleCategoryDragEnd(event)"
                 onclick="toggleSectionDisplay('${catKey}')">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-4">
                        <span class="category-drag-handle text-slate-500 hover:text-slate-300 text-lg" title="Arrastra para mover">⋮⋮</span>
                        <span class="text-3xl">${s.icon}</span>
                        <h2 class="text-xl font-bold text-white uppercase tracking-tight">${s.name}</h2>
                        ${s.progress ? `<span class="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-bold border border-blue-500/30 uppercase">${s.progress}</span>` : ''}
                        ${(searchAll || hasSearchQuery) ? `<span class="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400">${DATA.libraries[libKey].icon} ${DATA.libraries[libKey].name}</span>` : ''}
                    </div>
                    ${s.description ? `<p class="text-xs text-slate-500 ml-12 mt-1 line-clamp-1">${s.description}</p>` : ''}
                </div>
                <div class="flex items-center gap-3 mt-4 md:mt-0" onclick="event.stopPropagation()">
                    <button class="px-4 py-2 rounded-xl text-xs font-bold text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 transition" onclick="addLink('${libKey}', '${catKey}')">+ LINK</button>
                    <button class="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-700 transition" onclick="toggleFocus('${catKey}')">${focusCategory===catKey?'EXIT':'FOCUS'}</button>
                    ${manageCategories ? `
                        <button class="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 transition" onclick="openCategoryModal('${libKey}', '${catKey}')">EDIT</button>
                        <button class="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/20 text-red-500 hover:bg-red-500/30 transition" onclick="deleteCategory('${libKey}', '${catKey}')">DEL</button>
                    ` : ''}
                </div>
            </div>

            <div class="${isOpen ? '' : 'hidden'} p-6 pt-0 bg-black/10 border-t border-white/5 transition-all">
                <div class="mb-6 p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4 mt-6 group" onclick="event.stopPropagation()">
                    <div class="w-1.5 h-10 rounded-full" style="background:${s.color}"></div>
                    <div class="flex-1">
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nota de categoria</p>
                        <input class="w-full bg-transparent text-sm font-medium text-white outline-none focus:text-blue-400 transition"
                               value="${s.task || ''}" placeholder="Nota general de esta categoria..."
                               onkeydown="if(event.key==='Enter') { saveTask('${libKey}', '${catKey}', this.value); this.blur(); }"
                               onblur="saveTask('${libKey}', '${catKey}', this.value)">
                    </div>
                </div>

                <div class="category-drop-zone grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[100px] rounded-xl p-2 transition-all"
                     ondragover="handleLinkDragOver(event, '${libKey}', '${catKey}')"
                     ondragleave="handleLinkDragLeave(event)"
                     ondrop="handleLinkDrop(event, '${libKey}', '${catKey}')">
                    ${renderLinks(libKey, catKey)}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderLinks(libKey, catKey) {
    const category = DATA.libraries[libKey]?.categories[catKey];
    if (!category) return '';

    const links = category.links || [];
    const taskText = (category.task || '').toLowerCase().trim();
    const taskWords = taskText.split(/\s+/).filter(w => w.length > 2);

    // Filter links based on search query
    const filteredLinks = currentSearchQuery
        ? links.map((link, index) => ({ link, index, matches: linkMatchesSearch(link) }))
        : links.map((link, index) => ({ link, index, matches: true }));

    const visibleLinks = filteredLinks.filter(item => item.matches);

    if (!links.length) return `<div class="col-span-full py-8 text-center text-slate-600 italic">Lista vacia - arrastra links aqui</div>`;

    if (visibleLinks.length === 0 && currentSearchQuery) {
        return `<div class="col-span-full py-8 text-center text-slate-600 italic">No hay links que coincidan con la busqueda</div>`;
    }

    return filteredLinks.map(({ link: l, index: i, matches }) => {
        // Hide non-matching links with CSS class
        const hiddenClass = !matches ? 'search-hidden' : '';
        const titleMatch = taskWords.some(word => l.title.toLowerCase().includes(word));
        const descMatch = taskWords.some(word => (l.description || '').toLowerCase().includes(word));
        const isSmart = taskWords.length > 0 && (titleMatch || descMatch);
        const embed = getEmbedInfo(l.url);
        const pid = `${libKey}-${catKey}-${i}`;

        // Ensure status object exists with all fields
        if (!l.status) {
            l.status = { watching: false, watched: false, understood: false, applied: false };
        }

        let cardClass = "glass-card link-card p-4 rounded-2xl border flex flex-col gap-4 group ";
        if (isSmart) cardClass += "smart-highlight ";
        if (hiddenClass) cardClass += hiddenClass;

        const statusBadge = getStatusBadge(l.status);

        return `
        <div class="${cardClass}"
             draggable="true"
             ondragstart="handleLinkDragStart(event, '${libKey}', '${catKey}', ${i})"
             ondragend="handleLinkDragEnd(event)"
             title="Arrastra para mover o reordenar"
             onclick="event.stopPropagation()">
            <div class="flex justify-between items-start gap-3">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="flex flex-col items-center gap-1">
                        <span class="link-drag-handle">⋮⋮</span>
                        <img src="${l.icon || 'https://www.google.com/s2/favicons?sz=64&domain=' + l.url}" class="w-10 h-10 rounded-lg bg-slate-800 object-contain p-1 border border-white/5 shadow-inner flex-shrink-0">
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <a href="${l.url}" target="_blank" class="text-sm font-bold text-blue-400 hover:underline truncate" onclick="event.stopPropagation()">
                                ${l.title}
                            </a>
                            ${statusBadge}
                        </div>
                        <p class="text-[10px] text-slate-500 truncate mt-0.5">${l.description || 'Sin detalles'}</p>

                        <!-- Inline Status (4 checkboxes) -->
                        <div class="flex items-center gap-3 mt-2 flex-wrap">
                            <label class="flex items-center gap-1 cursor-pointer text-[10px]">
                                <input type="checkbox" class="status-checkbox watching" ${l.status.watching ? 'checked' : ''} onchange="toggleLinkStatus('${libKey}', '${catKey}', ${i}, 'watching', this.checked)">
                                <span class="${l.status.watching ? 'text-yellow-400' : 'text-slate-500'}">🟡</span>
                            </label>
                            <label class="flex items-center gap-1 cursor-pointer text-[10px]">
                                <input type="checkbox" class="status-checkbox watched" ${l.status.watched ? 'checked' : ''} onchange="toggleLinkStatus('${libKey}', '${catKey}', ${i}, 'watched', this.checked)">
                                <span class="${l.status.watched ? 'text-blue-400' : 'text-slate-500'}">🔵</span>
                            </label>
                            <label class="flex items-center gap-1 cursor-pointer text-[10px]">
                                <input type="checkbox" class="status-checkbox understood" ${l.status.understood ? 'checked' : ''} onchange="toggleLinkStatus('${libKey}', '${catKey}', ${i}, 'understood', this.checked)">
                                <span class="${l.status.understood ? 'text-emerald-400' : 'text-slate-500'}">🟢</span>
                            </label>
                            <label class="flex items-center gap-1 cursor-pointer text-[10px]">
                                <input type="checkbox" class="status-checkbox applied" ${l.status.applied ? 'checked' : ''} onchange="toggleLinkStatus('${libKey}', '${catKey}', ${i}, 'applied', this.checked)">
                                <span class="${l.status.applied ? 'text-amber-400' : 'text-slate-500'}">⭐</span>
                            </label>
                        </div>

                        <!-- Quick Note Display -->
                        ${l.quickNote ? `<p class="text-[10px] text-slate-400 mt-2 italic truncate">📝 ${l.quickNote}</p>` : ''}
                    </div>
                </div>
                <div class="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button class="text-blue-400/60 hover:text-blue-400 transition" onclick="editLink('${libKey}', '${catKey}', ${i})" title="Editar">✏️</button>
                    <button class="text-red-500/40 hover:text-red-500 transition" onclick="deleteLink('${libKey}', '${catKey}', ${i})" title="Eliminar">🗑️</button>
                </div>
            </div>
            ${embed ? `
                <div class="flex gap-2">
                    <button class="flex-1 py-1.5 rounded-lg bg-white/5 text-[9px] font-bold text-slate-500 uppercase hover:bg-white/10 transition" onclick="togglePreview('${pid}', '${embed.type}', '${embed.src}')">Ver Preview</button>
                    <button class="px-3 py-1.5 rounded-lg bg-purple-500/20 text-[9px] font-bold text-purple-400 uppercase hover:bg-purple-500/30 transition" onclick="openVideoFocusModal('${libKey}', '${catKey}', ${i}, '${embed.type}', '${embed.src}')">🎬 Focus</button>
                </div>
                <div id="preview-${pid}"></div>
            ` : ''}
        </div>`;
    }).join('');
}

// ================= TOAST =================
function showToast(message, isError = false) {
    const toast = document.getElementById('toast-notification');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-message');

    icon.textContent = isError ? '❌' : '✅';
    msg.textContent = message;
    toast.classList.remove('bg-emerald-600', 'bg-red-600');
    toast.classList.add(isError ? 'bg-red-600' : 'bg-emerald-600');

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}
