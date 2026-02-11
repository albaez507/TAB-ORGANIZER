// ========================================
// SHARING
// Description: Share library snapshots with other users via Supabase
// Dependencies: config.js, data.js, libraries.js, auth.js, ui.js
// ========================================

function updateShareButtonVisibility() {
    const btn = document.getElementById('share-library-btn');
    if (!btn) return;
    if (currentUser && !isGuest) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
    } else {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
    }
}

function openShareModal() {
    const lib = getCurrentLibrary();
    if (!lib) return;
    document.getElementById('share-modal-title').textContent = `Compartir "${lib.name}"`;
    document.getElementById('share-email').value = '';
    document.getElementById('share-error').classList.add('hidden');
    document.getElementById('share-error').textContent = '';
    document.getElementById('share-modal').classList.remove('hidden');
}

function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
}

function showShareError(msg) {
    const el = document.getElementById('share-error');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function detectLinkType(url) {
    if (!url) return 'other';
    const u = url.toLowerCase();
    if (u.includes('youtube.com/watch') || u.includes('youtu.be/') || u.includes('vimeo.com/')) return 'video';
    if (u.includes('github.com/') || u.includes('gitlab.com/') || u.includes('bitbucket.org/')) return 'repository';
    if (u.includes('medium.com/') || u.includes('dev.to/') || u.includes('blog') || u.includes('article')) return 'article';
    if (u.includes('docs.') || u.includes('documentation') || u.includes('wiki') || u.includes('reference')) return 'reference';
    return 'other';
}

function buildLibrarySnapshot() {
    const lib = getCurrentLibrary();
    if (!lib) return null;

    const categories = [];
    let catPos = 0;

    Object.keys(lib.categories || {}).forEach(catKey => {
        const cat = lib.categories[catKey];
        const links = (cat.links || []).map((link, idx) => ({
            title: link.title || '',
            url: link.url || '',
            thumbnail: link.thumbnail || '',
            link_type: detectLinkType(link.url),
            notes: link.notes || '',
            position: idx
        }));

        categories.push({
            name: cat.name || '',
            position: catPos++,
            notes: cat.notes || '',
            links
        });
    });

    return { categories };
}

async function sendSharedLibrary() {
    const emailInput = document.getElementById('share-email');
    const email = emailInput.value.trim().toLowerCase();

    // Validate email
    if (!email) {
        showShareError('Ingresa un email.');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showShareError('Email no valido.');
        return;
    }

    // Prevent self-sharing
    if (currentUser && currentUser.email && email === currentUser.email.toLowerCase()) {
        showShareError('No puedes compartir contigo mismo.');
        return;
    }

    const lib = getCurrentLibrary();
    if (!lib) {
        showShareError('No hay libreria seleccionada.');
        return;
    }

    const snapshot = buildLibrarySnapshot();
    if (!snapshot) {
        showShareError('Error al construir los datos.');
        return;
    }

    try {
        const { error } = await _supabase.from('shared_libraries').insert({
            sender_id: currentUser.id,
            sender_email: currentUser.email,
            recipient_email: email,
            library_name: lib.name,
            library_icon: lib.icon || '📁',
            library_data: snapshot,
            status: 'pending'
        });

        if (error) throw error;

        closeShareModal();
        showToast(`Libreria compartida con ${email}`);
    } catch (err) {
        console.error('Share error:', err);
        showShareError('Error al compartir. Intenta de nuevo.');
    }
}
