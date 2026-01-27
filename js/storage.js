// ========================================
// STORAGE
// Description: Save/Load functions for localStorage and Supabase cloud
// Dependencies: config.js, data.js, ui.js
// ========================================

function loadFromLocalStorage() {
    const s = localStorage.getItem('tabOrganizer');
    if (s) {
        try {
            const parsed = JSON.parse(s);
            DATA = migrateOldData(parsed);
            ensureDataStructure();

            // Show migration notification if data was migrated
            if (!parsed.libraries && Object.keys(parsed).length > 0) {
                setTimeout(() => showToast('Categorias migradas a libreria "General"'), 500);
            }

            render();
        } catch(e) {
            console.error('Error loading local data:', e);
        }
    }
}

async function save(){
    ensureDataStructure();
    localStorage.setItem('tabOrganizer', JSON.stringify(DATA));

    const status = document.getElementById('cloud-status');

    if (isGuest) {
        status.innerText = "👤 Modo Invitado";
        status.style.color = "#fbbf24";
        return;
    }

    if (!currentUser) {
        status.innerText = "💾 Local";
        status.style.color = "#fbbf24";
        return;
    }

    status.innerText = "☁️ Guardando...";
    status.style.color = "#60a5fa";

    try {
        const { data: existing, error: selectError } = await _supabase
            .from('tab_organizer')
            .select('id')
            .eq('user_id', currentUser.id)
            .limit(1)
            .maybeSingle();

        if (selectError) {
            console.error('Error checking existing data:', selectError);
            status.innerText = "❌ Error Nube";
            status.style.color = "#ef4444";
            return;
        }

        let saveError;

        if (existing) {
            const { error } = await _supabase
                .from('tab_organizer')
                .update({
                    url: 'backup',
                    title: 'FullData',
                    category: JSON.stringify(DATA),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            saveError = error;
        } else {
            const { error } = await _supabase
                .from('tab_organizer')
                .insert({
                    user_id: currentUser.id,
                    url: 'backup',
                    title: 'FullData',
                    category: JSON.stringify(DATA)
                });
            saveError = error;
        }

        status.innerText = saveError ? "❌ Error Nube" : "✅ Sincronizado";
        status.style.color = saveError ? "#ef4444" : "#4ade80";
        if (saveError) console.error('Error saving:', saveError);
    } catch (e) {
        console.error('Save exception:', e);
        status.innerText = "❌ Error Nube";
        status.style.color = "#ef4444";
    }
}

async function load(){
    loadFromLocalStorage();

    if (isGuest) {
        document.getElementById('cloud-status').innerText = "👤 Modo Invitado";
        document.getElementById('cloud-status').style.color = "#fbbf24";
        return;
    }

    if (!currentUser) {
        document.getElementById('cloud-status').innerText = "💾 Modo Local";
        return;
    }

    const { data, error } = await _supabase
        .from('tab_organizer')
        .select('category')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (data?.category) {
        const parsed = JSON.parse(data.category);
        DATA = migrateOldData(parsed);
        ensureDataStructure();
        localStorage.setItem('tabOrganizer', JSON.stringify(DATA));
        render();
        document.getElementById('cloud-status').innerText = "✅ Datos Nube";
    } else if (!error) {
        document.getElementById('cloud-status').innerText = "🆕 Usuario Nuevo";
    }
}
