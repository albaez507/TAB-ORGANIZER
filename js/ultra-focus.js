// ========================================
// ULTRA FOCUS MODE
// Description: Cinematic full-screen library focus view with accordion/grid+list views
// Dependencies: data.js, storage.js, ui.js
// ========================================

// ================= STATE =================
let ultraFocusActive = false;
let ultraFocusLibKey = null;
let ultraFocusExpandedCatKey = null; // Which category is currently expanded (accordion view)
let quickAccessLibraries = []; // Array of library keys for quick access
let ultraFocusViewMode = 'accordion'; // 'accordion' or 'gridlist'
let ultraFocusSelectedCatKey = null; // Which category is selected (grid+list view)
let ultraFocusExpandedLinkIndex = null; // Which link is expanded for preview (grid+list view)

const ULTRA_FOCUS_STORAGE_KEY = 'tab-organizer-quick-access';
const ULTRA_FOCUS_LAST_KEY = 'tab-organizer-last-ultra-focus';
const ULTRA_FOCUS_VIEW_KEY = 'tab-organizer-ultra-focus-view';

// ================= PERSISTENCE =================

function loadQuickAccessSettings() {
    try {
        const saved = localStorage.getItem(ULTRA_FOCUS_STORAGE_KEY);
        if (saved) {
            quickAccessLibraries = JSON.parse(saved);
        }
        // Load view mode preference
        const savedView = localStorage.getItem(ULTRA_FOCUS_VIEW_KEY);
        if (savedView && (savedView === 'accordion' || savedView === 'gridlist')) {
            ultraFocusViewMode = savedView;
        }
    } catch (e) {
        console.error('Error loading quick access settings:', e);
    }
}

function saveViewModePreference() {
    try {
        localStorage.setItem(ULTRA_FOCUS_VIEW_KEY, ultraFocusViewMode);
    } catch (e) {
        console.error('Error saving view mode:', e);
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
    // First try quick-access-icon (if it exists)
    let btn = document.querySelector(`.quick-access-icon[data-lib-key="${libKey}"]`);

    // Fallback to sidebar library icon
    if (!btn) {
        const sidebarItem = document.querySelector(`.library-item[data-lib-key="${libKey}"] .library-icon-btn`);
        if (sidebarItem) btn = sidebarItem;
    }

    // If still not found, return a default centered start position
    if (!btn) {
        return {
            x: window.innerWidth / 2,
            y: 100,
            width: 44,
            height: 44
        };
    }

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

// ================= VIEW TOGGLE FUNCTIONS =================

function setUltraFocusView(mode) {
    if (mode !== 'accordion' && mode !== 'gridlist') return;
    if (mode === ultraFocusViewMode) return;

    const oldMode = ultraFocusViewMode;
    ultraFocusViewMode = mode;
    saveViewModePreference();

    // Reset view-specific state
    ultraFocusExpandedCatKey = null;
    ultraFocusSelectedCatKey = null;
    ultraFocusExpandedLinkIndex = null;

    // Update toggle buttons
    updateViewToggleButtons();

    // Animate transition
    animateViewTransition(oldMode, mode);
}

function updateViewToggleButtons() {
    const accordionBtn = document.getElementById('uf-view-accordion');
    const gridlistBtn = document.getElementById('uf-view-gridlist');

    if (accordionBtn) {
        accordionBtn.classList.toggle('active', ultraFocusViewMode === 'accordion');
    }
    if (gridlistBtn) {
        gridlistBtn.classList.toggle('active', ultraFocusViewMode === 'gridlist');
    }
}

function animateViewTransition(oldMode, newMode) {
    const container = document.getElementById('ultra-focus-categories');
    if (!container) return;

    // Fade out current content
    container.style.transition = 'opacity 150ms ease-out';
    container.style.opacity = '0';

    setTimeout(() => {
        // Re-render with new mode
        renderUltraFocusContent(ultraFocusLibKey);

        // Fade in new content
        requestAnimationFrame(() => {
            container.style.transition = 'opacity 200ms ease-in';
            container.style.opacity = '1';

            // Animate items in
            if (newMode === 'accordion') {
                animateCategoriesIn();
            } else {
                animateGridListIn();
            }
        });
    }, 150);
}

function renderViewToggle() {
    return `
        <div class="uf-view-toggle" id="uf-view-toggle">
            <button
                id="uf-view-accordion"
                class="uf-view-btn ${ultraFocusViewMode === 'accordion' ? 'active' : ''}"
                onclick="setUltraFocusView('accordion')"
                title="Accordion View"
            >
                <span class="uf-view-icon">☰</span>
                <span class="uf-view-label">Accordion</span>
            </button>
            <button
                id="uf-view-gridlist"
                class="uf-view-btn ${ultraFocusViewMode === 'gridlist' ? 'active' : ''}"
                onclick="setUltraFocusView('gridlist')"
                title="Grid + List View"
            >
                <span class="uf-view-icon">▦</span>
                <span class="uf-view-label">Grid</span>
            </button>
        </div>
    `;
}

// ================= GRID + LIST VIEW FUNCTIONS =================

function selectGridCategory(catKey) {
    if (ultraFocusSelectedCatKey === catKey) {
        // Deselect
        ultraFocusSelectedCatKey = null;
        ultraFocusExpandedLinkIndex = null;
    } else {
        ultraFocusSelectedCatKey = catKey;
        ultraFocusExpandedLinkIndex = null;
    }

    // Update category cards visual state
    updateGridCategorySelection();

    // Render links list with animation
    renderGridLinksList();
}

function updateGridCategorySelection() {
    const cards = document.querySelectorAll('.uf-grid-cat-card');
    cards.forEach(card => {
        const catKey = card.dataset.catKey;
        if (catKey === ultraFocusSelectedCatKey) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

function renderGridLinksList() {
    const container = document.getElementById('uf-gridlist-links');
    if (!container) return;

    if (!ultraFocusSelectedCatKey) {
        // Collapse the links section
        container.style.transition = 'height 250ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 150ms ease';
        container.style.height = '0px';
        container.style.opacity = '0';
        return;
    }

    const lib = DATA.libraries[ultraFocusLibKey];
    if (!lib) return;

    const cat = lib.categories[ultraFocusSelectedCatKey];
    if (!cat || !cat.links || cat.links.length === 0) {
        container.innerHTML = `
            <div class="uf-gridlist-empty">
                <span class="text-slate-500">No links in this category</span>
            </div>
        `;
        container.style.height = 'auto';
        container.style.opacity = '1';
        return;
    }

    const links = cat.links;
    container.innerHTML = `
        <div class="uf-links-list">
            ${links.map((link, index) => renderGridListLinkRow(link, index)).join('')}
        </div>
    `;

    // Animate expansion
    const targetHeight = container.scrollHeight;
    container.style.height = '0px';
    container.offsetHeight; // Force reflow

    requestAnimationFrame(() => {
        container.style.transition = 'height 300ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 200ms ease';
        container.style.height = targetHeight + 'px';
        container.style.opacity = '1';

        // Animate links in with stagger
        const rows = container.querySelectorAll('.uf-link-row');
        rows.forEach((row, i) => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(-10px)';

            setTimeout(() => {
                row.style.transition = 'opacity 200ms ease, transform 200ms ease';
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            }, i * 40);
        });

        // Set height to auto after animation
        setTimeout(() => {
            container.style.height = 'auto';
        }, 310);
    });
}

function renderGridListLinkRow(link, index) {
    const isExpanded = ultraFocusExpandedLinkIndex === index;
    const statusBadge = getUltraFocusStatusBadge(link.status);
    const isVideo = isVideoUrl(link.url);

    return `
        <div class="uf-link-row ${isExpanded ? 'expanded' : ''}" data-link-index="${index}">
            <div class="uf-link-row-main" onclick="event.stopPropagation()">
                <img src="${link.icon || 'https://www.google.com/s2/favicons?sz=64&domain=' + link.url}"
                     class="uf-link-row-favicon"
                     onerror="this.src='https://www.google.com/s2/favicons?sz=64&domain=example.com'">
                <div class="uf-link-row-info">
                    <a href="${link.url}" target="_blank" class="uf-link-row-title">
                        ${link.title || 'Untitled'}
                    </a>
                    ${link.description ? `<p class="uf-link-row-desc">${link.description}</p>` : ''}
                </div>
                ${statusBadge}
                <button class="uf-link-row-preview-btn" onclick="toggleLinkPreview(${index})" title="${isExpanded ? 'Hide preview' : 'Show preview'}">
                    ${isExpanded ? '▲' : '▼'} Ver
                </button>
            </div>
            ${isExpanded ? renderLinkPreview(link, index) : ''}
        </div>
    `;
}

function isVideoUrl(url) {
    if (!url) return false;
    return url.includes('youtube.com/watch') ||
           url.includes('youtu.be/') ||
           url.includes('vimeo.com/');
}

function getYoutubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

function renderLinkPreview(link, index) {
    const isVideo = isVideoUrl(link.url);

    if (isVideo) {
        const videoId = getYoutubeVideoId(link.url);
        if (videoId) {
            return `
                <div class="uf-link-preview">
                    <div class="uf-link-preview-video">
                        <iframe
                            src="https://www.youtube.com/embed/${videoId}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    </div>
                    ${link.quickNote ? `<p class="uf-link-preview-note">${link.quickNote}</p>` : ''}
                </div>
            `;
        }
    }

    // Non-video preview - show description and notes
    return `
        <div class="uf-link-preview">
            <div class="uf-link-preview-details">
                ${link.description ? `<p class="uf-link-preview-desc">${link.description}</p>` : ''}
                ${link.quickNote ? `<p class="uf-link-preview-note"><strong>Note:</strong> ${link.quickNote}</p>` : ''}
                ${link.linkNotes ? `<p class="uf-link-preview-note"><strong>Notes:</strong> ${link.linkNotes}</p>` : ''}
                <a href="${link.url}" target="_blank" class="uf-link-preview-open">
                    Open Link →
                </a>
            </div>
        </div>
    `;
}

function toggleLinkPreview(index) {
    if (ultraFocusExpandedLinkIndex === index) {
        ultraFocusExpandedLinkIndex = null;
    } else {
        ultraFocusExpandedLinkIndex = index;
    }

    // Re-render the links list to update the expanded state
    renderGridLinksList();
}

function animateGridListIn() {
    const container = document.getElementById('ultra-focus-categories');
    const catCards = container.querySelectorAll('.uf-grid-cat-card');

    catCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';

        setTimeout(() => {
            requestAnimationFrame(() => {
                card.style.transition = 'opacity 200ms ease-out, transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            });
        }, index * 40);
    });
}

function renderGridListView(libKey) {
    const lib = DATA.libraries[libKey];

    if (!lib || !lib.categories) {
        return '<p class="text-slate-500 text-center py-12">No categories in this library</p>';
    }

    const catKeys = Object.keys(lib.categories);

    if (catKeys.length === 0) {
        return '<p class="text-slate-500 text-center py-12">No categories yet. Add some!</p>';
    }

    return `
        <div class="uf-grid-categories">
            ${catKeys.map(catKey => {
                const cat = lib.categories[catKey];
                const linkCount = (cat.links || []).length;
                const isSelected = catKey === ultraFocusSelectedCatKey;

                return `
                    <div class="uf-grid-cat-card ${isSelected ? 'selected' : ''}"
                         data-cat-key="${catKey}"
                         onclick="selectGridCategory('${catKey}')">
                        <span class="uf-grid-cat-icon">${cat.icon || '📁'}</span>
                        <span class="uf-grid-cat-name">${cat.name}</span>
                        <span class="uf-grid-cat-count">${linkCount}</span>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="uf-gridlist-links" id="uf-gridlist-links"></div>
    `;
}

// ================= RENDER FUNCTIONS =================

function renderUltraFocusContent(libKey) {
    const container = document.getElementById('ultra-focus-categories');

    if (ultraFocusViewMode === 'accordion') {
        renderUltraFocusCategories(libKey);
    } else {
        container.innerHTML = renderGridListView(libKey);

        // If a category was selected, render its links
        if (ultraFocusSelectedCatKey) {
            renderGridLinksList();
        }
    }
}

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
    ultraFocusSelectedCatKey = null;
    ultraFocusExpandedLinkIndex = null;

    // Save last active
    localStorage.setItem(ULTRA_FOCUS_LAST_KEY, libKey);

    // Update quick access bar to show active state
    renderQuickAccessBar();

    const overlay = document.getElementById('ultra-focus-overlay');
    const sidebar = document.getElementById('library-sidebar');
    const title = document.getElementById('ultra-focus-title');
    const description = document.getElementById('ultra-focus-description');
    const viewToggleContainer = document.getElementById('ultra-focus-view-toggle-container');

    // Set content
    title.textContent = lib.name;
    description.textContent = lib.description || `${Object.keys(lib.categories || {}).length} categories`;

    // Render view toggle
    if (viewToggleContainer) {
        viewToggleContainer.innerHTML = renderViewToggle();
    }

    // Render categories (hidden initially)
    renderUltraFocusContent(libKey);

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

    // 5. View toggle fades in
    if (viewToggleContainer) {
        await animateTextIn(viewToggleContainer, 30);
    }

    // 6. Categories/Grid fall in with stagger (450-700ms)
    await new Promise(r => setTimeout(r, 50));
    if (ultraFocusViewMode === 'accordion') {
        animateCategoriesIn();
    } else {
        animateGridListIn();
    }
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
    ultraFocusSelectedCatKey = null;
    ultraFocusExpandedLinkIndex = null;

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
