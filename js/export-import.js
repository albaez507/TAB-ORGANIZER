// ========================================
// EXPORT/IMPORT
// Description: Export and Import functionality with conflict resolution
// Dependencies: data.js, storage.js, ui.js
// ========================================

let importData = null;
let importConflicts = {};

// ===== EXPORT =====
function openExportModal() {
    const list = document.getElementById('export-categories-list');
    list.innerHTML = '';

    Object.keys(DATA.libraries).forEach(libKey => {
        const lib = DATA.libraries[libKey];
        const catKeys = Object.keys(lib.categories || {});

        // Library header
        list.innerHTML += `
            <div class="p-3 rounded-xl bg-slate-700/30 border border-slate-600/50 mb-2">
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" class="export-lib-checkbox w-5 h-5 rounded accent-blue-500" data-lib-key="${libKey}" checked onchange="toggleLibraryExport('${libKey}', this.checked)" />
                    <span class="text-xl">${lib.icon}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-white font-medium">${lib.name}</p>
                        <p class="text-slate-500 text-xs">${catKeys.length} categoria(s)</p>
                    </div>
                </label>
                <div class="ml-8 mt-2 space-y-1" id="export-lib-${libKey}">
                    ${catKeys.map(catKey => {
                        const cat = lib.categories[catKey];
                        const linksCount = cat.links?.length || 0;
                        return `
                            <label class="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition text-sm">
                                <input type="checkbox" class="export-cat-checkbox w-4 h-4 rounded accent-blue-500" data-lib-key="${libKey}" data-cat-key="${catKey}" checked />
                                <span>${cat.icon}</span>
                                <span class="text-slate-300 truncate flex-1">${cat.name}</span>
                                <span class="text-slate-500 text-xs">${linksCount} links</span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    if (Object.keys(DATA.libraries).length === 0) {
        list.innerHTML = '<p class="text-slate-500 text-center py-4">No hay datos para exportar</p>';
    }

    document.getElementById('export-modal').classList.add('modal-active');
}

function toggleLibraryExport(libKey, checked) {
    document.querySelectorAll(`#export-lib-${libKey} .export-cat-checkbox`).forEach(cb => {
        cb.checked = checked;
    });
}

function closeExportModal() {
    document.getElementById('export-modal').classList.remove('modal-active');
}

function selectAllExport(select) {
    document.querySelectorAll('.export-lib-checkbox, .export-cat-checkbox').forEach(cb => cb.checked = select);
}

function executeExport() {
    const exportData = {
        version: "3.0",
        exportDate: new Date().toISOString(),
        libraries: {}
    };

    // Collect selected libraries and categories
    document.querySelectorAll('.export-lib-checkbox:checked').forEach(libCb => {
        const libKey = libCb.dataset.libKey;
        const lib = DATA.libraries[libKey];

        exportData.libraries[libKey] = {
            name: lib.name,
            icon: lib.icon,
            categories: {}
        };

        document.querySelectorAll(`.export-cat-checkbox[data-lib-key="${libKey}"]:checked`).forEach(catCb => {
            const catKey = catCb.dataset.catKey;
            exportData.libraries[libKey].categories[catKey] = lib.categories[catKey];
        });
    });

    const totalLibs = Object.keys(exportData.libraries).length;
    let totalCats = 0;
    Object.values(exportData.libraries).forEach(lib => {
        totalCats += Object.keys(lib.categories).length;
    });

    if (totalLibs === 0) {
        showToast('Selecciona al menos una libreria', true);
        return;
    }

    exportData.totalLibraries = totalLibs;
    exportData.totalCategories = totalCats;

    // Generate filename
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const filename = `tab-organizer-export-${dateStr}.json`;

    // Download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    closeExportModal();
    showToast(`Exportadas ${totalLibs} libreria(s) con ${totalCats} categoria(s)`);
}

// ===== IMPORT =====
function openImportModal() {
    document.getElementById('import-file-input').value = '';
    document.getElementById('import-error').classList.add('hidden');
    document.getElementById('import-modal').classList.add('modal-active');
}

function closeImportModal() {
    document.getElementById('import-modal').classList.remove('modal-active');
}

function showImportError(message) {
    const el = document.getElementById('import-error');
    el.textContent = message;
    el.classList.remove('hidden');
}

function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function migrateLinkForImport(link) {
    // Ensure all fields exist for imported links
    return {
        url: link.url,
        title: link.title,
        description: link.description || '',
        icon: link.icon,
        status: {
            watching: link.status?.watching || false,
            watched: link.status?.watched || link.isWatching || false,
            understood: link.status?.understood || false,
            applied: link.status?.applied || false
        },
        quickNote: link.quickNote || '',
        fullNote: link.fullNote || ''
    };
}

function handleImportFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Check if it's old format (v1) or new format (v2/v3)
            if (data.categories && !data.libraries) {
                // Old format - convert to new format for import
                data.libraries = {
                    ['imported_' + Date.now()]: {
                        name: 'Importado',
                        icon: '📥',
                        categories: {}
                    }
                };

                Object.keys(data.categories).forEach(catKey => {
                    const cat = data.categories[catKey];
                    // Migrate links to new format
                    const migratedLinks = (cat.links || []).map(migrateLinkForImport);

                    data.libraries[Object.keys(data.libraries)[0]].categories[catKey] = {
                        ...cat,
                        links: migratedLinks
                    };
                });

                delete data.categories;
                data.version = "3.0";
            } else if (data.libraries) {
                // Migrate links in v2/v3 format to ensure all fields exist
                Object.keys(data.libraries).forEach(libKey => {
                    const lib = data.libraries[libKey];
                    Object.keys(lib.categories || {}).forEach(catKey => {
                        const cat = lib.categories[catKey];
                        cat.links = (cat.links || []).map(migrateLinkForImport);
                    });
                });
            }

            // Validate new format structure
            if (!data.libraries || typeof data.libraries !== 'object') {
                showImportError('Archivo invalido: estructura no reconocida');
                return;
            }

            importData = data;
            closeImportModal();
            showImportPreview();

        } catch (err) {
            showImportError('Error al parsear JSON: ' + err.message);
        }
    };

    reader.onerror = function() {
        showImportError('Error al leer el archivo');
    };

    reader.readAsText(file);
}

function showImportPreview() {
    if (!importData) return;

    importConflicts = {};

    let totalLibs = Object.keys(importData.libraries).length;
    let totalCats = 0;
    let totalLinks = 0;

    Object.values(importData.libraries).forEach(lib => {
        const cats = Object.keys(lib.categories || {}).length;
        totalCats += cats;
        Object.values(lib.categories || {}).forEach(cat => {
            totalLinks += (cat.links || []).length;
        });
    });

    // Update summary
    const summary = document.getElementById('import-summary');
    summary.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <span class="text-slate-400">Version:</span>
            <span class="text-white font-medium">${importData.version || '1.0'}</span>
        </div>
        <div class="flex justify-between items-center mb-2">
            <span class="text-slate-400">Fecha exportacion:</span>
            <span class="text-white font-medium">${importData.exportDate ? new Date(importData.exportDate).toLocaleDateString() : 'N/A'}</span>
        </div>
        <div class="flex justify-between items-center mb-2">
            <span class="text-slate-400">Librerias:</span>
            <span class="text-white font-medium">${totalLibs}</span>
        </div>
        <div class="flex justify-between items-center mb-2">
            <span class="text-slate-400">Categorias:</span>
            <span class="text-white font-medium">${totalCats}</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="text-slate-400">Links totales:</span>
            <span class="text-white font-medium">${totalLinks}</span>
        </div>
    `;

    // Check for conflicts (libraries with same name)
    const existingLibNames = {};
    Object.keys(DATA.libraries).forEach(key => {
        existingLibNames[DATA.libraries[key].name.toLowerCase()] = key;
    });

    const newLibraries = [];
    const conflicts = [];

    Object.keys(importData.libraries).forEach(importKey => {
        const lib = importData.libraries[importKey];
        const nameLower = lib.name.toLowerCase();

        if (existingLibNames[nameLower]) {
            conflicts.push({
                importKey,
                existingKey: existingLibNames[nameLower],
                name: lib.name,
                catCount: Object.keys(lib.categories || {}).length
            });
            importConflicts[importKey] = 'merge';
        } else {
            newLibraries.push({
                importKey,
                name: lib.name,
                icon: lib.icon,
                catCount: Object.keys(lib.categories || {}).length
            });
        }
    });

    // Show new libraries
    const newSection = document.getElementById('import-new-section');
    const newList = document.getElementById('import-new-list');
    if (newLibraries.length > 0) {
        newSection.classList.remove('hidden');
        newList.innerHTML = newLibraries.map(lib => `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span class="text-xl">${lib.icon || '📁'}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-white font-medium truncate">${lib.name}</p>
                    <p class="text-emerald-400 text-xs">${lib.catCount} categoria(s)</p>
                </div>
                <span class="text-emerald-400 text-xs font-bold">NUEVA</span>
            </div>
        `).join('');
    } else {
        newSection.classList.add('hidden');
    }

    // Show conflicts
    const conflictsSection = document.getElementById('import-conflicts-section');
    const conflictsList = document.getElementById('import-conflicts-list');
    if (conflicts.length > 0) {
        conflictsSection.classList.remove('hidden');
        conflictsList.innerHTML = conflicts.map(conf => `
            <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div class="flex items-center gap-3 mb-3">
                    <span class="text-xl">${importData.libraries[conf.importKey].icon || '📁'}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-white font-medium truncate">${conf.name}</p>
                        <p class="text-amber-400 text-xs">${conf.catCount} categoria(s)</p>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2">
                    <label class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition text-xs">
                        <input type="radio" name="conflict-${conf.importKey}" value="merge" checked onchange="importConflicts['${conf.importKey}']='merge'" class="accent-blue-500" />
                        <span class="text-slate-300">Fusionar categorias</span>
                    </label>
                    <label class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition text-xs">
                        <input type="radio" name="conflict-${conf.importKey}" value="rename" onchange="importConflicts['${conf.importKey}']='rename'" class="accent-amber-500" />
                        <span class="text-slate-300">Crear como nueva</span>
                    </label>
                    <label class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition text-xs">
                        <input type="radio" name="conflict-${conf.importKey}" value="skip" onchange="importConflicts['${conf.importKey}']='skip'" class="accent-red-500" />
                        <span class="text-slate-300">Saltar</span>
                    </label>
                </div>
            </div>
        `).join('');
    } else {
        conflictsSection.classList.add('hidden');
    }

    document.getElementById('import-preview-modal').classList.add('modal-active');
}

function closeImportPreviewModal() {
    document.getElementById('import-preview-modal').classList.remove('modal-active');
    importData = null;
    importConflicts = {};
}

async function executeImport() {
    if (!importData) return;

    // Map existing library names to keys
    const existingLibNames = {};
    Object.keys(DATA.libraries).forEach(key => {
        existingLibNames[DATA.libraries[key].name.toLowerCase()] = key;
    });

    let imported = 0;
    let skipped = 0;

    Object.keys(importData.libraries).forEach(importKey => {
        const lib = importData.libraries[importKey];
        const nameLower = lib.name.toLowerCase();
        const existingKey = existingLibNames[nameLower];

        if (existingKey) {
            const resolution = importConflicts[importKey] || 'merge';

            if (resolution === 'skip') {
                skipped++;
                return;
            }

            if (resolution === 'merge') {
                // Merge categories into existing library
                Object.keys(lib.categories || {}).forEach(catKey => {
                    const newCatKey = 'cat_imported_' + Date.now() + '_' + catKey;
                    DATA.libraries[existingKey].categories[newCatKey] = lib.categories[catKey];
                });
                imported++;
                return;
            }

            if (resolution === 'rename') {
                // Create as new library with modified name
                const newKey = 'lib_imported_' + Date.now();
                DATA.libraries[newKey] = {
                    ...lib,
                    name: lib.name + ' (importado)'
                };
                imported++;
                return;
            }
        } else {
            // New library, add directly
            const newKey = 'lib_imported_' + Date.now() + '_' + importKey;
            DATA.libraries[newKey] = { ...lib };
            imported++;
        }
    });

    await save();
    render();

    closeImportPreviewModal();
    showToast(`Importacion completada: ${imported} libreria(s)${skipped > 0 ? `, ${skipped} saltada(s)` : ''}`);
}
