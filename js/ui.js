// ========================================
// UI
// Description: All rendering functions, toasts, and drag & drop handlers
// Dependencies: data.js, links.js
// ========================================

// ================= HELPER FUNCTIONS =================

// Escape HTML attribute to preserve backslashes and special characters
function escapeHtmlAttribute(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ================= THEME FUNCTIONS =================
const THEME_STORAGE_KEY = 'tab-organizer-theme';

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme === 'light' ? 'light' : '');
    if (newTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
    }

    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    updateThemeToggleIcon(newTheme);
}

function updateThemeToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    if (theme === 'light') {
        btn.textContent = '☀️';
        btn.title = 'Cambiar a modo oscuro';
    } else {
        btn.textContent = '🌙';
        btn.title = 'Cambiar a modo claro';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    let theme = 'dark'; // default

    if (savedTheme) {
        theme = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        theme = 'light';
    }

    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    updateThemeToggleIcon(theme);
}

// ================= ANIMATION HELPERS =================

/**
 * Animate categories when they appear (staggered entrance)
 */
function animateCategoriesIn() {
    const categories = document.querySelectorAll('.category-card:not(.animated)');
    categories.forEach((cat, index) => {
        cat.classList.add('category-animate-in');
        cat.style.animationDelay = `${index * 50}ms`;
        cat.classList.add('animated');

        // Clean up after animation
        setTimeout(() => {
            cat.classList.remove('category-animate-in');
            cat.style.animationDelay = '';
        }, 300 + (index * 50));
    });
}

/**
 * Animate links when category is opened (staggered entrance)
 */
function animateLinksIn(catKey) {
    const container = document.querySelector(`[data-cat-key="${catKey}"] .category-drop-zone`);
    if (!container) return;

    const links = container.querySelectorAll('.link-card, .compact-link-row, .expanded-link-card, .organize-item');
    links.forEach((link, index) => {
        link.classList.add('link-animate-in');
        link.style.animationDelay = `${index * 40}ms`;

        // Clean up after animation
        setTimeout(() => {
            link.classList.remove('link-animate-in');
            link.style.animationDelay = '';
        }, 250 + (index * 40));
    });
}

/**
 * Animate newly added item
 */
function animateItemAdd(element) {
    if (!element) return;
    element.classList.add('item-animate-add');
    setTimeout(() => {
        element.classList.remove('item-animate-add');
    }, 400);
}

/**
 * Animate item deletion with callback
 */
function animateItemDelete(element, callback) {
    if (!element) {
        if (callback) callback();
        return;
    }

    element.classList.add('item-animate-delete');
    setTimeout(() => {
        if (callback) callback();
    }, 300);
}

// ================= STATUS INDICATOR HELPERS =================

/**
 * Get the current status level (highest active status)
 */
function getCurrentStatus(status) {
    if (!status) return 'none';
    if (status.applied) return 'applied';
    if (status.understood) return 'understood';
    if (status.watched) return 'watched';
    if (status.watching) return 'watching';
    return 'none';
}

/**
 * Render status indicator with hover options
 */
function renderStatusIndicator(libKey, catKey, linkIndex, status) {
    const currentStatus = getCurrentStatus(status);

    return `
        <div class="status-indicator-wrapper" onclick="event.stopPropagation()">
            <div class="status-dot ${currentStatus}"
                 onclick="toggleStatusOptions(this.parentElement)"
                 title="Click to change status"></div>
            <div class="status-options">
                <div class="status-option none ${currentStatus === 'none' ? 'active' : ''}"
                     onclick="setLinkStatusLevel('${libKey}', '${catKey}', ${linkIndex}, 'none', this)" title="Sin estado">✕</div>
                <div class="status-option watching ${currentStatus === 'watching' ? 'active' : ''}"
                     onclick="setLinkStatusLevel('${libKey}', '${catKey}', ${linkIndex}, 'watching', this)" title="Viendo">🟡</div>
                <div class="status-option watched ${currentStatus === 'watched' ? 'active' : ''}"
                     onclick="setLinkStatusLevel('${libKey}', '${catKey}', ${linkIndex}, 'watched', this)" title="Visto">🔵</div>
                <div class="status-option understood ${currentStatus === 'understood' ? 'active' : ''}"
                     onclick="setLinkStatusLevel('${libKey}', '${catKey}', ${linkIndex}, 'understood', this)" title="Entendido">🟢</div>
                <div class="status-option applied ${currentStatus === 'applied' ? 'active' : ''}"
                     onclick="setLinkStatusLevel('${libKey}', '${catKey}', ${linkIndex}, 'applied', this)" title="Aplicado">⭐</div>
            </div>
        </div>
    `;
}

/**
 * Toggle status options visibility (for mobile)
 */
function toggleStatusOptions(wrapper) {
    // Close all other open status options
    document.querySelectorAll('.status-indicator-wrapper.touch-active').forEach(w => {
        if (w !== wrapper) w.classList.remove('touch-active');
    });
    wrapper.classList.toggle('touch-active');
}

/**
 * Set link status to a specific level
 */
function setLinkStatusLevel(libKey, catKey, linkIndex, level, optionElement) {
    const link = DATA.libraries[libKey]?.categories[catKey]?.links[linkIndex];
    if (!link) return;

    // Reset all statuses
    link.status = { watching: false, watched: false, understood: false, applied: false };

    // Set the appropriate level
    if (level === 'watching') {
        link.status.watching = true;
    } else if (level === 'watched') {
        link.status.watching = true;
        link.status.watched = true;
    } else if (level === 'understood') {
        link.status.watching = true;
        link.status.watched = true;
        link.status.understood = true;
    } else if (level === 'applied') {
        link.status.watching = true;
        link.status.watched = true;
        link.status.understood = true;
        link.status.applied = true;
    }

    // Animate the dot
    const wrapper = optionElement.closest('.status-indicator-wrapper');
    const dot = wrapper.querySelector('.status-dot');
    dot.classList.remove('none', 'watching', 'watched', 'understood', 'applied');
    dot.classList.add(level, 'pulse');

    // Update active state on options
    wrapper.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('active'));
    optionElement.classList.add('active');

    // Close options after selection
    setTimeout(() => {
        wrapper.classList.remove('touch-active');
        dot.classList.remove('pulse');
    }, 400);

    save();
    showToast('💾 Estado actualizado', false);
}

// Close status options when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.status-indicator-wrapper')) {
        document.querySelectorAll('.status-indicator-wrapper.touch-active').forEach(w => {
            w.classList.remove('touch-active');
        });
    }
});

// ================= EXPANDABLE NOTES HELPERS =================

/**
 * Render expandable note for a link
 */
function renderExpandableNote(libKey, catKey, linkIndex, link) {
    const noteId = `${libKey}-${catKey}-${linkIndex}`;
    const isExpanded = isNoteExpanded(noteId);
    const hasNote = link.linkNotes && link.linkNotes.trim().length > 0;
    const previewText = hasNote ? link.linkNotes.substring(0, 50) + (link.linkNotes.length > 50 ? '...' : '') : 'Add note...';

    return `
        <div class="mt-2" onclick="event.stopPropagation()">
            <div class="note-trigger ${hasNote ? 'has-note' : ''}" onclick="toggleExpandableNote('${noteId}')">
                <span class="note-trigger-icon">📝</span>
                <span class="note-trigger-text">${escapeHtmlAttribute(previewText)}</span>
                <span style="transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 200ms;">▼</span>
            </div>
            <div class="expandable-note ${isExpanded ? 'open' : ''}" id="expandable-note-${noteId}">
                <div class="expandable-note-inner">
                    <textarea
                        class="premium-textarea"
                        placeholder="Write your notes here..."
                        maxlength="500"
                        oninput="handleNoteInput('${libKey}', '${catKey}', ${linkIndex}, this)"
                        onkeydown="handleNoteKeydown(event, '${noteId}')"
                    >${escapeHtmlAttribute(link.linkNotes || '')}</textarea>
                    <div class="note-save-indicator">
                        <span id="note-count-${noteId}">${(link.linkNotes || '').length}/500</span>
                        <span id="note-saved-${noteId}"></span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle expandable note open/closed
 */
function toggleExpandableNote(noteId) {
    toggleNoteExpanded(noteId);
    const noteEl = document.getElementById(`expandable-note-${noteId}`);
    if (noteEl) {
        noteEl.classList.toggle('open', isNoteExpanded(noteId));
        // Focus textarea if opening
        if (isNoteExpanded(noteId)) {
            const textarea = noteEl.querySelector('textarea');
            if (textarea) {
                setTimeout(() => textarea.focus(), 100);
            }
        }
    }
}

/**
 * Handle note input with debounced save
 */
let noteInputDebounce = null;
function handleNoteInput(libKey, catKey, linkIndex, textarea) {
    const noteId = `${libKey}-${catKey}-${linkIndex}`;
    const link = DATA.libraries[libKey]?.categories[catKey]?.links[linkIndex];
    if (!link) return;

    link.linkNotes = textarea.value.substring(0, 500);

    // Update count
    const countEl = document.getElementById(`note-count-${noteId}`);
    if (countEl) countEl.textContent = `${link.linkNotes.length}/500`;

    // Show saving indicator
    const savedEl = document.getElementById(`note-saved-${noteId}`);
    if (savedEl) savedEl.textContent = 'Saving...';

    // Auto-grow textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';

    // Debounced save
    clearTimeout(noteInputDebounce);
    noteInputDebounce = setTimeout(() => {
        save();
        if (savedEl) {
            savedEl.textContent = '✓ Saved';
            savedEl.classList.add('saved');
            setTimeout(() => {
                savedEl.textContent = '';
                savedEl.classList.remove('saved');
            }, 2000);
        }
    }, 500);
}

/**
 * Handle keydown in note (ESC to close)
 */
function handleNoteKeydown(event, noteId) {
    if (event.key === 'Escape') {
        toggleExpandableNote(noteId);
    }
}

// ================= STATUS BADGE HELPER =================
function getStatusBadge(status) {
    if (!status) return '';

    // Priority order: Applied > Understood > Watched > Watching
    if (status.applied) {
        return '<span class="status-badge badge-applied">⭐ Aplicado</span>';
    }
    if (status.understood) {
        return '<span class="status-badge badge-understood">🟢 Entendido</span>';
    }
    if (status.watched) {
        return '<span class="status-badge badge-watched">🔵 Visto</span>';
    }
    if (status.watching) {
        return '<span class="status-badge badge-watching">🟡 Viendo</span>';
    }
    return '';
}

// ========================================
// ORGANIZE MODE FUNCTIONS
// ========================================

function toggleOrganizeMode(libKey, catKey) {
    const key = `${libKey}-${catKey}`;
    if (organizeMode.has(key)) {
        organizeMode.delete(key);
    } else {
        organizeMode.add(key);
    }
    render();
}

function isOrganizeMode(libKey, catKey) {
    return organizeMode.has(`${libKey}-${catKey}`);
}

function saveOrganizeOrder(libKey, catKey) {
    organizeMode.delete(`${libKey}-${catKey}`);
    save();
    render();
    showToast('✅ Orden guardado');
}

// ========================================
// DRAG & DROP - STAIR STEP IMPLEMENTATION
// Items swap positions with visible 400ms animations
// NO opacity changes - items always 100% solid
// ========================================

// Global drag state
let draggedData = null;
let dragType = null; // 'link' or 'category'
let stairDragState = null; // Stair step drag tracking

// ================== STAIR STEP DRAG SYSTEM ==================

/**
 * Initialize stair step drag for organize mode
 * Items swap positions with visible 400ms animations when crossing midpoints
 * Uses FLIP technique for smooth DOM reorder animations
 */
function initStairDrag(element, libKey, catKey, linkIndex) {
    const container = element.closest('.category-drop-zone');
    if (!container) return null;

    const items = Array.from(container.querySelectorAll('.organize-item'));
    const itemIndex = items.indexOf(element);

    // Create transparent drag image to hide default ghost
    const dragImage = document.createElement('div');
    dragImage.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px;';
    document.body.appendChild(dragImage);

    return {
        element,
        container,
        libKey,
        catKey,
        originalIndex: linkIndex,
        currentIndex: itemIndex,
        items,
        dragImage,
        lastSwapTime: 0,
        swapCooldown: 450, // Slightly longer than animation to ensure completion
        isSwapping: false
    };
}

/**
 * Handle stair step drag movement
 * Checks for midpoint crossings and triggers swaps
 */
function handleStairDragMove(event) {
    if (!stairDragState || stairDragState.isSwapping) return;

    const { element, items, currentIndex, lastSwapTime, swapCooldown } = stairDragState;
    const now = Date.now();

    // Cooldown to prevent rapid swapping
    if (now - lastSwapTime < swapCooldown) return;

    const mouseY = event.clientY;

    // Find target based on midpoint crossing
    let targetIndex = null;

    for (let i = 0; i < items.length; i++) {
        if (items[i] === element) continue;

        const rect = items[i].getBoundingClientRect();
        const itemMidpoint = rect.top + rect.height / 2;

        // Dragging down: check if we've passed the item below
        if (i > currentIndex && mouseY > itemMidpoint) {
            targetIndex = i;
        }
        // Dragging up: check if we've passed the item above
        else if (i < currentIndex && mouseY < itemMidpoint) {
            targetIndex = i;
            break; // Take first match when going up
        }
    }

    // Perform swap if we found a valid target
    if (targetIndex !== null && targetIndex !== currentIndex) {
        performStairSwap(targetIndex);
    }
}

/**
 * Perform the swap using FLIP technique for smooth animation
 * FLIP = First, Last, Invert, Play
 */
function performStairSwap(targetIndex) {
    if (!stairDragState) return;

    const { element, container, items, currentIndex } = stairDragState;

    stairDragState.isSwapping = true;
    stairDragState.lastSwapTime = Date.now();

    const movingDown = targetIndex > currentIndex;

    // FIRST: Record positions before swap
    const firstPositions = new Map();
    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        firstPositions.set(item, { top: rect.top, left: rect.left });
    });

    // Perform DOM swap
    if (movingDown) {
        const targetElement = items[targetIndex];
        if (targetElement.nextSibling) {
            container.insertBefore(element, targetElement.nextSibling);
        } else {
            container.appendChild(element);
        }
    } else {
        const targetElement = items[targetIndex];
        container.insertBefore(element, targetElement);
    }

    // Update items array to match new DOM order
    const [movedItem] = stairDragState.items.splice(currentIndex, 1);
    stairDragState.items.splice(targetIndex, 0, movedItem);
    stairDragState.currentIndex = targetIndex;

    // LAST & INVERT: Calculate and apply inverse transforms
    items.forEach(item => {
        const firstPos = firstPositions.get(item);
        const lastRect = item.getBoundingClientRect();

        const deltaY = firstPos.top - lastRect.top;

        if (Math.abs(deltaY) > 1) {
            // Disable transitions, apply inverse transform
            item.style.transition = 'none';
            item.style.transform = `translateY(${deltaY}px)`;
        }
    });

    // PLAY: Animate to final position
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            items.forEach(item => {
                const firstPos = firstPositions.get(item);
                const lastRect = item.getBoundingClientRect();
                // Only animate items that actually moved (check original delta)
                const currentTransform = item.style.transform;
                if (currentTransform && currentTransform !== 'none') {
                    item.style.transition = 'transform 400ms cubic-bezier(0.4, 0.0, 0.2, 1)';
                    item.style.transform = '';
                }
            });

            // Clean up after animation
            setTimeout(() => {
                items.forEach(item => {
                    item.style.transition = '';
                    item.style.transform = '';
                });
                if (stairDragState) {
                    stairDragState.isSwapping = false;
                }
            }, 420);
        });
    });
}

/**
 * Finalize stair drag and update data
 */
function finalizeStairDrag() {
    if (!stairDragState) return;

    const { libKey, catKey, originalIndex, currentIndex, element, items, dragImage } = stairDragState;

    // Clean up visual states
    element.classList.remove('stair-dragging');
    items.forEach(item => {
        item.style.transition = '';
        item.style.transform = '';
        item.classList.remove('swap-up', 'swap-down', 'swap-settled');
    });

    // Remove the transparent drag image helper
    if (dragImage && dragImage.parentNode) {
        dragImage.parentNode.removeChild(dragImage);
    }

    // Update data if position changed
    if (currentIndex !== originalIndex) {
        const category = DATA.libraries[libKey]?.categories[catKey];
        if (category && category.links && category.links[originalIndex]) {
            // Remove from original position and insert at new position
            const [movedLink] = category.links.splice(originalIndex, 1);
            category.links.splice(currentIndex, 0, movedLink);

            save();
            showToast('✅ Link reordenado');
        }
    }

    stairDragState = null;
    render();
}

// ================== FUNCIONALIDAD 1 & 2: LINKS ==================

function handleLinkDragStart(event, libKey, catKey, linkIndex) {
    // Prevent link drag from interfering with category drag
    event.stopPropagation();

    const card = event.target.closest('.organize-item') || event.target.closest('.link-card');
    if (!card) return;

    // Store dragged link data
    draggedData = { libKey, catKey, linkIndex };
    dragType = 'link';

    // Configure drag
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'link',
        libKey,
        catKey,
        linkIndex
    }));

    // For organize mode, use stair step drag
    if (card.classList.contains('organize-item')) {
        stairDragState = initStairDrag(card, libKey, catKey, linkIndex);

        // Use transparent drag image to hide browser's ghost
        // This keeps our original element visible and animatable
        if (stairDragState && stairDragState.dragImage) {
            event.dataTransfer.setDragImage(stairDragState.dragImage, 0, 0);
        }

        setTimeout(() => {
            card.classList.add('stair-dragging');
        }, 0);
    } else {
        setTimeout(() => {
            card.classList.add('dragging');
        }, 0);
    }

    // Mark drop zones as available
    setTimeout(() => {
        document.querySelectorAll('.category-drop-zone').forEach(zone => {
            zone.classList.add('drop-zone-available');
        });
    }, 10);
}

function handleLinkDragEnd(event) {
    const card = event.target.closest('.organize-item') || event.target.closest('.link-card');

    // Handle stair drag finalization
    if (stairDragState) {
        finalizeStairDrag();
        cleanupAllDragStates();
        return;
    }

    if (card) {
        card.classList.remove('dragging', 'stair-dragging');
    }

    cleanupAllDragStates();
}

function handleLinkDragOver(event, libKey, catKey) {
    if (dragType !== 'link') return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    const zone = event.currentTarget;

    // Mark this zone as active drop target
    document.querySelectorAll('.drop-target-active').forEach(z => {
        if (z !== zone) z.classList.remove('drop-target-active');
    });

    if (!zone.classList.contains('drop-target-active')) {
        zone.classList.add('drop-target-active');
    }

    // Handle stair step drag for same category (organize mode)
    if (stairDragState && draggedData.libKey === libKey && draggedData.catKey === catKey) {
        handleStairDragMove(event);
    } else if (draggedData && draggedData.libKey === libKey && draggedData.catKey === catKey) {
        // Same category but not stair drag - no preview needed, position tracked by DOM
    } else {
        // For different categories, show simple drop indicator
        showLinkDropIndicator(event, zone);
    }
}

function handleLinkDragLeave(event) {
    const zone = event.currentTarget;
    const relatedTarget = event.relatedTarget;

    // Only remove if we actually left the zone
    if (!zone.contains(relatedTarget)) {
        zone.classList.remove('drop-target-active');
        removeDropIndicators();
    }
}

function handleLinkDrop(event, targetLibKey, targetCatKey) {
    event.preventDefault();
    event.stopPropagation();

    // Stair drag handles its own finalization
    if (stairDragState && draggedData.libKey === targetLibKey && draggedData.catKey === targetCatKey) {
        // Let dragend handle finalization
        return;
    }

    if (dragType !== 'link' || !draggedData) {
        cleanupAllDragStates();
        return;
    }

    const { libKey: sourceLibKey, catKey: sourceCatKey, linkIndex: sourceIndex } = draggedData;

    // Verify data exists
    const sourceCategory = DATA.libraries[sourceLibKey]?.categories[sourceCatKey];
    if (!sourceCategory || !sourceCategory.links || !sourceCategory.links[sourceIndex]) {
        console.error('Link origen no encontrado');
        cleanupAllDragStates();
        return;
    }

    const targetCategory = DATA.libraries[targetLibKey]?.categories[targetCatKey];
    if (!targetCategory) {
        console.error('Categoría destino no encontrada');
        cleanupAllDragStates();
        return;
    }

    // Copy the link
    const link = { ...sourceCategory.links[sourceIndex] };

    // Same category reorder (non-stair mode)
    if (sourceLibKey === targetLibKey && sourceCatKey === targetCatKey) {
        const dropIndex = getDropIndex(event, targetLibKey, targetCatKey);

        if (dropIndex !== null && dropIndex !== sourceIndex) {
            sourceCategory.links.splice(sourceIndex, 1);
            const adjustedIndex = dropIndex > sourceIndex ? dropIndex - 1 : dropIndex;
            sourceCategory.links.splice(adjustedIndex, 0, link);

            save();
            render();
            showToast('✅ Link reordenado');
        }
    } else {
        // FUNCIONALIDAD 1: Move between categories
        sourceCategory.links.splice(sourceIndex, 1);

        if (!targetCategory.links) targetCategory.links = [];

        const dropIndex = getDropIndex(event, targetLibKey, targetCatKey);
        if (dropIndex !== null) {
            targetCategory.links.splice(dropIndex, 0, link);
        } else {
            targetCategory.links.push(link);
        }

        save();
        render();
        showToast(`✅ Link movido a "${targetCategory.name}"`);
    }

    cleanupAllDragStates();
}

// Calculate insertion index based on mouse position
function getDropIndex(event, libKey, catKey) {
    const zone = event.currentTarget;
    const items = zone.querySelectorAll('.organize-item:not(.stair-dragging):not(.dragging), .link-card:not(.dragging)');

    if (items.length === 0) return 0;

    const mouseY = event.clientY;

    for (let i = 0; i < items.length; i++) {
        const card = items[i];
        const rect = card.getBoundingClientRect();
        const cardMiddle = rect.top + rect.height / 2;

        if (mouseY < cardMiddle) {
            return i;
        }
    }

    return items.length;
}

// Show simple drop indicator line for cross-category drops
function showLinkDropIndicator(event, zone) {
    removeDropIndicators();

    const items = zone.querySelectorAll('.organize-item:not(.stair-dragging):not(.dragging), .link-card:not(.dragging)');
    if (items.length === 0) {
        // Empty category - show indicator at top
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        zone.prepend(indicator);
        return;
    }

    const mouseY = event.clientY;
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';

    for (let i = 0; i < items.length; i++) {
        const card = items[i];
        const rect = card.getBoundingClientRect();
        const cardMiddle = rect.top + rect.height / 2;

        if (mouseY < cardMiddle) {
            card.parentNode.insertBefore(indicator, card);
            return;
        }
    }

    // Insert at end
    const lastCard = items[items.length - 1];
    lastCard.parentNode.insertBefore(indicator, lastCard.nextSibling);
}

// ================== FUNCIONALIDAD 3 & 4: CATEGORIES ==================

function handleCategoryDragStart(event, libKey, catKey) {
    // Guardar datos de la categoría siendo arrastrada
    draggedData = { libKey, catKey };
    dragType = 'category';

    // Configurar el drag
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'category',
        libKey,
        catKey
    }));

    // Encontrar la card correcta
    const card = event.target.closest('.category-card');
    if (card) {
        setTimeout(() => {
            card.classList.add('dragging-category');
        }, 0);
    }

    // Resaltar libraries en sidebar como destinos válidos
    setTimeout(() => {
        document.querySelectorAll('.library-item').forEach(lib => {
            lib.classList.add('library-drop-zone');
        });
        // También resaltar otras categorías para reordenamiento
        document.querySelectorAll('.category-card').forEach(cat => {
            if (!cat.classList.contains('dragging-category')) {
                cat.classList.add('category-reorder-zone');
            }
        });
    }, 10);
}

function handleCategoryDragEnd(event) {
    const card = event.target.closest('.category-card');
    if (card) {
        card.classList.remove('dragging-category');
    }

    cleanupAllDragStates();
}

function handleLibraryDragOver(event, targetLibKey) {
    if (dragType !== 'category') return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const libItem = event.currentTarget;

    // Remover active de otras libraries
    document.querySelectorAll('.library-drop-active').forEach(lib => {
        if (lib !== libItem) lib.classList.remove('library-drop-active');
    });

    if (!libItem.classList.contains('library-drop-active')) {
        libItem.classList.add('library-drop-active');
    }
}

function handleLibraryDragLeave(event) {
    const libItem = event.currentTarget;
    const relatedTarget = event.relatedTarget;

    if (!libItem.contains(relatedTarget)) {
        libItem.classList.remove('library-drop-active');
    }
}

function handleLibraryDrop(event, targetLibKey) {
    event.preventDefault();
    event.stopPropagation();

    if (dragType !== 'category' || !draggedData) {
        cleanupAllDragStates();
        return;
    }

    const { libKey: sourceLibKey, catKey } = draggedData;

    // Si es la misma library, no hacer nada
    if (sourceLibKey === targetLibKey) {
        cleanupAllDragStates();
        return;
    }

    const sourceLib = DATA.libraries[sourceLibKey];
    const targetLib = DATA.libraries[targetLibKey];

    if (!sourceLib || !targetLib || !sourceLib.categories[catKey]) {
        cleanupAllDragStates();
        return;
    }

    // FUNCIONALIDAD 3: Mover categoría entre libraries
    const category = { ...sourceLib.categories[catKey] };
    delete sourceLib.categories[catKey];

    if (!targetLib.categories) targetLib.categories = {};
    targetLib.categories[catKey] = category;

    save();
    render();
    showToast(`✅ Categoría movida a "${targetLib.name}"`);

    cleanupAllDragStates();
}

// FUNCIONALIDAD 4: Reordenar categorías dentro de library
function handleCategoryReorderDragOver(event, targetLibKey, targetCatKey) {
    if (dragType !== 'category') return;
    if (!draggedData || draggedData.catKey === targetCatKey) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const card = event.currentTarget;

    // Mostrar indicador de reordenamiento
    removeDropIndicators();

    const rect = card.getBoundingClientRect();
    const mouseY = event.clientY;
    const cardMiddle = rect.top + rect.height / 2;

    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator category-indicator';

    if (mouseY < cardMiddle) {
        card.parentNode.insertBefore(indicator, card);
    } else {
        card.parentNode.insertBefore(indicator, card.nextSibling);
    }
}

function handleCategoryReorderDrop(event, targetLibKey, targetCatKey) {
    event.preventDefault();
    event.stopPropagation();

    if (dragType !== 'category' || !draggedData) {
        cleanupAllDragStates();
        return;
    }

    const { libKey: sourceLibKey, catKey: sourceCatKey } = draggedData;

    // Solo reordenar si es la misma library
    if (sourceLibKey !== targetLibKey) {
        cleanupAllDragStates();
        return;
    }

    // Si es la misma categoría, no hacer nada
    if (sourceCatKey === targetCatKey) {
        cleanupAllDragStates();
        return;
    }

    const lib = DATA.libraries[sourceLibKey];
    if (!lib || !lib.categories) {
        cleanupAllDragStates();
        return;
    }

    // FUNCIONALIDAD 4: Reordenar categorías
    const catKeys = Object.keys(lib.categories);
    const sourceIndex = catKeys.indexOf(sourceCatKey);
    const targetIndex = catKeys.indexOf(targetCatKey);

    if (sourceIndex === -1 || targetIndex === -1) {
        cleanupAllDragStates();
        return;
    }

    // Calcular si insertar antes o después basado en posición del mouse
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const mouseY = event.clientY;
    const cardMiddle = rect.top + rect.height / 2;

    let newIndex = mouseY < cardMiddle ? targetIndex : targetIndex + 1;
    if (newIndex > sourceIndex) newIndex--;

    // Crear nuevo orden
    const movedCatKey = catKeys.splice(sourceIndex, 1)[0];
    catKeys.splice(newIndex, 0, movedCatKey);

    // Reconstruir objeto de categorías en nuevo orden
    const newCategories = {};
    catKeys.forEach(key => {
        newCategories[key] = lib.categories[key];
    });
    lib.categories = newCategories;

    save();
    render();
    showToast('✅ Categoría reordenada');

    cleanupAllDragStates();
}

// ================== TOUCH SUPPORT FOR MOBILE ==================

let touchDragState = null;

function handleTouchStart(event, libKey, catKey, linkIndex) {
    // Only handle single touch
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const card = event.target.closest('.organize-item');
    if (!card) return;

    // Store initial touch state
    touchDragState = {
        card,
        libKey,
        catKey,
        linkIndex,
        startY: touch.clientY,
        startX: touch.clientX,
        isDragging: false,
        scrollStartY: card.closest('.category-drop-zone')?.scrollTop || 0
    };

    // Don't prevent default yet - let user scroll if they swipe horizontally
}

function handleTouchMove(event) {
    if (!touchDragState) return;

    const touch = event.touches[0];
    const deltaY = Math.abs(touch.clientY - touchDragState.startY);
    const deltaX = Math.abs(touch.clientX - touchDragState.startX);

    // If dragging hasn't started, check if we should start it
    if (!touchDragState.isDragging) {
        // Start drag if moved enough vertically and more vertical than horizontal
        if (deltaY > 10 && deltaY > deltaX) {
            touchDragState.isDragging = true;

            // Initialize stair drag system
            const { card, libKey, catKey, linkIndex } = touchDragState;
            draggedData = { libKey, catKey, linkIndex };
            dragType = 'link';
            stairDragState = initStairDrag(card, libKey, catKey, linkIndex);

            card.classList.add('stair-dragging');

            // Prevent scrolling while dragging
            event.preventDefault();
        }
        return;
    }

    // Prevent scrolling while dragging
    event.preventDefault();

    // Simulate drag move
    if (stairDragState) {
        const syntheticEvent = { clientY: touch.clientY };
        handleStairDragMove(syntheticEvent);
    }
}

function handleTouchEnd(event) {
    if (!touchDragState) return;

    if (touchDragState.isDragging && stairDragState) {
        // Finalize the drag
        finalizeStairDrag();
        cleanupAllDragStates();
    }

    touchDragState = null;
}

function handleTouchCancel(event) {
    if (touchDragState && touchDragState.isDragging) {
        cleanupAllDragStates();
    }
    touchDragState = null;
}

// Initialize touch event listeners (called after DOM ready)
function initTouchDragSupport() {
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchCancel);
}

// Call on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTouchDragSupport);
} else {
    initTouchDragSupport();
}

// ================== HELPERS ==================

function removeDropIndicators() {
    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
}

function cleanupAllDragStates() {
    // Clean up drag image if exists
    if (stairDragState && stairDragState.dragImage && stairDragState.dragImage.parentNode) {
        stairDragState.dragImage.parentNode.removeChild(stairDragState.dragImage);
    }

    draggedData = null;
    dragType = null;
    stairDragState = null;
    touchDragState = null;

    // Clean up link/organize-item drag classes and inline styles
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.stair-dragging').forEach(el => el.classList.remove('stair-dragging'));
    document.querySelectorAll('.drop-zone-available').forEach(el => el.classList.remove('drop-zone-available'));
    document.querySelectorAll('.drop-target-active').forEach(el => el.classList.remove('drop-target-active'));

    // Clean up stair step animation classes and inline styles
    document.querySelectorAll('.organize-item').forEach(el => {
        el.classList.remove('swap-up', 'swap-down', 'swap-settled');
        el.style.transition = '';
        el.style.transform = '';
    });

    // Clean up category drag classes
    document.querySelectorAll('.dragging-category').forEach(el => el.classList.remove('dragging-category'));
    document.querySelectorAll('.library-drop-zone').forEach(el => el.classList.remove('library-drop-zone'));
    document.querySelectorAll('.library-drop-active').forEach(el => el.classList.remove('library-drop-active'));
    document.querySelectorAll('.category-reorder-zone').forEach(el => el.classList.remove('category-reorder-zone'));

    // Clean up indicators
    removeDropIndicators();
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

let currentSearchQuery = '';

// Handle search input
function handleSearch(query) {
    currentSearchQuery = query.toLowerCase().trim();

    // Sync both search inputs
    const desktopInput = document.getElementById('search-input');
    const mobileInput = document.getElementById('mobile-search-input');

    if (desktopInput && desktopInput.value !== query) {
        desktopInput.value = query;
    }
    if (mobileInput && mobileInput.value !== query) {
        mobileInput.value = query;
    }

    // Update clear button visibility for all clear buttons
    document.querySelectorAll('.search-clear').forEach(clearBtn => {
        clearBtn.classList.toggle('visible', query.length > 0);
    });

    // Re-render with search filter
    render();
}

// Clear search
function clearSearch() {
    const desktopInput = document.getElementById('search-input');
    const mobileInput = document.getElementById('mobile-search-input');

    if (desktopInput) desktopInput.value = '';
    if (mobileInput) mobileInput.value = '';

    handleSearch('');

    // Focus the appropriate input based on screen size
    if (window.innerWidth >= 768 && desktopInput) {
        desktopInput.focus();
    } else if (mobileInput) {
        mobileInput.focus();
    }
}

// Focus search input (keyboard shortcut)
function focusSearch() {
    // Focus the appropriate input based on screen size
    const desktopInput = document.getElementById('search-input');
    const mobileInput = document.getElementById('mobile-search-input');

    if (window.innerWidth >= 768 && desktopInput) {
        desktopInput.focus();
        desktopInput.select();
    } else if (mobileInput) {
        mobileInput.focus();
        mobileInput.select();
    }
}

// Initialize keyboard shortcuts
function initSearchShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K to focus search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            focusSearch();
        }

        // Escape to clear search if input is focused
        if (e.key === 'Escape') {
            const desktopInput = document.getElementById('search-input');
            const mobileInput = document.getElementById('mobile-search-input');
            const activeElement = document.activeElement;

            if ((desktopInput && activeElement === desktopInput) ||
                (mobileInput && activeElement === mobileInput)) {
                if (currentSearchQuery) {
                    clearSearch();
                } else {
                    activeElement.blur();
                }
            }
        }
    });
}

// Check if a library matches search query
function libraryMatchesSearch(lib, libKey) {
    if (!currentSearchQuery) return true;

    // Check library name
    if (lib.name.toLowerCase().includes(currentSearchQuery)) return true;

    // Check if any category or link in this library matches
    if (lib.categories) {
        for (const catKey in lib.categories) {
            if (categoryMatchesSearch(lib.categories[catKey], libKey, catKey)) {
                return true;
            }
        }
    }

    return false;
}

// Check if a category matches search query
function categoryMatchesSearch(category, libKey, catKey) {
    if (!currentSearchQuery) return true;

    // Check category name
    if (category.name.toLowerCase().includes(currentSearchQuery)) return true;

    // Check category description
    if (category.description && category.description.toLowerCase().includes(currentSearchQuery)) return true;

    // Check if any link in this category matches
    if (category.links) {
        for (const link of category.links) {
            if (linkMatchesSearch(link)) return true;
        }
    }

    return false;
}

// Check if a link matches search query
function linkMatchesSearch(link) {
    if (!currentSearchQuery) return true;

    // Check link title
    if (link.title && link.title.toLowerCase().includes(currentSearchQuery)) return true;

    // Check link description
    if (link.description && link.description.toLowerCase().includes(currentSearchQuery)) return true;

    // Check link URL
    if (link.url && link.url.toLowerCase().includes(currentSearchQuery)) return true;

    // Check quick note
    if (link.quickNote && link.quickNote.toLowerCase().includes(currentSearchQuery)) return true;

    return false;
}

// Initialize search on page load
document.addEventListener('DOMContentLoaded', () => {
    initSearchShortcuts();
});

// ================= UI RENDER =================
function render() {
    ensureDataStructure();
    renderLibrarySidebar();
    renderMobileLibraryDropdown();
    renderCategories();
    document.getElementById('manageBtn').innerText = manageCategories ? 'Hecho' : 'Gestionar';

    // Update Quick Access Bar if Ultra Focus module is loaded
    if (typeof renderQuickAccessBar === 'function') {
        renderQuickAccessBar();
    }

    // Trigger library change animation
    triggerLibraryChangeAnimation();
}

function renderLibrarySidebar() {
    const list = document.getElementById('library-list');
    list.innerHTML = '';

    Object.keys(DATA.libraries).forEach(libKey => {
        const lib = DATA.libraries[libKey];
        const isActive = libKey === DATA.currentLibrary;
        const catCount = Object.keys(lib.categories || {}).length;

        // Check if library matches search
        const matchesSearch = libraryMatchesSearch(lib, libKey);

        const div = document.createElement('div');
        div.className = `library-item p-3 rounded-xl border border-transparent ${isActive ? 'active' : ''} ${currentSearchQuery && matchesSearch ? 'search-match' : ''} ${currentSearchQuery && !matchesSearch ? 'search-hidden' : ''}`;

        // Drop handlers for moving categories to this library
        div.ondragover = (e) => handleLibraryDragOver(e, libKey);
        div.ondragleave = (e) => handleLibraryDragLeave(e);
        div.ondrop = (e) => handleLibraryDrop(e, libKey);

        div.innerHTML = `
            <div class="flex items-center gap-2" onclick="selectLibrary('${libKey}')">
                <span class="text-lg">${lib.icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">${lib.name}</p>
                    <p class="text-[10px] text-slate-500">${catCount} cat.</p>
                </div>
            </div>
            ${manageCategories ? `
                <div class="flex gap-1 mt-2 pt-2 border-t border-white/5">
                    <button onclick="event.stopPropagation(); openLibraryModal('${libKey}')" class="flex-1 text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition">Edit</button>
                    <button onclick="event.stopPropagation(); deleteLibrary('${libKey}')" class="flex-1 text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">Del</button>
                </div>
            ` : ''}
        `;
        list.appendChild(div);
    });
}

function renderMobileLibraryDropdown() {
    const dropdown = document.getElementById('mobile-library-dropdown');
    dropdown.innerHTML = '';

    Object.keys(DATA.libraries).forEach(libKey => {
        const lib = DATA.libraries[libKey];
        const option = document.createElement('option');
        option.value = libKey;
        option.textContent = `${lib.icon} ${lib.name}`;
        option.selected = libKey === DATA.currentLibrary;
        dropdown.appendChild(option);
    });
}

function renderCategories() {
    const container = document.getElementById('sections-container');
    container.innerHTML = '';

    const currentLib = getCurrentLibrary();
    if (!currentLib || !currentLib.categories) return;

    const searchAll = document.getElementById('search-all-libraries')?.checked;
    const hasSearchQuery = currentSearchQuery.length > 0;

    // Determine which categories to show
    let categoriesToRender = [];

    // When searching, always search across all libraries
    if (hasSearchQuery || searchAll) {
        // Show categories from all libraries
        Object.keys(DATA.libraries).forEach(libKey => {
            const lib = DATA.libraries[libKey];
            Object.keys(lib.categories || {}).forEach(catKey => {
                const category = lib.categories[catKey];
                // Only include if category matches search
                if (!hasSearchQuery || categoryMatchesSearch(category, libKey, catKey)) {
                    categoriesToRender.push({ libKey, catKey, category });
                }
            });
        });
    } else {
        // Show only current library's categories
        Object.keys(currentLib.categories).forEach(catKey => {
            categoriesToRender.push({
                libKey: DATA.currentLibrary,
                catKey,
                category: currentLib.categories[catKey]
            });
        });
    }

    // Apply focus filter
    if (focusCategory) {
        categoriesToRender = categoriesToRender.filter(item => item.catKey === focusCategory);
    }

    if (categoriesToRender.length === 0) {
        const emptyMessage = hasSearchQuery
            ? `<p class="text-slate-500">No se encontraron resultados para "<span class="text-white">${currentSearchQuery}</span>"</p>
               <button onclick="clearSearch()" class="mt-4 px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition">Limpiar busqueda</button>`
            : `<p class="text-slate-500">No hay categorias en esta libreria.</p>
               <button onclick="openCategoryModal()" class="mt-4 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition">+ Crear Categoria</button>`;

        container.innerHTML = `
            <div class="glass rounded-3xl p-12 text-center">
                ${emptyMessage}
            </div>
        `;
        return;
    }

    categoriesToRender.forEach(({ libKey, catKey, category: s }) => {
        const isOpen = openSections.has(catKey);
        const div = document.createElement('div');
        div.className = `glass category-card rounded-3xl overflow-hidden border-l-[6px] shadow-lg mb-6 transition-all`;
        div.dataset.catKey = catKey;
        div.style.borderColor = s.color;

        // FUNCIONALIDAD 4: Drop handlers para reordenar categorías
        div.ondragover = (e) => handleCategoryReorderDragOver(e, libKey, catKey);
        div.ondrop = (e) => handleCategoryReorderDrop(e, libKey, catKey);

        div.innerHTML = `
            <div class="category-header flex flex-col md:flex-row justify-between items-start md:items-center p-6 cursor-pointer hover:bg-white/[0.02] transition"
                 draggable="true"
                 ondragstart="handleCategoryDragStart(event, '${libKey}', '${catKey}')"
                 ondragend="handleCategoryDragEnd(event)"
                 onclick="toggleSectionDisplay('${catKey}')">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-4">
                        <span class="category-drag-handle text-slate-500 hover:text-slate-300 text-lg" title="Arrastra para mover">⋮⋮</span>
                        <span class="text-3xl">${s.icon}</span>
                        <h2 class="text-xl font-bold text-white uppercase tracking-tight">${s.name}</h2>
                        ${s.progress ? `<span class="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-bold border border-blue-500/30 uppercase">${s.progress}</span>` : ''}
                        ${(searchAll || hasSearchQuery) ? `<span class="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400">${DATA.libraries[libKey].icon} ${DATA.libraries[libKey].name}</span>` : ''}
                    </div>
                    ${s.description ? `<p class="text-xs text-slate-500 ml-12 mt-1 line-clamp-1">${s.description}</p>` : ''}
                </div>
                <div class="flex items-center gap-3 mt-4 md:mt-0" onclick="event.stopPropagation()">
                    <button class="px-4 py-2 rounded-xl text-xs font-bold text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 transition" onclick="addLink('${libKey}', '${catKey}')">+ LINK</button>
                    <button class="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-700 transition" onclick="toggleFocus('${catKey}')">${focusCategory===catKey?'EXIT':'FOCUS'}</button>
                    ${manageCategories ? `
                        <button class="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 transition" onclick="openCategoryModal('${libKey}', '${catKey}')">EDIT</button>
                        <button class="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/20 text-red-500 hover:bg-red-500/30 transition" onclick="deleteCategory('${libKey}', '${catKey}')">DEL</button>
                    ` : ''}
                </div>
            </div>

            <div class="${isOpen ? '' : 'hidden'} p-6 pt-0 bg-black/10 border-t border-white/5 transition-all">
                <div class="mb-6 p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4 mt-6 group" onclick="event.stopPropagation()">
                    <div class="w-1.5 h-10 rounded-full" style="background:${s.color}"></div>
                    <div class="flex-1">
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nota de categoria</p>
                        <input class="w-full bg-transparent text-sm font-medium text-white outline-none focus:text-blue-400 transition category-note-input"
                               value="${escapeHtmlAttribute(s.task || '')}" placeholder="Nota general de esta categoria..."
                               onkeydown="if(event.key==='Enter') { saveTask('${libKey}', '${catKey}', this.value); this.blur(); }"
                               onblur="saveTask('${libKey}', '${catKey}', this.value)">
                    </div>
                </div>

                <!-- Organize Mode Controls with Layout Toggle -->
                <div class="flex items-center justify-between mb-4" onclick="event.stopPropagation()">
                    ${isOrganizeMode(libKey, catKey) ? `
                        <span class="text-xs text-slate-400">Arrastra para reordenar</span>
                        <button onclick="saveOrganizeOrder('${libKey}', '${catKey}')" class="px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 transition">
                            Guardar Orden
                        </button>
                    ` : `
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-slate-500">${(s.links || []).length} links</span>
                            <!-- Layout Toggle -->
                            <div class="layout-toggle-group">
                                <button class="layout-btn ${getCategoryLayout(catKey) === 'grid' ? 'active' : ''}"
                                        onclick="setCategoryLayout('${catKey}', 'grid')" title="Grid view">⊞</button>
                                <button class="layout-btn ${getCategoryLayout(catKey) === 'compact' ? 'active' : ''}"
                                        onclick="setCategoryLayout('${catKey}', 'compact')" title="Compact view">≡</button>
                                <button class="layout-btn ${getCategoryLayout(catKey) === 'expanded' ? 'active' : ''}"
                                        onclick="setCategoryLayout('${catKey}', 'expanded')" title="Expanded view">☰</button>
                            </div>
                        </div>
                        <button onclick="toggleOrganizeMode('${libKey}', '${catKey}')" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition flex items-center gap-2">
                            <span>Organizar</span>
                        </button>
                    `}
                </div>

                <div class="category-drop-zone ${isOrganizeMode(libKey, catKey) ? 'organize-mode flex flex-col' : getCategoryLayout(catKey) === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2' : 'flex flex-col'} gap-4 min-h-[100px] rounded-xl p-2 transition-all"
                     ${isOrganizeMode(libKey, catKey) ? `
                         ondragover="handleLinkDragOver(event, '${libKey}', '${catKey}')"
                         ondragleave="handleLinkDragLeave(event)"
                         ondrop="handleLinkDrop(event, '${libKey}', '${catKey}')"
                     ` : ''}>
                    ${renderLinks(libKey, catKey)}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderLinks(libKey, catKey) {
    const category = DATA.libraries[libKey]?.categories[catKey];
    if (!category) return '';

    const links = category.links || [];
    const taskText = (category.task || '').toLowerCase().trim();
    const taskWords = taskText.split(/\s+/).filter(w => w.length > 2);
    const inOrganizeMode = isOrganizeMode(libKey, catKey);
    const layout = getCategoryLayout(catKey);

    // Filter links based on search query
    const filteredLinks = currentSearchQuery
        ? links.map((link, index) => ({ link, index, matches: linkMatchesSearch(link) }))
        : links.map((link, index) => ({ link, index, matches: true }));

    const visibleLinks = filteredLinks.filter(item => item.matches);

    if (!links.length) return `<div class="col-span-full py-8 text-center text-slate-600 italic">Lista vacia${inOrganizeMode ? '' : ' - usa el boton Organizar para reordenar'}</div>`;

    if (visibleLinks.length === 0 && currentSearchQuery) {
        return `<div class="col-span-full py-8 text-center text-slate-600 italic">No hay links que coincidan con la busqueda</div>`;
    }

    // ORGANIZE MODE: List view with drag handles
    if (inOrganizeMode) {
        return filteredLinks.map(({ link: l, index: i, matches }) => {
            const hiddenClass = !matches ? 'search-hidden' : '';

            return `
            <div class="organize-item flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition ${hiddenClass}"
                 draggable="true"
                 ondragstart="handleLinkDragStart(event, '${libKey}', '${catKey}', ${i})"
                 ondragend="handleLinkDragEnd(event)"
                 ontouchstart="handleTouchStart(event, '${libKey}', '${catKey}', ${i})"
                 onclick="event.stopPropagation()">
                <span class="text-slate-500 text-xs font-mono w-6 text-center">${i + 1}</span>
                <span class="organize-drag-handle text-slate-400 hover:text-slate-200 cursor-grab text-lg" title="Arrastra para reordenar">≡</span>
                <img src="${l.icon || 'https://www.google.com/s2/favicons?sz=64&domain=' + l.url}" class="w-8 h-8 rounded-lg bg-slate-800 object-contain p-0.5 border border-white/5 flex-shrink-0">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">${l.title || 'Sin titulo'}</p>
                    <p class="text-[10px] text-slate-500 truncate">${l.url}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="text-blue-400/60 hover:text-blue-400 transition p-1" onclick="editLink('${libKey}', '${catKey}', ${i})" title="Editar">✏️</button>
                    <button class="text-red-500/40 hover:text-red-500 transition p-1" onclick="deleteLinkAnimated('${libKey}', '${catKey}', ${i}, this)" title="Eliminar">🗑️</button>
                </div>
            </div>`;
        }).join('');
    }

    // COMPACT MODE: Minimal rows with status dot
    if (layout === 'compact') {
        return filteredLinks.map(({ link: l, index: i, matches }) => {
            const hiddenClass = !matches ? 'search-hidden' : '';
            if (!l.status) l.status = { watching: false, watched: false, understood: false, applied: false };

            return `
            <div class="compact-link-row ${hiddenClass}" onclick="event.stopPropagation()">
                <img src="${l.icon || 'https://www.google.com/s2/favicons?sz=64&domain=' + l.url}" class="compact-link-favicon">
                <div class="compact-link-info">
                    <a href="${l.url}" target="_blank" class="compact-link-title" onclick="event.stopPropagation()">${l.title || 'Sin titulo'}</a>
                </div>
                ${renderStatusIndicator(libKey, catKey, i, l.status)}
                <div class="compact-link-actions">
                    <button class="text-blue-400/60 hover:text-blue-400 transition text-sm" onclick="editLink('${libKey}', '${catKey}', ${i})" title="Editar">✏️</button>
                    <button class="text-red-500/40 hover:text-red-500 transition text-sm" onclick="deleteLinkAnimated('${libKey}', '${catKey}', ${i}, this)" title="Eliminar">🗑️</button>
                </div>
            </div>`;
        }).join('');
    }

    // EXPANDED MODE: Compact + collapsible preview
    if (layout === 'expanded') {
        return filteredLinks.map(({ link: l, index: i, matches }) => {
            const hiddenClass = !matches ? 'search-hidden' : '';
            const embed = getEmbedInfo(l.url);
            const previewId = `expanded-preview-${libKey}-${catKey}-${i}`;
            if (!l.status) l.status = { watching: false, watched: false, understood: false, applied: false };

            return `
            <div class="expanded-link-card ${hiddenClass}" onclick="event.stopPropagation()" id="expanded-card-${libKey}-${catKey}-${i}">
                <div class="expanded-link-header" onclick="toggleExpandedPreview('${previewId}', '${libKey}-${catKey}-${i}')">
                    <img src="${l.icon || 'https://www.google.com/s2/favicons?sz=64&domain=' + l.url}" class="compact-link-favicon">
                    <div class="compact-link-info">
                        <a href="${l.url}" target="_blank" class="compact-link-title" onclick="event.stopPropagation()">${l.title || 'Sin titulo'}</a>
                        <p class="text-[10px] text-slate-500 truncate">${l.description || ''}</p>
                    </div>
                    ${renderStatusIndicator(libKey, catKey, i, l.status)}
                    <div class="compact-link-actions" style="opacity: 1;">
                        <button class="text-blue-400/60 hover:text-blue-400 transition text-sm" onclick="event.stopPropagation(); editLink('${libKey}', '${catKey}', ${i})" title="Editar">✏️</button>
                        <button class="text-red-500/40 hover:text-red-500 transition text-sm" onclick="event.stopPropagation(); deleteLinkAnimated('${libKey}', '${catKey}', ${i}, this)" title="Eliminar">🗑️</button>
                    </div>
                    <span class="text-slate-500 text-xs ml-2" id="expanded-arrow-${libKey}-${catKey}-${i}">▼</span>
                </div>
                <div class="expanded-link-preview" id="${previewId}">
                    <div class="expanded-link-preview-inner">
                        ${embed ? `
                            <div class="aspect-video bg-black rounded-xl overflow-hidden mt-2 border border-white/10">
                                <iframe class="w-full h-full" src="${embed.src}" allowfullscreen></iframe>
                            </div>
                            <button class="mt-3 px-4 py-2 rounded-lg bg-purple-500/20 text-xs font-bold text-purple-400 hover:bg-purple-500/30 transition" onclick="openVideoFocusModal('${libKey}', '${catKey}', ${i}, '${embed.type}', '${embed.src}')">🎬 Focus Mode</button>
                        ` : ''}
                        ${renderExpandableNote(libKey, catKey, i, l)}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // GRID MODE (default): Full cards with all details
    return filteredLinks.map(({ link: l, index: i, matches }) => {
        const hiddenClass = !matches ? 'search-hidden' : '';
        const titleMatch = taskWords.some(word => l.title.toLowerCase().includes(word));
        const descMatch = taskWords.some(word => (l.description || '').toLowerCase().includes(word));
        const isSmart = taskWords.length > 0 && (titleMatch || descMatch);
        const embed = getEmbedInfo(l.url);
        const pid = `${libKey}-${catKey}-${i}`;

        // Ensure status object exists with all fields
        if (!l.status) {
            l.status = { watching: false, watched: false, understood: false, applied: false };
        }

        let cardClass = "glass-card link-card p-4 rounded-2xl border flex flex-col gap-4 group ";
        if (isSmart) cardClass += "smart-highlight ";
        if (hiddenClass) cardClass += hiddenClass;

        const statusBadge = getStatusBadge(l.status);

        return `
        <div class="${cardClass}"
             onclick="event.stopPropagation()">
            <div class="flex justify-between items-start gap-3">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="flex flex-col items-center gap-1">
                        <img src="${l.icon || 'https://www.google.com/s2/favicons?sz=64&domain=' + l.url}" class="w-10 h-10 rounded-lg bg-slate-800 object-contain p-1 border border-white/5 shadow-inner flex-shrink-0">
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <a href="${l.url}" target="_blank" class="text-sm font-bold text-blue-400 hover:underline truncate" onclick="event.stopPropagation()">
                                ${l.title}
                            </a>
                            ${statusBadge}
                        </div>
                        <p class="text-[10px] text-slate-500 truncate mt-0.5">${l.description || 'Sin detalles'}</p>

                        <!-- Status Indicator with Hover -->
                        <div class="flex items-center gap-3 mt-2">
                            ${renderStatusIndicator(libKey, catKey, i, l.status)}
                            ${l.quickNote ? `<span class="text-[10px] text-slate-400 italic truncate">📝 ${l.quickNote}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button class="text-blue-400/60 hover:text-blue-400 transition" onclick="editLink('${libKey}', '${catKey}', ${i})" title="Editar">✏️</button>
                    <button class="text-red-500/40 hover:text-red-500 transition" onclick="deleteLinkAnimated('${libKey}', '${catKey}', ${i}, this)" title="Eliminar">🗑️</button>
                </div>
            </div>
            ${embed ? `
                <div class="flex gap-2">
                    <button class="flex-1 py-1.5 rounded-lg bg-white/5 text-[9px] font-bold text-slate-500 uppercase hover:bg-white/10 transition" onclick="togglePreview('${pid}', '${embed.type}', '${embed.src}')">Ver Preview</button>
                    <button class="px-3 py-1.5 rounded-lg bg-purple-500/20 text-[9px] font-bold text-purple-400 uppercase hover:bg-purple-500/30 transition" onclick="openVideoFocusModal('${libKey}', '${catKey}', ${i}, '${embed.type}', '${embed.src}')">🎬 Focus</button>
                </div>
                <div id="preview-${pid}"></div>
            ` : renderExpandableNote(libKey, catKey, i, l)}
        </div>`;
    }).join('');
}

/**
 * Toggle expanded preview in expanded layout
 */
function toggleExpandedPreview(previewId, cardId) {
    const preview = document.getElementById(previewId);
    const card = document.getElementById(`expanded-card-${cardId}`);
    const arrow = document.getElementById(`expanded-arrow-${cardId}`);

    if (preview && card) {
        const isOpen = preview.classList.contains('open');
        preview.classList.toggle('open', !isOpen);
        card.classList.toggle('preview-open', !isOpen);
        if (arrow) {
            arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }
}

/**
 * Delete link with animation
 */
function deleteLinkAnimated(libKey, catKey, linkIndex, buttonElement) {
    if (!confirm('Borrar link?')) return;

    const card = buttonElement.closest('.link-card, .compact-link-row, .expanded-link-card, .organize-item');
    animateItemDelete(card, () => {
        DATA.libraries[libKey].categories[catKey].links.splice(linkIndex, 1);
        save();
        render();
    });
}

// ================= TOAST =================
function showToast(message, isError = false) {
    const toast = document.getElementById('toast-notification');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-message');

    icon.textContent = isError ? '❌' : '✅';
    msg.textContent = message;
    toast.classList.remove('bg-emerald-600', 'bg-red-600');
    toast.classList.add(isError ? 'bg-red-600' : 'bg-emerald-600');

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}

// ================= SETTINGS MODAL =================

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('modal-active');
        renderSettingsContent();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('modal-active');
    }
}

function renderSettingsContent() {
    // Theme selection
    const currentTheme = appSettings.theme || 'auto';
    const themeButtons = document.querySelectorAll('.settings-theme-btn');
    themeButtons.forEach(btn => {
        const theme = btn.dataset.theme;
        btn.classList.toggle('active', theme === currentTheme);
    });

    // Quick Access Libraries
    renderQuickAccessSettings();
}

function setThemeMode(mode) {
    appSettings.theme = mode;
    saveAppSettings();

    // Update theme buttons
    document.querySelectorAll('.settings-theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === mode);
    });

    // Apply theme
    applyTheme(mode);
}

function applyTheme(mode) {
    if (mode === 'auto') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem(THEME_STORAGE_KEY, 'auto');
    } else if (mode === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    }
    updateThemeToggleIcon(mode === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode);
}

function renderQuickAccessSettings() {
    const container = document.getElementById('settings-qa-list');
    if (!container) return;

    const libKeys = Object.keys(DATA.libraries || {});
    const quickAccess = appSettings.quickAccessLibraries || [];

    container.innerHTML = libKeys.map(libKey => {
        const lib = DATA.libraries[libKey];
        const isEnabled = quickAccess.includes(libKey);
        const position = quickAccess.indexOf(libKey);

        return `
            <div class="settings-qa-item" draggable="true"
                 ondragstart="handleQADragStart(event, '${libKey}')"
                 ondragover="handleQADragOver(event)"
                 ondrop="handleQADrop(event, '${libKey}')"
                 ondragend="handleQADragEnd(event)">
                <span class="settings-qa-drag">⋮⋮</span>
                <span class="settings-qa-icon">${lib.icon}</span>
                <span class="settings-qa-name">${lib.name}</span>
                ${position >= 0 && position < 4 ? `<span class="text-[10px] text-blue-400 font-bold">#${position + 1}</span>` : ''}
                <div class="settings-qa-toggle ${isEnabled ? 'active' : ''}"
                     onclick="toggleQuickAccessLibrary('${libKey}')"></div>
            </div>
        `;
    }).join('');
}

function toggleQuickAccessLibrary(libKey) {
    const index = appSettings.quickAccessLibraries.indexOf(libKey);
    if (index >= 0) {
        appSettings.quickAccessLibraries.splice(index, 1);
    } else {
        // Add to end, but limit to reasonable number
        appSettings.quickAccessLibraries.push(libKey);
    }
    saveAppSettings();
    renderQuickAccessSettings();

    // Update quick access bar
    if (typeof renderQuickAccessBar === 'function') {
        renderQuickAccessBar();
    }
}

// Quick Access Drag & Drop
let qaDraggedKey = null;

function handleQADragStart(event, libKey) {
    qaDraggedKey = libKey;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
}

function handleQADragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleQADrop(event, targetKey) {
    event.preventDefault();
    if (!qaDraggedKey || qaDraggedKey === targetKey) return;

    const qa = appSettings.quickAccessLibraries;
    const dragIndex = qa.indexOf(qaDraggedKey);
    const targetIndex = qa.indexOf(targetKey);

    // Only reorder if both are in the quick access list
    if (dragIndex >= 0 && targetIndex >= 0) {
        qa.splice(dragIndex, 1);
        qa.splice(targetIndex, 0, qaDraggedKey);
        saveAppSettings();
        renderQuickAccessSettings();

        if (typeof renderQuickAccessBar === 'function') {
            renderQuickAccessBar();
        }
    }
}

function handleQADragEnd(event) {
    qaDraggedKey = null;
    document.querySelectorAll('.settings-qa-item.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
}

// Initialize settings on load
document.addEventListener('DOMContentLoaded', () => {
    loadCategoryLayouts();
    loadAppSettings();

    // Initialize quick access with first 4 libraries if empty
    if (appSettings.quickAccessLibraries.length === 0 && DATA.libraries) {
        appSettings.quickAccessLibraries = Object.keys(DATA.libraries).slice(0, 4);
        saveAppSettings();
    }

    // Apply saved theme
    if (appSettings.theme) {
        applyTheme(appSettings.theme);
    }
});

// ================= ANIMATION TRIGGERS =================

// Track library changes for category animations
let previousLibrary = null;

function triggerLibraryChangeAnimation() {
    if (previousLibrary !== DATA.currentLibrary) {
        previousLibrary = DATA.currentLibrary;
        // Trigger category animations after render
        requestAnimationFrame(() => {
            animateCategoriesIn();
        });
    }
}

// Override toggleSectionDisplay to animate links
const originalToggleSectionDisplay = typeof toggleSectionDisplay === 'function' ? toggleSectionDisplay : null;

function toggleSectionDisplay(catKey) {
    const wasOpen = openSections.has(catKey);

    if (wasOpen) {
        openSections.delete(catKey);
    } else {
        openSections.add(catKey);
    }

    render();

    // Animate links if opening
    if (!wasOpen) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                animateLinksIn(catKey);
            });
        });
    }
}
