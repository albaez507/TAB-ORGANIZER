// ========================================
// LIBRARIES
// Description: Library CRUD operations and sidebar rendering
// Dependencies: data.js, storage.js, ui.js
// ========================================

function selectLibrary(libKey) {
    if (DATA.libraries[libKey]) {
        DATA.currentLibrary = libKey;
        focusCategory = null;
        save();
        render();
    }
}

function getCurrentLibrary() {
    ensureDataStructure();
    return DATA.libraries[DATA.currentLibrary];
}

function openLibraryModal(key = null) {
    editingLibraryKey = key;
    document.getElementById('library-modal-title').textContent = key ? 'Editar Libreria' : 'Nueva Libreria';
    document.getElementById('lib-name').value = key ? DATA.libraries[key].name : '';

    const selIcon = key ? DATA.libraries[key].icon : '📁';
    renderLibIconPicker(selIcon);

    document.getElementById('library-modal').classList.add('modal-active');
}

function closeLibraryModal() {
    document.getElementById('library-modal').classList.remove('modal-active');
    editingLibraryKey = null;
}

function renderLibIconPicker(selected) {
    const grid = document.getElementById('lib-icon-grid');
    grid.innerHTML = '';
    LIB_ICONS.forEach(icon => {
        const d = document.createElement('div');
        d.className = `cursor-pointer p-2 rounded-xl text-xl bg-white/5 hover:bg-white/10 transition ${icon === selected ? 'ring-2 ring-blue-500' : ''}`;
        d.textContent = icon;
        d.onclick = () => renderLibIconPicker(icon);
        if (icon === selected) d.id = 'selected-lib-icon';
        grid.appendChild(d);
    });
}

function saveLibrary() {
    const name = document.getElementById('lib-name').value.trim();
    if (!name) return;

    const icon = document.getElementById('selected-lib-icon')?.textContent || '📁';

    if (editingLibraryKey) {
        DATA.libraries[editingLibraryKey].name = name;
        DATA.libraries[editingLibraryKey].icon = icon;
    } else {
        const newKey = 'lib_' + Date.now();
        DATA.libraries[newKey] = {
            name,
            icon,
            categories: {}
        };
        DATA.currentLibrary = newKey;
    }

    save();
    closeLibraryModal();
    render();
}

function deleteLibrary(libKey) {
    const libKeys = Object.keys(DATA.libraries);
    if (libKeys.length <= 1) {
        showToast('No puedes eliminar la unica libreria', true);
        return;
    }

    const lib = DATA.libraries[libKey];
    const catCount = Object.keys(lib.categories || {}).length;

    if (!confirm(`Eliminar libreria "${lib.name}"${catCount > 0 ? ` con ${catCount} categoria(s)` : ''}?`)) return;

    delete DATA.libraries[libKey];

    if (DATA.currentLibrary === libKey) {
        DATA.currentLibrary = Object.keys(DATA.libraries)[0];
    }

    save();
    render();
}
