// ========================================
// ULTRA FOCUS MODE
// Description: Cinematic full-screen library focus view
// Dependencies: data.js, storage.js, ui.js
// ========================================

// ================= STATE =================
let ultraFocusActive = false;
let ultraFocusLibKey = null;
let quickAccessLibraries = []; // Array of library keys for quick access

const ULTRA_FOCUS_STORAGE_KEY = 'tab-organizer-quick-access';
const ULTRA_FOCUS_LAST_KEY = 'tab-organizer-last-ultra-focus';

// ================= PERSISTENCE =================

function loadQuickAccessSettings() {
    try {
        const saved = localStorage.getItem(ULTRA_FOCUS_STORAGE_KEY);
        if (saved) {
            quickAccessLibraries = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading quick access settings:', e);
    }
}

function saveQuickAccessSettings() {
    try {
        localStorage.setItem(ULTRA_FOCUS_STORAGE_KEY, JSON.stringify(quickAccessLibraries));
    } catch (e) {
        console.error('Error saving quick access settings:', e);
    }
}

function getQuickAccessLibraries() {
    const libKeys = Object.keys(DATA.libraries || {});

    // If we have saved preferences, filter to only valid ones
    if (quickAccessLibraries.length > 0) {
        const valid = quickAccessLibraries.filter(key => DATA.libraries[key]);
        if (valid.length > 0) {
            // Fill remaining slots with other libraries
            const remaining = libKeys.filter(key => !valid.includes(key));
            while (valid.length < 4 && remaining.length > 0) {
                valid.push(remaining.shift());
            }
            return valid.slice(0, 4);
        }
    }

    // Default: first 4 libraries
    return libKeys.slice(0, 4);
}

// ================= QUICK ACCESS BAR =================

function renderQuickAccessBar() {
    const container = document.getElementById('quick-access-icons');
    if (!container) return;

    const libs = getQuickAccessLibraries();
    container.innerHTML = '';

    libs.forEach(libKey => {
        const lib = DATA.libraries[libKey];
        if (!lib) return;

        const btn = document.createElement('button');
        btn.className = 'quick-access-icon';
        btn.dataset.libKey = libKey;
        btn.title = lib.name;

        if (ultraFocusActive && ultraFocusLibKey === libKey) {
            btn.classList.add('active');
        }

        btn.innerHTML = `
            <span class="quick-access-emoji">${lib.icon}</span>
            <span class="quick-access-dot"></span>
        `;

        btn.onclick = () => toggleUltraFocus(libKey);
        container.appendChild(btn);
    });
}

// ================= ANIMATION HELPERS =================

function getIconPosition(libKey) {
    const btn = document.querySelector(`.quick-access-icon[data-lib-key="${libKey}"]`);
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height
    };
}

function animateIconToCenter(libKey, lib) {
    const startPos = getIconPosition(libKey);
    if (!startPos) return Promise.resolve();

    const overlay = document.getElementById('ultra-focus-overlay');
    const iconContainer = document.getElementById('ultra-focus-icon-container');
    const icon = document.getElementById('ultra-focus-icon');

    // Set the icon content
    icon.textContent = lib.icon;

    // Calculate center position
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.2; // 20% from top

    // Set initial position (at the bar icon location)
    const deltaX = startPos.x - centerX;
    const deltaY = startPos.y - centerY;

    iconContainer.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.5)`;
    iconContainer.style.opacity = '0';

    // Force reflow
    iconContainer.offsetHeight;

    // Animate to center
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            iconContainer.style.transition = 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease-out';
            iconContainer.style.transform = 'translate(0, 0) scale(1)';
            iconContainer.style.opacity = '1';

            setTimeout(resolve, 250);
        });
    });
}

function animateIconBack(libKey) {
    const endPos = getIconPosition(libKey);
    if (!endPos) return Promise.resolve();

    const iconContainer = document.getElementById('ultra-focus-icon-container');

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.2;

    const deltaX = endPos.x - centerX;
    const deltaY = endPos.y - centerY;

    return new Promise(resolve => {
        iconContainer.style.transition = 'transform 200ms cubic-bezier(0.4, 0, 1, 1), opacity 150ms ease-in';
        iconContainer.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.5)`;
        iconContainer.style.opacity = '0';

        setTimeout(resolve, 200);
    });
}

function animateTextIn(element, delay) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';

    return new Promise(resolve => {
        setTimeout(() => {
            requestAnimationFrame(() => {
                element.style.transition = 'opacity 200ms ease-out, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
                setTimeout(resolve, 200);
            });
        }, delay);
    });
}

function animateTextOut(element) {
    return new Promise(resolve => {
        element.style.transition = 'opacity 100ms ease-in, transform 100ms ease-in';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        setTimeout(resolve, 100);
    });
}

function animateCategoriesIn(categories) {
    const container = document.getElementById('ultra-focus-categories');
    const cards = container.querySelectorAll('.ultra-focus-category-card');

    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(-30px)';
    });

    // Staggered animation with bounce
    cards.forEach((card, index) => {
        setTimeout(() => {
            requestAnimationFrame(() => {
                card.style.transition = 'opacity 200ms ease-out, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        }, index * 50);
    });
}

function animateCategoriesOut() {
    const container = document.getElementById('ultra-focus-categories');
    const cards = Array.from(container.querySelectorAll('.ultra-focus-category-card'));

    // Reverse staggered animation
    return new Promise(resolve => {
        cards.reverse().forEach((card, index) => {
            setTimeout(() => {
                card.style.transition = 'opacity 100ms ease-in, transform 100ms ease-in';
                card.style.opacity = '0';
                card.style.transform = 'translateY(-20px)';
            }, index * 30);
        });

        setTimeout(resolve, cards.length * 30 + 100);
    });
}

// ================= RENDER CATEGORIES =================

function renderUltraFocusCategories(libKey) {
    const container = document.getElementById('ultra-focus-categories');
    const lib = DATA.libraries[libKey];

    if (!lib || !lib.categories) {
        container.innerHTML = '<p class="text-slate-500 text-center py-12">No categories in this library</p>';
        return;
    }

    const catKeys = Object.keys(lib.categories);

    if (catKeys.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-center py-12">No categories yet. Add some!</p>';
        return;
    }

    container.innerHTML = catKeys.map(catKey => {
        const cat = lib.categories[catKey];
        const linkCount = (cat.links || []).length;
        const watchedCount = (cat.links || []).filter(l => l.status?.watched).length;
        const progress = linkCount > 0 ? Math.round((watchedCount / linkCount) * 100) : 0;

        return `
            <div class="ultra-focus-category-card" onclick="exitUltraFocusAndNavigate('${libKey}', '${catKey}')" style="border-left-color: ${cat.color || '#4a9eff'}">
                <div class="ultra-focus-category-header">
                    <span class="ultra-focus-category-icon">${cat.icon || '📁'}</span>
                    <div class="ultra-focus-category-info">
                        <h3 class="ultra-focus-category-name">${cat.name}</h3>
                        ${cat.description ? `<p class="ultra-focus-category-desc">${cat.description}</p>` : ''}
                    </div>
                </div>
                <div class="ultra-focus-category-meta">
                    <span class="ultra-focus-category-count">${linkCount} links</span>
                    ${cat.progress ? `<span class="ultra-focus-category-progress">${cat.progress}</span>` : ''}
                </div>
                <div class="ultra-focus-category-progress-bar">
                    <div class="ultra-focus-category-progress-fill" style="width: ${progress}%; background: ${cat.color || '#4a9eff'}"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ================= ENTER/EXIT =================

async function enterUltraFocus(libKey) {
    const lib = DATA.libraries[libKey];
    if (!lib) return;

    ultraFocusActive = true;
    ultraFocusLibKey = libKey;

    // Save last active
    localStorage.setItem(ULTRA_FOCUS_LAST_KEY, libKey);

    // Update quick access bar to show active state
    renderQuickAccessBar();

    const overlay = document.getElementById('ultra-focus-overlay');
    const sidebar = document.getElementById('library-sidebar');
    const mainContent = document.querySelector('main');
    const title = document.getElementById('ultra-focus-title');
    const description = document.getElementById('ultra-focus-description');

    // Set content
    title.textContent = lib.name;
    description.textContent = lib.description || `${Object.keys(lib.categories || {}).length} categories`;

    // Render categories (hidden initially)
    renderUltraFocusCategories(libKey);

    // Show overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Animation sequence
    // 1. Sidebar slides out (0-150ms)
    sidebar.classList.add('ultra-focus-sidebar-hidden');

    // 2. Icon lifts and travels to center (100-300ms)
    await new Promise(r => setTimeout(r, 100));
    await animateIconToCenter(libKey, lib);

    // 3. Title fades in (250-400ms)
    await animateTextIn(title, 0);

    // 4. Description fades in (350-500ms)
    await animateTextIn(description, 50);

    // 5. Categories fall in with stagger (450-700ms)
    await new Promise(r => setTimeout(r, 50));
    animateCategoriesIn();
}

async function exitUltraFocus() {
    if (!ultraFocusActive) return;

    const overlay = document.getElementById('ultra-focus-overlay');
    const sidebar = document.getElementById('library-sidebar');
    const title = document.getElementById('ultra-focus-title');
    const description = document.getElementById('ultra-focus-description');
    const libKey = ultraFocusLibKey;

    // Reverse animation sequence (faster ~400ms total)

    // 1. Categories fade out (0-150ms)
    await animateCategoriesOut();

    // 2. Text fades out (100-200ms)
    animateTextOut(description);
    await animateTextOut(title);

    // 3. Icon returns to bar (150-350ms)
    await animateIconBack(libKey);

    // 4. Sidebar slides back in (300-400ms)
    sidebar.classList.remove('ultra-focus-sidebar-hidden');

    // Hide overlay
    overlay.classList.remove('active');
    document.body.style.overflow = '';

    ultraFocusActive = false;
    ultraFocusLibKey = null;

    // Update quick access bar
    renderQuickAccessBar();
}

function toggleUltraFocus(libKey) {
    if (ultraFocusActive && ultraFocusLibKey === libKey) {
        exitUltraFocus();
    } else if (ultraFocusActive) {
        // Switch to different library
        exitUltraFocus().then(() => {
            setTimeout(() => enterUltraFocus(libKey), 100);
        });
    } else {
        enterUltraFocus(libKey);
    }
}

function exitUltraFocusAndNavigate(libKey, catKey) {
    exitUltraFocus().then(() => {
        // Select the library and open the category
        selectLibrary(libKey);
        if (!openSections.has(catKey)) {
            openSections.add(catKey);
        }
        render();

        // Scroll to category
        setTimeout(() => {
            const catElement = document.querySelector(`[data-cat-key="${catKey}"]`);
            if (catElement) {
                catElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    });
}

// ================= KEYBOARD SUPPORT =================

function initUltraFocusKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && ultraFocusActive) {
            e.preventDefault();
            exitUltraFocus();
        }
    });
}

// ================= INITIALIZATION =================

function initUltraFocus() {
    loadQuickAccessSettings();
    renderQuickAccessBar();
    initUltraFocusKeyboard();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUltraFocus);
} else {
    initUltraFocus();
}
