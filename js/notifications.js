// ========================================
// NOTIFICATIONS
// Description: Notification bell, realtime subscription, notification panel
// Dependencies: config.js, data.js, auth.js, sharing.js, ui.js
// ========================================

let notificationSubscription = null;
let pendingShares = [];
let notificationPanelOpen = false;

// ===== INITIALIZATION & CLEANUP =====

async function initNotifications() {
    if (!currentUser || isGuest) return;

    await fetchPendingShares();
    subscribeToNotifications();
    updateNotificationBellVisibility();
}

function cleanupNotifications() {
    if (notificationSubscription) {
        _supabase.removeChannel(notificationSubscription);
        notificationSubscription = null;
    }
    pendingShares = [];
    notificationPanelOpen = false;
    updateNotificationBadge();
    updateNotificationBellVisibility();
}

// ===== SUPABASE REALTIME =====

function subscribeToNotifications() {
    if (!currentUser || isGuest) return;

    // Clean up any existing subscription first
    if (notificationSubscription) {
        _supabase.removeChannel(notificationSubscription);
    }

    notificationSubscription = _supabase
        .channel('shared-libraries-notifications')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'shared_libraries',
            filter: `recipient_email=eq.${currentUser.email.toLowerCase()}`
        }, (payload) => {
            handleNotificationChange(payload);
        })
        .subscribe();
}

function handleNotificationChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === 'INSERT') {
        if (newRow && newRow.status === 'sent') {
            pendingShares.unshift(newRow);
        }
    } else if (eventType === 'UPDATE') {
        if (newRow && newRow.status !== 'sent') {
            // Removed from sent (declined, accepted, etc.)
            pendingShares = pendingShares.filter(s => s.id !== newRow.id);
        } else if (newRow && newRow.status === 'sent') {
            // Updated but still pending (e.g. seen_at changed)
            const idx = pendingShares.findIndex(s => s.id === newRow.id);
            if (idx >= 0) {
                pendingShares[idx] = newRow;
            } else {
                pendingShares.unshift(newRow);
            }
        }
    } else if (eventType === 'DELETE') {
        const id = oldRow?.id || newRow?.id;
        if (id) {
            pendingShares = pendingShares.filter(s => s.id !== id);
        }
    }

    updateNotificationBadge();
    if (notificationPanelOpen) {
        renderNotificationList();
    }
}

// ===== DATA FETCHING =====

async function fetchPendingShares() {
    if (!currentUser || isGuest) return;

    try {
        const { data, error } = await _supabase
            .from('shared_libraries')
            .select('id, sender_email, library_name, library_icon, library_data, created_at, seen_at, status')
            .eq('recipient_email', currentUser.email)
            .eq('status', 'sent')
            .order('created_at', { ascending: false });

        if (error) throw error;
        pendingShares = data || [];
    } catch (err) {
        console.error('Error fetching pending shares:', err);
        // Keep existing cached pendingShares on error
    }

    updateNotificationBadge();
}

// ===== BADGE =====

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    const count = pendingShares.length;

    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ===== BELL VISIBILITY =====

function updateNotificationBellVisibility() {
    const wrapper = document.getElementById('notification-bell-wrapper');
    if (!wrapper) return;

    if (currentUser && !isGuest) {
        wrapper.classList.remove('hidden');
        wrapper.classList.add('flex');
    } else {
        wrapper.classList.add('hidden');
        wrapper.classList.remove('flex');
    }
}

// ===== NOTIFICATION PANEL =====

function toggleNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    if (!panel) return;

    notificationPanelOpen = !notificationPanelOpen;

    if (notificationPanelOpen) {
        panel.classList.add('open');
        renderNotificationList();
        // Refresh data from server
        fetchPendingShares().then(() => {
            if (notificationPanelOpen) renderNotificationList();
        });
    } else {
        panel.classList.remove('open');
    }
}

function closeNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    if (panel) panel.classList.remove('open');
    notificationPanelOpen = false;
}

function renderNotificationList() {
    const container = document.getElementById('notification-list');
    const countEl = document.getElementById('notification-panel-count');
    if (!container) return;

    if (countEl) {
        countEl.textContent = pendingShares.length === 1
            ? '1 pendiente'
            : `${pendingShares.length} pendientes`;
    }

    if (pendingShares.length === 0) {
        container.innerHTML = '<p class="notification-empty text-sm text-center">No hay notificaciones</p>';
        return;
    }

    container.innerHTML = pendingShares.map(share => {
        const icon = share.library_icon || '📁';
        const name = escapeHtml(share.library_name || 'Sin nombre');
        const sender = escapeHtml(share.sender_email || 'Desconocido');
        const ago = timeAgo(share.created_at);
        const message = share.library_data?.message;

        return `
            <div class="notification-item">
                <div class="flex items-center gap-3">
                    <span class="text-xl flex-shrink-0">${icon}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-white text-sm font-medium truncate">${name}</p>
                        <p class="text-slate-400 text-xs truncate">De: ${sender}</p>
                        ${message ? `<p class="text-slate-500 text-xs mt-1 italic truncate">"${escapeHtml(message)}"</p>` : ''}
                        <p class="text-slate-500 text-[10px] mt-0.5">${ago}</p>
                    </div>
                </div>
                <div class="flex gap-2 mt-2">
                    <button onclick="viewSharedLibrary('${share.id}')" class="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition">Ver</button>
                    <button onclick="dismissSharedLibrary('${share.id}')" class="flex-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition">Descartar</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== ACTIONS =====

async function viewSharedLibrary(shareId) {
    if (typeof openSharePreview === 'function') {
        openSharePreview(shareId);
    }
}

async function dismissSharedLibrary(shareId) {
    try {
        await _supabase
            .from('shared_libraries')
            .update({ status: 'declined' })
            .eq('id', shareId);

        // Remove from local state
        pendingShares = pendingShares.filter(s => s.id !== shareId);
        updateNotificationBadge();

        if (notificationPanelOpen) renderNotificationList();
        showToast('Notificacion descartada');
    } catch (err) {
        console.error('Error dismissing share:', err);
        showToast('Error al descartar', true);
    }
}

// ===== HELPERS =====

function timeAgo(dateString) {
    if (!dateString) return '';

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    if (diffDay === 1) return 'Ayer';
    if (diffDay < 7) return `Hace ${diffDay} dias`;
    if (diffDay < 30) return `Hace ${Math.floor(diffDay / 7)} semanas`;
    return date.toLocaleDateString();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== CLICK-OUTSIDE HANDLER =====

document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('notification-bell-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        closeNotificationPanel();
    }
});
