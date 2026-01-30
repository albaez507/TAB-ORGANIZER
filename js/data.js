// ========================================
// DATA
// Description: Data structure, migration, and global state variables
// Dependencies: None
// ========================================

// NEW DATA STRUCTURE
let DATA = {
    libraries: {},
    currentLibrary: null
};

let openSections = new Set();
let activeCategory = null, activeIndex = null, focusCategory = null, manageCategories = false, editingCategoryKey = null;
let editingLinkIndex = null;

// Organize mode state - tracks which categories are in organize mode
let organizeMode = new Set();
let editingLibraryKey = null;
let currentUser = null;
let isGuest = false;

// Video focus mode state
let focusLibrary = null;
let focusCategory2 = null;
let focusLinkIndex = null;
let noteDebounceTimer = null;
let fullNoteDebounceTimer = null;

const ICONS = ['📁','📚','🎬','🧠','⭐','🎯','🛠️','🧾','💡','📌','🗂️','🧩','🧪','🔖'];
const LIB_ICONS = ['📁','📚','💼','🏠','🎮','🎵','📖','💻','🎨','📷','✈️','🍳','💪','🎓','💰','❤️'];
const COLORS = ['#4a9eff','#a78bfa','#fbbf24','#4ade80','#ef4444','#22d3ee','#f472b6'];

// ================= MIGRATION =================
function migrateOldData(oldData) {
    // Check if already in new format
    if (oldData.libraries) {
        // Migrate existing data to include new status fields
        Object.keys(oldData.libraries).forEach(libKey => {
            const lib = oldData.libraries[libKey];
            Object.keys(lib.categories || {}).forEach(catKey => {
                const cat = lib.categories[catKey];
                (cat.links || []).forEach(link => {
                    // Ensure status has all 4 fields
                    if (!link.status) {
                        link.status = { watching: false, watched: false, understood: false, applied: false };
                    } else {
                        // Add missing fields
                        if (link.status.watching === undefined) link.status.watching = false;
                        if (link.status.understood === undefined) link.status.understood = false;
                        // Keep existing watched/applied values
                    }
                    // Ensure fullNote exists
                    if (link.fullNote === undefined) link.fullNote = '';
                    // Ensure quickNote exists
                    if (link.quickNote === undefined) link.quickNote = '';
                    // Ensure linkNotes exists (for non-video links)
                    if (link.linkNotes === undefined) link.linkNotes = '';
                });
            });
        });
        return oldData;
    }

    // Old format: { "categoryKey": { name, icon, color, links, ... } }
    // New format: { libraries: { "libKey": { name, icon, categories: { ... } } }, currentLibrary: "libKey" }

    const defaultLibKey = 'lib_general_' + Date.now();
    const newData = {
        libraries: {
            [defaultLibKey]: {
                name: 'General',
                icon: '📁',
                categories: {}
            }
        },
        currentLibrary: defaultLibKey
    };

    // Migrate all categories to the "General" library
    Object.keys(oldData).forEach(catKey => {
        const cat = oldData[catKey];
        if (cat && typeof cat === 'object' && cat.name) {
            // Migrate links to new format with 4 status fields
            const migratedLinks = (cat.links || []).map(link => ({
                url: link.url,
                title: link.title,
                description: link.description || '',
                icon: link.icon,
                status: {
                    watching: false,
                    watched: link.isWatching || link.status?.watched || false,
                    understood: false,
                    applied: link.status?.applied || false
                },
                quickNote: link.quickNote || '',
                fullNote: '',
                linkNotes: link.linkNotes || ''
            }));

            newData.libraries[defaultLibKey].categories[catKey] = {
                name: cat.name,
                icon: cat.icon || '📁',
                color: cat.color || '#4a9eff',
                progress: cat.progress || '',
                description: cat.description || '',
                task: cat.task || '',
                links: migratedLinks
            };
        }
    });

    return newData;
}

function ensureDataStructure() {
    if (!DATA.libraries) {
        DATA = { libraries: {}, currentLibrary: null };
    }

    // Ensure at least one library exists
    const libKeys = Object.keys(DATA.libraries);
    if (libKeys.length === 0) {
        const defaultKey = 'lib_default_' + Date.now();
        DATA.libraries[defaultKey] = {
            name: 'General',
            icon: '📁',
            categories: {}
        };
        DATA.currentLibrary = defaultKey;
    } else if (!DATA.currentLibrary || !DATA.libraries[DATA.currentLibrary]) {
        DATA.currentLibrary = libKeys[0];
    }
}
