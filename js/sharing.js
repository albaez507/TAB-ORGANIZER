// ========================================
// SHARING
// Description: Share library snapshots with other users via Supabase
// Dependencies: config.js, data.js, libraries.js, auth.js, ui.js
// ========================================

// ===== BUTTON VISIBILITY =====

function updateShareButtonVisibility() {
    const btn = document.getElementById('share-library-btn');
    if (!btn) return;
    if (currentUser && !isGuest) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
    } else {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
    }
}

// ===== SHARE MODAL =====

function openShareModal() {
    const lib = getCurrentLibrary();
    if (!lib) return;
    document.getElementById('share-modal-title').textContent = `Compartir "${lib.name}"`;
    document.getElementById('share-email').value = '';
    document.getElementById('share-error').classList.add('hidden');
    document.getElementById('share-error').textContent = '';

    // Reset message area
    const msgWrapper = document.getElementById('share-message-wrapper');
    const msgInput = document.getElementById('share-message');
    const msgCount = document.getElementById('share-message-count');
    if (msgWrapper) msgWrapper.classList.add('hidden');
    if (msgInput) msgInput.value = '';
    if (msgCount) msgCount.textContent = '0/200';

    // Reset toggle all button
    const toggleBtn = document.getElementById('share-toggle-all-btn');
    if (toggleBtn) toggleBtn.textContent = 'Deseleccionar Todo';

    document.getElementById('share-modal').classList.remove('hidden');

    // Build tree view
    buildShareTree();
}

function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
}

function showShareError(msg) {
    const el = document.getElementById('share-error');
    el.textContent = msg;
    el.classList.remove('hidden');
}

// ===== TREE VIEW =====

function buildShareTree() {
    const lib = getCurrentLibrary();
    if (!lib) return;
    const container = document.getElementById('share-tree-container');
    if (!container) return;

    const catKeys = Object.keys(lib.categories || {});

    if (catKeys.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-sm text-center py-4">Esta libreria esta vacia</p>';
        return;
    }

    let html = '';
    catKeys.forEach(catKey => {
        const cat = lib.categories[catKey];
        const links = cat.links || [];
        const catIcon = cat.icon || '📁';

        html += `<div class="share-tree-category">
            <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition">
                <input type="checkbox" class="share-cat-cb w-4 h-4 rounded accent-blue-500" data-cat-key="${catKey}" checked onchange="toggleShareCategory('${catKey}', this.checked)" />
                <span>${catIcon}</span>
                <span class="text-white text-sm font-medium flex-1 truncate">${escapeShareHtml(cat.name || 'Sin nombre')}</span>
                <span class="text-slate-500 text-xs">${links.length}</span>
                <span class="share-tree-expand" onclick="event.preventDefault(); toggleShareCategoryExpand('${catKey}')" title="Expandir/colapsar">▼</span>
            </label>
            <div class="share-tree-links ml-6 mt-1 space-y-0.5" id="share-tree-links-${catKey}">
                ${links.map((link, idx) => `
                    <label class="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer transition text-xs">
                        <input type="checkbox" class="share-link-cb w-3.5 h-3.5 rounded accent-blue-500" data-cat-key="${catKey}" data-link-idx="${idx}" checked onchange="updateShareCategoryCheckState('${catKey}')" />
                        <span class="text-slate-300 truncate flex-1">${escapeShareHtml(link.title || link.url || 'Sin titulo')}</span>
                    </label>
                `).join('')}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function escapeShareHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function toggleShareCategory(catKey, checked) {
    const linkCbs = document.querySelectorAll(`.share-link-cb[data-cat-key="${catKey}"]`);
    linkCbs.forEach(cb => { cb.checked = checked; });
    updateToggleAllBtnText();
}

function updateShareCategoryCheckState(catKey) {
    const linkCbs = document.querySelectorAll(`.share-link-cb[data-cat-key="${catKey}"]`);
    const catCb = document.querySelector(`.share-cat-cb[data-cat-key="${catKey}"]`);
    if (!catCb || linkCbs.length === 0) return;

    const allChecked = Array.from(linkCbs).every(cb => cb.checked);
    const someChecked = Array.from(linkCbs).some(cb => cb.checked);

    catCb.checked = allChecked;
    catCb.indeterminate = !allChecked && someChecked;
    updateToggleAllBtnText();
}

function toggleShareCategoryExpand(catKey) {
    const linksDiv = document.getElementById(`share-tree-links-${catKey}`);
    if (!linksDiv) return;

    linksDiv.classList.toggle('collapsed');

    // Rotate the expand arrow
    const catDiv = linksDiv.closest('.share-tree-category');
    if (catDiv) {
        const arrow = catDiv.querySelector('.share-tree-expand');
        if (arrow) arrow.classList.toggle('rotated');
    }
}

function toggleAllShareItems() {
    const allCatCbs = document.querySelectorAll('.share-cat-cb');
    const allLinkCbs = document.querySelectorAll('.share-link-cb');

    // Check if all are currently checked
    const allChecked = Array.from(allCatCbs).every(cb => cb.checked) &&
                       Array.from(allLinkCbs).every(cb => cb.checked);

    const newState = !allChecked;
    allCatCbs.forEach(cb => { cb.checked = newState; cb.indeterminate = false; });
    allLinkCbs.forEach(cb => { cb.checked = newState; });

    updateToggleAllBtnText();
}

function updateToggleAllBtnText() {
    const btn = document.getElementById('share-toggle-all-btn');
    if (!btn) return;

    const allCatCbs = document.querySelectorAll('.share-cat-cb');
    const allLinkCbs = document.querySelectorAll('.share-link-cb');
    const allChecked = Array.from(allCatCbs).every(cb => cb.checked) &&
                       Array.from(allLinkCbs).every(cb => cb.checked);

    btn.textContent = allChecked ? 'Deseleccionar Todo' : 'Seleccionar Todo';
}

// ===== MESSAGE =====

function toggleShareMessage() {
    const wrapper = document.getElementById('share-message-wrapper');
    if (!wrapper) return;
    wrapper.classList.toggle('hidden');
    if (!wrapper.classList.contains('hidden')) {
        document.getElementById('share-message')?.focus();
    }
}

function updateShareMessageCount() {
    const input = document.getElementById('share-message');
    const count = document.getElementById('share-message-count');
    if (input && count) {
        count.textContent = `${input.value.length}/200`;
    }
}

// ===== LINK TYPE DETECTION =====

function detectLinkType(url) {
    if (!url) return 'other';
    const u = url.toLowerCase();
    if (u.includes('youtube.com/watch') || u.includes('youtu.be/') || u.includes('vimeo.com/')) return 'video';
    if (u.includes('github.com/') || u.includes('gitlab.com/') || u.includes('bitbucket.org/')) return 'repository';
    if (u.includes('medium.com/') || u.includes('dev.to/') || u.includes('blog') || u.includes('article')) return 'article';
    if (u.includes('docs.') || u.includes('documentation') || u.includes('wiki') || u.includes('reference')) return 'reference';
    return 'other';
}

// ===== SNAPSHOT BUILDER (reads from tree checkboxes) =====

function buildLibrarySnapshot() {
    const lib = getCurrentLibrary();
    if (!lib) return null;

    const categories = [];
    let catPos = 0;

    // Read checked categories from the tree view
    const checkedCats = document.querySelectorAll('.share-cat-cb');
    checkedCats.forEach(catCb => {
        const catKey = catCb.dataset.catKey;
        const cat = lib.categories[catKey];
        if (!cat) return;

        // Skip unchecked categories that have no checked links
        const checkedLinks = document.querySelectorAll(`.share-link-cb[data-cat-key="${catKey}"]:checked`);
        if (checkedLinks.length === 0) return;

        const links = [];
        checkedLinks.forEach(linkCb => {
            const idx = parseInt(linkCb.dataset.linkIdx);
            const link = (cat.links || [])[idx];
            if (!link) return;
            links.push({
                title: link.title || '',
                url: link.url || '',
                thumbnail: link.thumbnail || '',
                link_type: detectLinkType(link.url),
                notes: link.notes || '',
                position: links.length
            });
        });

        categories.push({
            name: cat.name || '',
            position: catPos++,
            notes: cat.notes || '',
            links
        });
    });

    // Build snapshot with optional message
    const snapshot = { categories };
    const message = document.getElementById('share-message')?.value?.trim() || '';
    if (message) {
        snapshot.message = message;
    }

    return snapshot;
}

// ===== SEND =====

async function sendSharedLibrary() {
    const emailInput = document.getElementById('share-email');
    const email = emailInput.value.trim().toLowerCase();

    // Validate email
    if (!email) {
        showShareError('Ingresa un email.');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showShareError('Email no valido.');
        return;
    }

    // Prevent self-sharing
    if (currentUser && currentUser.email && email === currentUser.email.toLowerCase()) {
        showShareError('No puedes compartir contigo mismo.');
        return;
    }

    const lib = getCurrentLibrary();
    if (!lib) {
        showShareError('No hay libreria seleccionada.');
        return;
    }

    const snapshot = buildLibrarySnapshot();
    if (!snapshot) {
        showShareError('Error al construir los datos.');
        return;
    }

    // Validate at least one item is selected
    if (!snapshot.categories || snapshot.categories.length === 0) {
        showShareError('Selecciona al menos un item para compartir.');
        return;
    }

    try {
        const { error } = await _supabase.from('shared_libraries').insert({
            sender_id: currentUser.id,
            sender_email: currentUser.email,
            recipient_email: email,
            library_name: lib.name,
            library_icon: lib.icon || '📁',
            library_data: snapshot,
            status: 'sent'
        });

        if (error) throw error;

        closeShareModal();
        showToast(`Libreria compartida con ${email}`);
    } catch (err) {
        console.error('Share error:', err);
        showShareError('Error al compartir. Intenta de nuevo.');
    }
}
