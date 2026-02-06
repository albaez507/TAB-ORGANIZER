// ========================================
// FOCUS MODE
// Description: Video focus mode with player, notes, and navigation
// Dependencies: data.js, storage.js, links.js, ui.js
// ========================================

// ================= RICH TEXT NOTE COMMANDS =================

function focusNoteCmd(command) {
    document.execCommand(command, false, null);
    // Keep focus on the editor
    document.getElementById('focus-full-note').focus();
}

function focusNoteHighlight() {
    // Toggle yellow highlight on selected text
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        if (selectedText) {
            document.execCommand('hiliteColor', false, '#fbbf24');
        }
    }
    document.getElementById('focus-full-note').focus();
}

// ================= FOCUS MODE =================

function openVideoFocusModal(libKey, catKey, linkIndex, type, src) {
    focusLibrary = libKey;
    focusCategory2 = catKey;
    focusLinkIndex = linkIndex;

    loadVideoInFocusMode(libKey, catKey, linkIndex, type, src);

    // Show modal
    document.getElementById('video-focus-modal').classList.add('modal-active');

    // Add ESC listener
    document.addEventListener('keydown', handleFocusEsc);
}

function loadVideoInFocusMode(libKey, catKey, linkIndex, type, src) {
    const link = DATA.libraries[libKey]?.categories[catKey]?.links[linkIndex];
    if (!link) return;

    const lib = DATA.libraries[libKey];
    const cat = lib?.categories[catKey];

    // Update state
    focusLibrary = libKey;
    focusCategory2 = catKey;
    focusLinkIndex = linkIndex;

    // Set title
    document.getElementById('video-focus-title').textContent = link.title || 'Video';

    // Set library and category info
    document.getElementById('focus-lib-icon').textContent = lib?.icon || '📚';
    document.getElementById('focus-lib-name').textContent = lib?.name || 'Library';
    document.getElementById('focus-cat-name').textContent = cat?.name || 'Category';

    // Set status checkboxes (4 states)
    if (!link.status) link.status = { watching: false, watched: false, understood: false, applied: false };
    document.getElementById('focus-watching').checked = link.status.watching || false;
    document.getElementById('focus-watched').checked = link.status.watched || false;
    document.getElementById('focus-understood').checked = link.status.understood || false;
    document.getElementById('focus-applied').checked = link.status.applied || false;

    // Set full note (rich text)
    const fullNoteEl = document.getElementById('focus-full-note');
    fullNoteEl.innerHTML = link.fullNote || '';
    document.getElementById('full-note-char-count').textContent = fullNoteEl.innerText.length;
    document.getElementById('focus-save-status').textContent = '';

    // Set link URL
    document.getElementById('focus-link-url').href = link.url;

    // Set video player
    const playerContainer = document.getElementById('video-focus-player');
    if (type === 'youtube') {
        playerContainer.innerHTML = `<iframe class="w-full h-full" src="${src}?autoplay=1" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    } else {
        playerContainer.innerHTML = `<video controls autoplay class="w-full h-full" src="${src}"></video>`;
    }

    // Populate next videos
    populateNextVideos(libKey, catKey, linkIndex);
}

function populateNextVideos(libKey, catKey, currentIndex) {
    const container = document.getElementById('focus-next-videos');
    container.innerHTML = '';

    const category = DATA.libraries[libKey]?.categories[catKey];
    if (!category || !category.links) {
        container.innerHTML = '<p class="text-slate-500 text-xs text-center py-4">No hay mas videos</p>';
        return;
    }

    const links = category.links;
    let videosAdded = 0;
    const maxVideos = 5;

    // Find videos with embeds (starting from current index + 1, wrapping around)
    for (let offset = 1; offset <= links.length && videosAdded < maxVideos; offset++) {
        const idx = (currentIndex + offset) % links.length;
        if (idx === currentIndex) continue;

        const link = links[idx];
        const embed = getEmbedInfo(link.url);

        if (embed) {
            const isCurrent = idx === currentIndex;
            const ytId = getYouTubeVideoId(link.url);
            const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';

            container.innerHTML += `
                <div class="next-video-item p-2 rounded-lg border border-transparent ${isCurrent ? 'current' : ''} flex items-center gap-3" onclick="navigateToVideo('${libKey}', '${catKey}', ${idx}, '${embed.type}', '${embed.src}')">
                    ${thumbnail ? `<img src="${thumbnail}" class="w-16 h-10 rounded object-cover flex-shrink-0 bg-slate-700">` : `<div class="w-16 h-10 rounded bg-slate-700 flex items-center justify-center text-slate-500">▶</div>`}
                    <div class="flex-1 min-w-0">
                        <p class="text-xs text-white truncate font-medium">${link.title}</p>
                        ${getStatusBadge(link.status) || '<span class="text-[10px] text-slate-500">Sin ver</span>'}
                    </div>
                </div>
            `;
            videosAdded++;
        }
    }

    if (videosAdded === 0) {
        container.innerHTML = '<p class="text-slate-500 text-xs text-center py-4">No hay mas videos</p>';
    }
}

function navigateToVideo(libKey, catKey, linkIndex, type, src) {
    // Save current state first
    saveCurrentFocusState();

    // Load new video
    loadVideoInFocusMode(libKey, catKey, linkIndex, type, src);
}

function saveCurrentFocusState() {
    if (focusLibrary === null) return;

    const link = DATA.libraries[focusLibrary]?.categories[focusCategory2]?.links[focusLinkIndex];
    if (!link) return;

    // Save status
    if (!link.status) link.status = { watching: false, watched: false, understood: false, applied: false };
    link.status.watching = document.getElementById('focus-watching').checked;
    link.status.watched = document.getElementById('focus-watched').checked;
    link.status.understood = document.getElementById('focus-understood').checked;
    link.status.applied = document.getElementById('focus-applied').checked;

    // Save rich text note
    const noteEl = document.getElementById('focus-full-note');
    if (noteEl) {
        link.fullNote = noteEl.innerHTML;
        link.quickNote = noteEl.innerText.substring(0, 100);
    }

    save();
}

function closeVideoFocusModal() {
    // Save current state before closing
    saveCurrentFocusState();

    document.getElementById('video-focus-modal').classList.remove('modal-active');
    document.getElementById('video-focus-player').innerHTML = '';
    document.removeEventListener('keydown', handleFocusEsc);

    focusLibrary = null;
    focusCategory2 = null;
    focusLinkIndex = null;

    render();
}

function handleFocusEsc(e) {
    if (e.key === 'Escape') closeVideoFocusModal();
}

function updateFocusStatus() {
    if (focusLibrary === null) return;

    const link = DATA.libraries[focusLibrary]?.categories[focusCategory2]?.links[focusLinkIndex];
    if (!link) return;

    if (!link.status) link.status = { watching: false, watched: false, understood: false, applied: false };
    link.status.watching = document.getElementById('focus-watching').checked;
    link.status.watched = document.getElementById('focus-watched').checked;
    link.status.understood = document.getElementById('focus-understood').checked;
    link.status.applied = document.getElementById('focus-applied').checked;

    save();
    showFocusSaveIndicator();
}

function debounceSaveFullNote() {
    const noteEl = document.getElementById('focus-full-note');
    document.getElementById('full-note-char-count').textContent = noteEl.innerText.length;
    document.getElementById('focus-save-status').textContent = '⏳ Saving...';

    clearTimeout(fullNoteDebounceTimer);
    fullNoteDebounceTimer = setTimeout(() => {
        if (focusLibrary === null) return;

        const link = DATA.libraries[focusLibrary]?.categories[focusCategory2]?.links[focusLinkIndex];
        if (!link) return;

        link.fullNote = noteEl.innerHTML;
        // Also save first 100 chars of plain text as quickNote for card preview
        link.quickNote = noteEl.innerText.substring(0, 100);
        save();
        showFocusSaveIndicator();
    }, 2000);
}

function showFocusSaveIndicator() {
    document.getElementById('focus-save-status').textContent = '💾 Guardado';
    setTimeout(() => {
        const el = document.getElementById('focus-save-status');
        if (el) el.textContent = '';
    }, 2000);
}
