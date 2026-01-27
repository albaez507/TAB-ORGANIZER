// ========================================
// CATEGORIES
// Description: Category CRUD operations and management
// Dependencies: data.js, storage.js, ui.js
// ========================================

let editingLibKey = null;

function openCategoryModal(libKey = null, catKey = null) {
    editingLibKey = libKey || DATA.currentLibrary;
    editingCategoryKey = catKey;

    const category = catKey ? DATA.libraries[editingLibKey]?.categories[catKey] : null;

    document.getElementById('category-modal-title').textContent = catKey ? 'Editar Categoria' : 'Nueva Categoria';
    document.getElementById('cat-name').value = category ? category.name : '';
    document.getElementById('cat-progress').value = category ? category.progress : '';
    document.getElementById('cat-desc').value = category ? category.description : '';

    renderPickers(category ? category.icon : '📁', category ? category.color : '#4a9eff');
    document.getElementById('category-modal').classList.add('modal-active');
}

function renderPickers(selI, selC) {
    const ig = document.getElementById('icon-grid');
    ig.innerHTML = '';
    ICONS.forEach(i => {
        const d = document.createElement('div');
        d.className = `cursor-pointer p-2 rounded-xl text-xl bg-white/5 hover:bg-white/10 ${i===selI ? 'ring-2 ring-blue-500' : ''}`;
        d.textContent = i;
        d.onclick = () => renderPickers(i, selC);
        ig.appendChild(d);
        if (i===selI) d.id = "selected-icon";
    });
    const cg = document.getElementById('color-grid');
    cg.innerHTML = '';
    COLORS.forEach(c => {
        const d = document.createElement('div');
        d.className = `w-8 h-8 rounded-full cursor-pointer border-2 transition hover:scale-110 ${c===selC ? 'border-white' : 'border-transparent'}`;
        d.style.background = c;
        d.onclick = () => renderPickers(selI, c);
        cg.appendChild(d);
        if (c===selC) d.id = "selected-color";
    });
}

function saveCategory() {
    const name = document.getElementById('cat-name').value.trim();
    if (!name) return;

    const data = {
        name,
        icon: document.getElementById('selected-icon').textContent,
        color: document.getElementById('selected-color').style.backgroundColor,
        progress: document.getElementById('cat-progress').value,
        description: document.getElementById('cat-desc').value,
        links: editingCategoryKey ? DATA.libraries[editingLibKey].categories[editingCategoryKey].links : [],
        task: editingCategoryKey ? DATA.libraries[editingLibKey].categories[editingCategoryKey].task : ''
    };

    if (editingCategoryKey) {
        DATA.libraries[editingLibKey].categories[editingCategoryKey] = data;
    } else {
        DATA.libraries[editingLibKey].categories['cat_' + Date.now()] = data;
    }

    save();
    closeCategoryModal();
    render();
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('modal-active');
}

function deleteCategory(libKey, catKey) {
    if (confirm(`Borrar categoria completa?`)) {
        delete DATA.libraries[libKey].categories[catKey];
        save();
        render();
    }
}

function toggleManageCategories() {
    manageCategories = !manageCategories;
    render();
}

function toggleFocus(k) {
    focusCategory = (focusCategory === k) ? null : k;
    render();
}

function toggleSectionDisplay(k) {
    if (openSections.has(k)) openSections.delete(k);
    else openSections.add(k);
    render();
}

function saveTask(libKey, catKey, val) {
    if (DATA.libraries[libKey]?.categories[catKey]) {
        DATA.libraries[libKey].categories[catKey].task = val;
        save();
        render();
    }
}
