// ========================================
// UI
// Description: All rendering functions, toasts, and drag & drop handlers
// Dependencies: data.js, links.js
// ========================================

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

// ================= DRAG & DROP =================
let draggedLinkData = null;
let draggedCategoryData = null;

// --- LINK DRAG & DROP ---
function handleLinkDragStart(event, libKey, catKey, linkIndex) {
    draggedLinkData = { libKey, catKey, linkIndex };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify(draggedLinkData));
    event.target.classList.add('dragging');

    // Highlight all category drop zones
    setTimeout(() => {
        document.querySelectorAll('.category-drop-zone').forEach(zone => {
            zone.classList.add('drop-target-link');
        });
    }, 0);
}

function handleLinkDragEnd(event) {
    event.target.classList.remove('dragging');
    draggedLinkData = null;

    // Remove all highlights
    document.querySelectorAll('.drop-target-link').forEach(zone => {
        zone.classList.remove('drop-target-link');
    });
    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
}

function handleLinkDragOver(event, targetLibKey, targetCatKey, targetIndex) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Show drop indicator for reordering
    if (draggedLinkData && draggedLinkData.catKey === targetCatKey && draggedLinkData.libKey === targetLibKey) {
        showDropIndicator(event.target, targetIndex);
    }
}

function handleCategoryDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function showDropIndicator(targetElement, targetIndex) {
    // Remove existing indicators
    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

    // Find the link card container
    const card = targetElement.closest('.link-card');
    if (!card) return;

    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';

    const rect = card.getBoundingClientRect();
    const mouseY = event.clientY;
    const cardMiddle = rect.top + rect.height / 2;

    if (mouseY < cardMiddle) {
        card.parentNode.insertBefore(indicator, card);
    } else {
        card.parentNode.insertBefore(indicator, card.nextSibling);
    }
}

function handleLinkDrop(event, targetLibKey, targetCatKey, targetIndex = null) {
    event.preventDefault();
    event.stopPropagation();

    if (!draggedLinkData) return;

    const { libKey: sourceLibKey, catKey: sourceCatKey, linkIndex: sourceIndex } = draggedLinkData;

    // Get the link data
    const sourceCategory = DATA.libraries[sourceLibKey]?.categories[sourceCatKey];
    if (!sourceCategory || !sourceCategory.links[sourceIndex]) return;

    const link = { ...sourceCategory.links[sourceIndex] };

    // Same category = reorder
    if (sourceLibKey === targetLibKey && sourceCatKey === targetCatKey) {
        if (targetIndex !== null && targetIndex !== sourceIndex) {
            // Reorder within same category
            const links = sourceCategory.links;
            links.splice(sourceIndex, 1);
            const newIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
            links.splice(newIndex, 0, link);

            save();
            render();
            showToast('✅ Link reordenado');
        }
    } else {
        // Move to different category
        const targetCategory = DATA.libraries[targetLibKey]?.categories[targetCatKey];
        if (!targetCategory) return;

        // Remove from source
        sourceCategory.links.splice(sourceIndex, 1);

        // Add to target
        if (!targetCategory.links) targetCategory.links = [];
        if (targetIndex !== null) {
            targetCategory.links.splice(targetIndex, 0, link);
        } else {
            targetCategory.links.push(link);
        }

        save();
        render();
        showToast(`✅ Link movido a ${targetCategory.name}`);
    }

    // Cleanup
    draggedLinkData = null;
    document.querySelectorAll('.drop-target-link').forEach(zone => {
        zone.classList.remove('drop-target-link');
    });
    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
}

// --- CATEGORY DRAG & DROP ---
function handleCategoryDragStart(event, libKey, catKey) {
    draggedCategoryData = { libKey, catKey };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify(draggedCategoryData));
    event.target.closest('.category-card').classList.add('dragging');

    // Highlight library drop targets
    setTimeout(() => {
        document.querySelectorAll('.library-item').forEach(lib => {
            lib.classList.add('library-drop-target');
        });
    }, 0);
}

function handleCategoryDragEnd(event) {
    const card = event.target.closest('.category-card');
    if (card) card.classList.remove('dragging');
    draggedCategoryData = null;

    // Remove highlights
    document.querySelectorAll('.library-drop-target').forEach(lib => {
        lib.classList.remove('library-drop-target');
    });
    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
}

function handleLibraryDragOver(event) {
    if (!draggedCategoryData) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleLibraryDrop(event, targetLibKey) {
    event.preventDefault();
    event.stopPropagation();

    if (!draggedCategoryData) return;

    const { libKey: sourceLibKey, catKey } = draggedCategoryData;

    // Don't do anything if dropping on same library
    if (sourceLibKey === targetLibKey) {
        draggedCategoryData = null;
        return;
    }

    const sourceLib = DATA.libraries[sourceLibKey];
    const targetLib = DATA.libraries[targetLibKey];

    if (!sourceLib || !targetLib || !sourceLib.categories[catKey]) return;

    // Move category
    const category = sourceLib.categories[catKey];
    delete sourceLib.categories[catKey];

    if (!targetLib.categories) targetLib.categories = {};
    targetLib.categories[catKey] = category;

    save();
    render();
    showToast(`✅ Categoria movida a ${targetLib.name}`);

    draggedCategoryData = null;
    document.querySelectorAll('.library-drop-target').forEach(lib => {
        lib.classList.remove('library-drop-target');
    });
}

// --- CATEGORY REORDER WITHIN LIBRARY ---
function handleCategoryReorderDragOver(event, targetLibKey, targetCatKey) {
    if (!draggedCategoryData) return;
    if (draggedCategoryData.libKey !== targetLibKey) return; // Only reorder within same library

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Show indicator
    const card = event.target.closest('.category-card');
    if (!card || targetCatKey === draggedCategoryData.catKey) return;

    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';

    const rect = card.getBoundingClientRect();
    const mouseY = event.clientY;
    const cardMiddle = rect.top + rect.height / 2;

    if (mouseY < cardMiddle) {
        card.parentNode.insertBefore(indicator, card);
    } else {
        card.parentNode.insertBefore(indicator, card.nextSibling);
    }
}

function handleCategoryReorderDrop(event, targetLibKey, targetCatKey) {
    event.preventDefault();
    event.stopPropagation();

    if (!draggedCategoryData) return;
    if (draggedCategoryData.libKey !== targetLibKey) return;
    if (draggedCategoryData.catKey === targetCatKey) return;

    const lib = DATA.libraries[targetLibKey];
    if (!lib || !lib.categories) return;

    // Get current order of categories
    const catKeys = Object.keys(lib.categories);
    const sourceIndex = catKeys.indexOf(draggedCategoryData.catKey);
    const targetIndex = catKeys.indexOf(targetCatKey);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Reorder by rebuilding the categories object
    const sourceCatKey = draggedCategoryData.catKey;
    const sourceCategory = lib.categories[sourceCatKey];

    // Create new ordered object
    const newCategories = {};
    catKeys.splice(sourceIndex, 1);
    catKeys.splice(targetIndex, 0, sourceCatKey);

    catKeys.forEach(key => {
        newCategories[key] = lib.categories[key];
    });

    lib.categories = newCategories;

    save();
    render();
    showToast('✅ Categoria reordenada');

    draggedCategoryData = null;
    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
}

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

        const div = document.createElement('div');
        div.className = `library-item p-3 rounded-xl border border-transparent ${isActive ? 'active' : ''}`;
        div.ondragover = (e) => handleLibraryDragOver(e);
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

    // Determine which categories to show
    let categoriesToRender = [];

    if (searchAll) {
        // Show categories from all libraries
        Object.keys(DATA.libraries).forEach(libKey => {
            const lib = DATA.libraries[libKey];
            Object.keys(lib.categories || {}).forEach(catKey => {
                categoriesToRender.push({ libKey, catKey, category: lib.categories[catKey] });
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
        container.innerHTML = `
            <div class="glass rounded-3xl p-12 text-center">
                <p class="text-slate-500">No hay categorias en esta libreria.</p>
                <button onclick="openCategoryModal()" class="mt-4 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition">+ Crear Categoria</button>
            </div>
        `;
        return;
    }

    categoriesToRender.forEach(({ libKey, catKey, category: s }) => {
        const isOpen = openSections.has(catKey);
        const div = document.createElement('div');
        div.className = `glass category-card rounded-3xl overflow-hidden border-l-[6px] shadow-lg mb-6 transition-all`;
        div.style.borderColor = s.color;
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
                        <span class="drag-handle text-slate-600 hover:text-slate-400 mr-1">⋮⋮</span>
                        <span class="text-3xl">${s.icon}</span>
                        <h2 class="text-xl font-bold text-white uppercase tracking-tight">${s.name}</h2>
                        ${s.progress ? `<span class="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-bold border border-blue-500/30 uppercase">${s.progress}</span>` : ''}
                        ${searchAll ? `<span class="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400">${DATA.libraries[libKey].icon} ${DATA.libraries[libKey].name}</span>` : ''}
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

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 category-drop-zone"
                     ondragover="handleCategoryDragOver(event)"
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

    if (!links.length) return `<div class="col-span-full py-6 text-center text-slate-600 italic">Lista vacia.</div>`;

    return links.map((l, i) => {
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
        if (isSmart) cardClass += "smart-highlight";

        const statusBadge = getStatusBadge(l.status);

        return `
        <div class="${cardClass}"
             draggable="true"
             ondragstart="handleLinkDragStart(event, '${libKey}', '${catKey}', ${i})"
             ondragend="handleLinkDragEnd(event)"
             ondragover="handleLinkDragOver(event, '${libKey}', '${catKey}', ${i})"
             ondrop="handleLinkDrop(event, '${libKey}', '${catKey}', ${i})"
             onclick="event.stopPropagation()">
            <div class="flex justify-between items-start gap-3">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="flex flex-col items-center gap-1">
                        <span class="drag-handle text-slate-600 hover:text-slate-400 cursor-grab text-xs">⋮⋮</span>
                        <img src="${l.icon || 'https://www.google.com/s2/favicons?sz=64&domain=' + l.url}" class="w-10 h-10 rounded-lg bg-slate-800 object-contain p-1 border border-white/5 shadow-inner flex-shrink-0">
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <a href="${l.url}" target="_blank" class="text-sm font-bold text-blue-400 hover:underline truncate">
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
