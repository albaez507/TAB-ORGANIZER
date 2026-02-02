// ========================================
// ULTRA FOCUS MODE
// Description: Cinematic full-screen library focus view with accordion categories
// Dependencies: data.js, storage.js, ui.js
// ========================================

// ================= STATE =================
let ultraFocusActive = false;
let ultraFocusLibKey = null;
let ultraFocusExpandedCatKey = null; // Which category is currently expanded
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

function animateCategoriesIn() {
    const container = document.getElementById('ultra-focus-categories');
    const items = container.querySelectorAll('.uf-accordion-item');

    items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(-30px)';
    });

    // Staggered animation with bounce
    items.forEach((item, index) => {
        setTimeout(() => {
            requestAnimationFrame(() => {
                item.style.transition = 'opacity 200ms ease-out, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            });
        }, index * 50);
    });
}

function animateCategoriesOut() {
    const container = document.getElementById('ultra-focus-categories');
    const items = Array.from(container.querySelectorAll('.uf-accordion-item'));

    // Reverse staggered animation
    return new Promise(resolve => {
        items.reverse().forEach((item, index) => {
            setTimeout(() => {
                item.style.transition = 'opacity 100ms ease-in, transform 100ms ease-in';
                item.style.opacity = '0';
                item.style.transform = 'translateY(-20px)';
            }, index * 30);
        });

        setTimeout(resolve, items.length * 30 + 100);
    });
}

// ================= ACCORDION FUNCTIONS =================

function toggleAccordion(catKey) {
    if (!ultraFocusActive || !ultraFocusLibKey) return;

    const wasExpanded = ultraFocusExpandedCatKey === catKey;

    // If clicking the same category, collapse it
    if (wasExpanded) {
        collapseCategory(catKey);
        ultraFocusExpandedCatKey = null;
    } else {
        // Collapse current if any, then expand new
        if (ultraFocusExpandedCatKey) {
            collapseCategory(ultraFocusExpandedCatKey);
        }
        expandCategory(catKey);
        ultraFocusExpandedCatKey = catKey;
    }

    // Update header states
    updateAccordionHeaders();
}

function expandCategory(catKey) {
    const content = document.querySelector(`.uf-accordion-content[data-cat-key="${catKey}"]`);
    const arrow = document.querySelector(`.uf-accordion-header[data-cat-key="${catKey}"] .uf-accordion-arrow`);

    if (!content) return;

    // Render links inside the content
    renderAccordionLinks(catKey);

    // Get the natural height
    content.style.height = 'auto';
    const targetHeight = content.scrollHeight;
    content.style.height = '0px';

    // Force reflow
    content.offsetHeight;

    // Animate expand
    requestAnimationFrame(() => {
        content.style.transition = 'height 300ms cubic-bezier(0.4, 0.0, 0.2, 1)';
        content.style.height = targetHeight + 'px';
        content.classList.add('expanded');

        if (arrow) {
            arrow.style.transform = 'rotate(90deg)';
        }

        // Animate links in with stagger
        setTimeout(() => {
            animateLinksIn(catKey);
        }, 50);

        // Reset height to auto after animation for responsive resize
        setTimeout(() => {
            if (content.classList.contains('expanded')) {
                content.style.height = 'auto';
            }
        }, 310);
    });
}

function collapseCategory(catKey) {
    const content = document.querySelector(`.uf-accordion-content[data-cat-key="${catKey}"]`);
    const arrow = document.querySelector(`.uf-accordion-header[data-cat-key="${catKey}"] .uf-accordion-arrow`);

    if (!content) return;

    // Get current height
    const currentHeight = content.scrollHeight;
    content.style.height = currentHeight + 'px';

    // Force reflow
    content.offsetHeight;

    // Animate links out first
    animateLinksOut(catKey);

    // Then collapse
    setTimeout(() => {
        requestAnimationFrame(() => {
            content.style.transition = 'height 250ms cubic-bezier(0.4, 0.0, 0.2, 1)';
            content.style.height = '0px';
            content.classList.remove('expanded');

            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
            }
        });
    }, 100);
}

function animateLinksIn(catKey) {
    const content = document.querySelector(`.uf-accordion-content[data-cat-key="${catKey}"]`);
    if (!content) return;

    const links = content.querySelectorAll('.uf-link-card');
    links.forEach((link, index) => {
        link.style.opacity = '0';
        link.style.transform = 'translateY(-15px)';

        setTimeout(() => {
            requestAnimationFrame(() => {
                link.style.transition = 'opacity 200ms ease-out, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                link.style.opacity = '1';
                link.style.transform = 'translateY(0)';
            });
        }, index * 50);
    });
}

function animateLinksOut(catKey) {
    const content = document.querySelector(`.uf-accordion-content[data-cat-key="${catKey}"]`);
    if (!content) return;

    const links = content.querySelectorAll('.uf-link-card');
    links.forEach((link, index) => {
        link.style.transition = 'opacity 80ms ease-in';
        link.style.opacity = '0';
    });
}

function updateAccordionHeaders() {
    const headers = document.querySelectorAll('.uf-accordion-header');
    headers.forEach(header => {
        const catKey = header.dataset.catKey;
        if (catKey === ultraFocusExpandedCatKey) {
            header.classList.add('expanded');
        } else {
            header.classList.remove('expanded');
        }
    });
}

// ================= RENDER FUNCTIONS =================

function renderUltraFocusCategories(libKey) {
    const container = document.getElementById('ultra-focus-categories');
    const lib = DATA.libraries[libKey];

    // Reset expanded state
    ultraFocusExpandedCatKey = null;

    if (!lib || !lib.categories) {
        container.innerHTML = '<p class="text-slate-500 text-center py-12">No categories in this library</p>';
        return;
    }

    const catKeys = Object.keys(lib.categories);

    if (catKeys.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-center py-12">No categories yet. Add some!</p>';
        return;
    }

    container.innerHTML = catKeys.map((catKey, index) => {
        const cat = lib.categories[catKey];
        const linkCount = (cat.links || []).length;

        return `
            <div class="uf-accordion-item" data-cat-key="${catKey}">
                <div class="uf-accordion-header" data-cat-key="${catKey}" onclick="toggleAccordion('${catKey}')" tabindex="0" role="button" aria-expanded="false">
                    <span class="uf-accordion-arrow">▶</span>
                    <span class="uf-accordion-icon">${cat.icon || '📁'}</span>
                    <span class="uf-accordion-name">${cat.name}</span>
                    <span class="uf-accordion-line"></span>
                    <span class="uf-accordion-count">${linkCount} links</span>
                </div>
                <div class="uf-accordion-content" data-cat-key="${catKey}">
                    <div class="uf-links-grid">
                        <!-- Links rendered on expand -->
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add keyboard navigation
    initAccordionKeyboard();
}

function renderAccordionLinks(catKey) {
    const content = document.querySelector(`.uf-accordion-content[data-cat-key="${catKey}"]`);
    if (!content) return;

    const lib = DATA.libraries[ultraFocusLibKey];
    if (!lib) return;

    const cat = lib.categories[catKey];
    if (!cat || !cat.links) {
        content.querySelector('.uf-links-grid').innerHTML = '<p class="uf-empty-message">No links in this category</p>';
        return;
    }

    const links = cat.links;
    const grid = content.querySelector('.uf-links-grid');

    grid.innerHTML = links.map((link, index) => {
        const statusBadge = getUltraFocusStatusBadge(link.status);

        return `
            <div class="uf-link-card" data-link-index="${index}">
                <div class="uf-link-header">
                    <img src="${link.icon || 'https://www.google.com/s2/favicons?sz=64&domain=' + link.url}"
                         class="uf-link-favicon"
                         onerror="this.src='https://www.google.com/s2/favicons?sz=64&domain=example.com'">
                    <div class="uf-link-info">
                        <a href="${link.url}" target="_blank" class="uf-link-title" onclick="event.stopPropagation()">
                            ${link.title || 'Untitled'}
                        </a>
                        ${statusBadge}
                    </div>
                </div>
                ${link.description ? `<p class="uf-link-desc">${link.description}</p>` : ''}
            </div>
        `;
    }).join('');
}

function getUltraFocusStatusBadge(status) {
    if (!status) return '';

    if (status.applied) {
        return '<span class="uf-status-badge uf-badge-applied">⭐</span>';
    }
    if (status.understood) {
        return '<span class="uf-status-badge uf-badge-understood">🟢</span>';
    }
    if (status.watched) {
        return '<span class="uf-status-badge uf-badge-watched">🔵</span>';
    }
    if (status.watching) {
        return '<span class="uf-status-badge uf-badge-watching">🟡</span>';
    }
    return '';
}

// ================= KEYBOARD SUPPORT =================

function initAccordionKeyboard() {
    const headers = document.querySelectorAll('.uf-accordion-header');

    headers.forEach(header => {
        header.addEventListener('keydown', (e) => {
            const catKey = header.dataset.catKey;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleAccordion(catKey);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = header.closest('.uf-accordion-item').nextElementSibling;
                if (next) {
                    next.querySelector('.uf-accordion-header').focus();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = header.closest('.uf-accordion-item').previousElementSibling;
                if (prev) {
                    prev.querySelector('.uf-accordion-header').focus();
                }
            }
        });
    });
}

function initUltraFocusKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && ultraFocusActive) {
            e.preventDefault();
            exitUltraFocus();
        }
    });
}

// ================= ENTER/EXIT =================

async function enterUltraFocus(libKey) {
    const lib = DATA.libraries[libKey];
    if (!lib) return;

    ultraFocusActive = true;
    ultraFocusLibKey = libKey;
    ultraFocusExpandedCatKey = null;

    // Save last active
    localStorage.setItem(ULTRA_FOCUS_LAST_KEY, libKey);

    // Update quick access bar to show active state
    renderQuickAccessBar();

    const overlay = document.getElementById('ultra-focus-overlay');
    const sidebar = document.getElementById('library-sidebar');
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

    // Collapse any expanded category first (fast)
    if (ultraFocusExpandedCatKey) {
        const content = document.querySelector(`.uf-accordion-content[data-cat-key="${ultraFocusExpandedCatKey}"]`);
        if (content) {
            content.style.transition = 'height 100ms ease-in';
            content.style.height = '0px';
        }
    }

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
    ultraFocusExpandedCatKey = null;

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

// No longer needed - accordion handles navigation within Ultra Focus
function exitUltraFocusAndNavigate(libKey, catKey) {
    // Keep for backwards compatibility but redirect to toggle
    toggleAccordion(catKey);
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
