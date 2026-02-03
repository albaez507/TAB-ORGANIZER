// ========================================
// LINKS
// Description: Link CRUD operations and status tracking
// Dependencies: data.js, storage.js, ui.js
// ========================================

let activeLinkLibKey = null;

function addLink(libKey, catKey) {
    activeLinkLibKey = libKey;
    activeCategory = catKey;
    editingLinkIndex = null;
    document.getElementById('link-modal-title').textContent = 'Nuevo Link';
    document.getElementById('link-url').value = "";
    document.getElementById('link-title').value = '';
    document.getElementById('link-desc').value = '';
    document.getElementById('link-icon-preview').src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    document.getElementById('auto-status').innerText = "";
    document.getElementById('link-modal').classList.add('modal-active');
}

function editLink(libKey, catKey, i) {
    activeLinkLibKey = libKey;
    activeCategory = catKey;
    editingLinkIndex = i;
    const link = DATA.libraries[libKey].categories[catKey].links[i];
    document.getElementById('link-modal-title').textContent = 'Editar Link';
    document.getElementById('link-url').value = link.url || '';
    document.getElementById('link-title').value = link.title || '';
    document.getElementById('link-desc').value = link.description || '';
    document.getElementById('link-icon-preview').src = link.icon || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    document.getElementById('auto-status').innerText = "";
    document.getElementById('link-modal').classList.add('modal-active');
}

function saveLink() {
    const existingLink = editingLinkIndex !== null
        ? DATA.libraries[activeLinkLibKey].categories[activeCategory].links[editingLinkIndex]
        : null;

    const l = {
        url: document.getElementById('link-url').value,
        title: document.getElementById('link-title').value || 'Sin Titulo',
        description: document.getElementById('link-desc').value,
        icon: document.getElementById('link-icon-preview').src,
        status: existingLink?.status || { watching: false, watched: false, understood: false, applied: false },
        quickNote: existingLink?.quickNote || '',
        fullNote: existingLink?.fullNote || '',
        linkNotes: existingLink?.linkNotes || ''
    };

    if (!l.url) return;

    if (editingLinkIndex !== null) {
        DATA.libraries[activeLinkLibKey].categories[activeCategory].links[editingLinkIndex] = l;
    } else {
        DATA.libraries[activeLinkLibKey].categories[activeCategory].links.push(l);
    }

    save();
    closeLinkModal();
    render();
}

function closeLinkModal() {
    document.getElementById('link-modal').classList.remove('modal-active');
}

function deleteLink(libKey, catKey, i, buttonElement) {
    if (confirm('Borrar link?')) {
        // If called with button element, use animated delete
        if (buttonElement && typeof animateItemDelete === 'function') {
            const card = buttonElement.closest('.link-card, .compact-link-row, .expanded-link-card, .organize-item');
            animateItemDelete(card, () => {
                DATA.libraries[libKey].categories[catKey].links.splice(i, 1);
                save();
                render();
            });
        } else {
            // Fallback to immediate delete
            DATA.libraries[libKey].categories[catKey].links.splice(i, 1);
            save();
            render();
        }
    }
}

function toggleLinkStatus(libKey, catKey, linkIndex, field, value) {
    const link = DATA.libraries[libKey]?.categories[catKey]?.links[linkIndex];
    if (!link) return;

    if (!link.status) link.status = { watching: false, watched: false, understood: false, applied: false };
    link.status[field] = value;

    save();
    render();
    showToast('💾 Guardado', false);
}

function saveLinkNote(libKey, catKey, linkIndex, note) {
    const link = DATA.libraries[libKey]?.categories[catKey]?.links[linkIndex];
    if (!link) return;

    link.quickNote = note.substring(0, 100);
    save();
    showToast('💾 Guardado', false);
}

// Save notes for non-video links
let linkNotesDebounceTimer = null;
function saveLinkNotes(libKey, catKey, linkIndex, notes) {
    const link = DATA.libraries[libKey]?.categories[catKey]?.links[linkIndex];
    if (!link) return;

    link.linkNotes = notes.substring(0, 500);

    // Update character count
    const countEl = document.getElementById(`link-notes-count-${libKey}-${catKey}-${linkIndex}`);
    if (countEl) countEl.textContent = link.linkNotes.length;

    // Debounced save
    clearTimeout(linkNotesDebounceTimer);
    linkNotesDebounceTimer = setTimeout(() => {
        save();
        showToast('💾 Notas guardadas', false);
    }, 800);
}

// ================= EMBED HELPERS =================
function getYouTubeVideoId(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.replace('/','');
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    } catch(e) {}
    return null;
}

function getEmbedInfo(url) {
    const ytId = getYouTubeVideoId(url);
    if (ytId) return { type:'youtube', src:`https://www.youtube-nocookie.com/embed/${ytId}` };
    if (url.match(/\.(mp4|webm)$/i)) return { type:'file', src:url };
    return null;
}

function togglePreview(id, type, src) {
    const el = document.getElementById(`preview-${id}`);
    if (el.innerHTML) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="aspect-video bg-black rounded-xl overflow-hidden mt-3 border border-white/10">${type === 'file' ? `<video controls class="w-full h-full" src="${src}"></video>` : `<iframe class="w-full h-full" src="${src}" allowfullscreen></iframe>`}</div>`;
}
