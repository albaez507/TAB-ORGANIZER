// ========================================
// SHARE PREVIEW
// Description: Full-screen preview of shared libraries with selective import
// Dependencies: config.js, data.js, auth.js, storage.js, notifications.js, ui.js
// ========================================

let sharePreviewActive = false;
let sharePreviewShare = null;

// ===== OPEN / CLOSE =====

async function openSharePreview(shareId) {
    // Find in local state first
    let share = pendingShares.find(s => s.id === shareId);

    // Fallback: fetch from Supabase if not in local state
    if (!share && currentUser) {
        try {
            const { data, error } = await _supabase
                .from('shared_libraries')
                .select('id, sender_email, library_name, library_icon, library_data, created_at, seen_at, status')
                .eq('id', shareId)
                .single();
            if (!error && data) share = data;
        } catch (err) {
            console.error('Error fetching share:', err);
        }
    }

    if (!share) {
        showToast('No se encontro la libreria compartida', true);
        return;
    }

    sharePreviewActive = true;
    sharePreviewShare = share;

    // Close notification panel
    if (typeof closeNotificationPanel === 'function') closeNotificationPanel();

    // Populate header
    const iconEl = document.getElementById('share-preview-icon');
    const titleEl = document.getElementById('share-preview-title');
    const senderEl = document.getElementById('share-preview-sender');
    const timeEl = document.getElementById('share-preview-time');
    const messageEl = document.getElementById('share-preview-message');

    if (iconEl) iconEl.textContent = share.library_icon || '📁';
    if (titleEl) titleEl.textContent = share.library_name || 'Sin nombre';
    if (senderEl) senderEl.textContent = `Compartido por ${share.sender_email || 'Desconocido'}`;
    if (timeEl) timeEl.textContent = typeof timeAgo === 'function' ? timeAgo(share.created_at) : '';

    // Show optional message
    const msg = share.library_data?.message;
    if (messageEl) {
        if (msg) {
            messageEl.textContent = `"${msg}"`;
            messageEl.classList.remove('hidden');
        } else {
            messageEl.classList.add('hidden');
        }
    }

    // Build tree view
    buildImportTree(share.library_data);

    // Reset toggle all button
    const toggleBtn = document.getElementById('import-toggle-all-btn');
    if (toggleBtn) toggleBtn.textContent = 'Deseleccionar Todo';

    // Hide import choice if open
    const choicePopover = document.getElementById('import-choice-popover');
    if (choicePopover) choicePopover.classList.add('hidden');

    // Show overlay
    const overlay = document.getElementById('share-preview-overlay');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // ESC listener
    document.addEventListener('keydown', handleSharePreviewEsc);

    // Mark as seen (non-blocking)
    if (!share.seen_at) {
        _supabase
            .from('shared_libraries')
            .update({ seen_at: new Date().toISOString() })
            .eq('id', shareId)
            .then(() => {
                share.seen_at = new Date().toISOString();
            });
    }
}

function closeSharePreview() {
    const overlay = document.getElementById('share-preview-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleSharePreviewEsc);

    sharePreviewActive = false;
    sharePreviewShare = null;
}

function handleSharePreviewEsc(e) {
    if (e.key === 'Escape') {
        closeSharePreview();
    }
}

// ===== TREE VIEW =====

function buildImportTree(libraryData) {
    const container = document.getElementById('share-preview-tree');
    if (!container) return;

    const categories = libraryData?.categories || [];

    if (categories.length === 0) {
        container.innerHTML = '<p class="import-tree-empty">Esta libreria no tiene contenido</p>';
        return;
    }

    // Count totals
    let totalCats = categories.length;
    let totalLinks = 0;
    categories.forEach(cat => { totalLinks += (cat.links || []).length; });

    const summaryEl = document.getElementById('share-preview-summary');
    if (summaryEl) {
        summaryEl.textContent = `${totalCats} categoria${totalCats !== 1 ? 's' : ''} · ${totalLinks} link${totalLinks !== 1 ? 's' : ''}`;
    }

    let html = '';
    categories.forEach((cat, catIdx) => {
        const links = cat.links || [];

        html += `<div class="import-tree-category">
            <label class="import-tree-cat-label">
                <input type="checkbox" class="import-cat-cb" data-cat-idx="${catIdx}" checked onchange="toggleImportCategory(${catIdx}, this.checked)" />
                <span class="import-tree-cat-icon">📁</span>
                <span class="import-tree-cat-name">${escapeSharePreviewHtml(cat.name || 'Sin nombre')}</span>
                <span class="import-tree-cat-count">${links.length}</span>
                <span class="import-tree-expand${links.length === 0 ? ' invisible' : ''}" onclick="event.preventDefault(); toggleImportCategoryExpand(${catIdx})" title="Expandir/colapsar">▼</span>
            </label>
            <div class="import-tree-links" id="import-tree-links-${catIdx}">
                ${links.map((link, linkIdx) => `
                    <label class="import-tree-link-label">
                        <input type="checkbox" class="import-link-cb" data-cat-idx="${catIdx}" data-link-idx="${linkIdx}" checked onchange="updateImportCategoryCheckState(${catIdx})" />
                        <span class="import-tree-link-title">${escapeSharePreviewHtml(link.title || link.url || 'Sin titulo')}</span>
                        ${link.link_type && link.link_type !== 'other' ? `<span class="import-link-type-badge import-link-type-${link.link_type}">${getLinkTypeLabel(link.link_type)}</span>` : ''}
                    </label>
                `).join('')}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function getLinkTypeLabel(type) {
    const labels = { video: 'Video', article: 'Articulo', repository: 'Repo', reference: 'Docs' };
    return labels[type] || type;
}

function escapeSharePreviewHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== CHECKBOX CONTROLS =====

function toggleImportCategory(catIdx, checked) {
    const linkCbs = document.querySelectorAll(`.import-link-cb[data-cat-idx="${catIdx}"]`);
    linkCbs.forEach(cb => { cb.checked = checked; });
    updateImportToggleAllBtnText();
}

function updateImportCategoryCheckState(catIdx) {
    const linkCbs = document.querySelectorAll(`.import-link-cb[data-cat-idx="${catIdx}"]`);
    const catCb = document.querySelector(`.import-cat-cb[data-cat-idx="${catIdx}"]`);
    if (!catCb || linkCbs.length === 0) return;

    const allChecked = Array.from(linkCbs).every(cb => cb.checked);
    const someChecked = Array.from(linkCbs).some(cb => cb.checked);

    catCb.checked = allChecked;
    catCb.indeterminate = !allChecked && someChecked;
    updateImportToggleAllBtnText();
}

function toggleImportCategoryExpand(catIdx) {
    const linksDiv = document.getElementById(`import-tree-links-${catIdx}`);
    if (!linksDiv) return;

    linksDiv.classList.toggle('collapsed');

    const catDiv = linksDiv.closest('.import-tree-category');
    if (catDiv) {
        const arrow = catDiv.querySelector('.import-tree-expand');
        if (arrow) arrow.classList.toggle('rotated');
    }
}

function toggleAllImportItems() {
    const allCatCbs = document.querySelectorAll('.import-cat-cb');
    const allLinkCbs = document.querySelectorAll('.import-link-cb');

    const allChecked = Array.from(allCatCbs).every(cb => cb.checked) &&
                       Array.from(allLinkCbs).every(cb => cb.checked);

    const newState = !allChecked;
    allCatCbs.forEach(cb => { cb.checked = newState; cb.indeterminate = false; });
    allLinkCbs.forEach(cb => { cb.checked = newState; });

    updateImportToggleAllBtnText();
}

function updateImportToggleAllBtnText() {
    const btn = document.getElementById('import-toggle-all-btn');
    if (!btn) return;

    const allCatCbs = document.querySelectorAll('.import-cat-cb');
    const allLinkCbs = document.querySelectorAll('.import-link-cb');
    const allChecked = Array.from(allCatCbs).every(cb => cb.checked) &&
                       Array.from(allLinkCbs).every(cb => cb.checked);

    btn.textContent = allChecked ? 'Deseleccionar Todo' : 'Seleccionar Todo';
}

// ===== IMPORT =====

function showImportOptions() {
    // Validate at least one item selected
    const checkedLinks = document.querySelectorAll('.import-link-cb:checked');
    if (checkedLinks.length === 0) {
        showToast('Selecciona al menos un item para importar', true);
        return;
    }

    const popover = document.getElementById('import-choice-popover');
    if (popover) {
        popover.classList.toggle('hidden');
    }
}

function hideImportOptions() {
    const popover = document.getElementById('import-choice-popover');
    if (popover) popover.classList.add('hidden');
}

async function importAsNewLibrary() {
    hideImportOptions();
    await doImport('new');
}

async function importIntoCurrentLibrary() {
    hideImportOptions();
    await doImport('current');
}

async function doImport(mode) {
    if (!sharePreviewShare) return;

    const libraryData = sharePreviewShare.library_data;
    const categories = libraryData?.categories || [];
    if (categories.length === 0) return;

    // Build filtered snapshot from checked items
    const importedCategories = {};
    let importedCount = 0;

    categories.forEach((cat, catIdx) => {
        const checkedLinks = document.querySelectorAll(`.import-link-cb[data-cat-idx="${catIdx}"]:checked`);
        if (checkedLinks.length === 0) return;

        const catKey = 'cat_' + Date.now() + '_' + catIdx;
        const links = [];

        checkedLinks.forEach(cb => {
            const linkIdx = parseInt(cb.dataset.linkIdx);
            const link = (cat.links || [])[linkIdx];
            if (!link) return;

            // Migrate to full DATA format
            links.push({
                url: link.url || '',
                title: link.title || 'Sin titulo',
                description: '',
                icon: link.thumbnail || '',
                status: { watching: false, watched: false, understood: false, applied: false },
                quickNote: link.notes || '',
                fullNote: '',
                linkNotes: ''
            });
        });

        importedCategories[catKey] = {
            name: cat.name || 'Sin nombre',
            icon: '📁',
            color: '',
            progress: '',
            description: '',
            task: '',
            notes: cat.notes || '',
            links
        };

        importedCount += links.length;
    });

    if (Object.keys(importedCategories).length === 0) {
        showToast('No hay items seleccionados para importar', true);
        return;
    }

    ensureDataStructure();

    if (mode === 'new') {
        // Create new library
        const libKey = 'lib_' + Date.now();
        DATA.libraries[libKey] = {
            name: (sharePreviewShare.library_name || 'Compartido') + ' (compartido)',
            icon: sharePreviewShare.library_icon || '📁',
            categories: importedCategories
        };
        DATA.currentLibrary = libKey;
    } else {
        // Merge into current library
        const currentLib = getCurrentLibrary();
        if (!currentLib) {
            showToast('No hay libreria seleccionada', true);
            return;
        }
        Object.keys(importedCategories).forEach(catKey => {
            currentLib.categories[catKey] = importedCategories[catKey];
        });
    }

    save();
    render();

    // Update Supabase status to accepted
    const shareId = sharePreviewShare.id;
    try {
        await _supabase
            .from('shared_libraries')
            .update({ status: 'accepted' })
            .eq('id', shareId);
    } catch (err) {
        console.error('Error updating share status:', err);
    }

    // Remove from pending shares and update badge
    pendingShares = pendingShares.filter(s => s.id !== shareId);
    updateNotificationBadge();

    closeSharePreview();

    const catCount = Object.keys(importedCategories).length;
    showToast(`Importado: ${catCount} categoria${catCount !== 1 ? 's' : ''}, ${importedCount} link${importedCount !== 1 ? 's' : ''}`);
}

// ===== DISMISS FROM PREVIEW =====

async function dismissFromPreview() {
    if (!sharePreviewShare) return;

    const shareId = sharePreviewShare.id;

    try {
        await _supabase
            .from('shared_libraries')
            .update({ status: 'declined' })
            .eq('id', shareId);
    } catch (err) {
        console.error('Error declining share:', err);
        showToast('Error al descartar', true);
        return;
    }

    pendingShares = pendingShares.filter(s => s.id !== shareId);
    updateNotificationBadge();

    closeSharePreview();
    showToast('Libreria compartida descartada');
}
