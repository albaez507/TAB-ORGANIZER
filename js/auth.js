// ========================================
// AUTH
// Description: Authentication functions (Google, Email, Guest mode)
// Dependencies: config.js, data.js, storage.js, ui.js
// ========================================

async function initAuth() {
    _supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            currentUser = session.user;
            updateAuthUI(true);
            load();
        } else {
            currentUser = null;
            updateAuthUI(false);
        }
    });

    const { data: { session } } = await _supabase.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        updateAuthUI(true);
        load();
    } else {
        updateAuthUI(false);
        loadFromLocalStorage();
    }
}

function updateAuthUI(isLoggedIn) {
    const authBtn = document.getElementById('auth-btn');
    const userEmail = document.getElementById('user-email');
    const welcomeScreen = document.getElementById('welcome-screen');
    const avatarImg = document.getElementById('user-avatar-img');
    const avatarInitial = document.getElementById('user-avatar-initial');

    // Reset avatars
    avatarImg.classList.add('hidden');
    avatarInitial.classList.add('hidden');

    if (isLoggedIn && (currentUser || isGuest)) {
        authBtn.textContent = 'Logout';
        authBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        authBtn.classList.add('bg-red-600', 'hover:bg-red-500');

        if (isGuest) {
            // Guest: mostrar emoji
            userEmail.textContent = 'Invitado';
            avatarInitial.textContent = '👤';
            avatarInitial.classList.remove('hidden');
        } else if (currentUser) {
            userEmail.textContent = currentUser.email;

            // Verificar si es Google user con avatar
            const googleAvatar = currentUser.user_metadata?.avatar_url;
            if (googleAvatar) {
                avatarImg.src = googleAvatar;
                avatarImg.classList.remove('hidden');
            } else {
                // Email user: mostrar inicial
                const initial = currentUser.email.charAt(0).toUpperCase();
                avatarInitial.textContent = initial;
                avatarInitial.classList.remove('hidden');
            }
        }
        userEmail.classList.remove('hidden');
        welcomeScreen.classList.remove('modal-active');
        welcomeScreen.classList.add('hidden');
    } else {
        authBtn.textContent = 'Login';
        authBtn.classList.remove('bg-red-600', 'hover:bg-red-500');
        authBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
        userEmail.classList.add('hidden');
        welcomeScreen.classList.add('modal-active');
        welcomeScreen.classList.remove('hidden');
    }
}

async function loginWithGoogle() {
    const { error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) {
        console.error('Error de login:', error);
        alert('Error al iniciar sesion: ' + error.message);
    }
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}

async function signUpWithEmail() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        showAuthError('Por favor ingresa email y contrasena');
        return;
    }
    if (password.length < 6) {
        showAuthError('La contrasena debe tener al menos 6 caracteres');
        return;
    }

    const { data, error } = await _supabase.auth.signUp({ email, password });

    if (error) {
        console.error('Error signUp:', error);
        showAuthError(error.message);
    } else if (data.user && !data.session) {
        showAuthError('Revisa tu email para confirmar tu cuenta');
    }
}

async function signInWithEmail() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        showAuthError('Por favor ingresa email y contrasena');
        return;
    }

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error('Error signIn:', error);
        showAuthError(error.message);
    }
}

function enterGuestMode() {
    isGuest = true;
    currentUser = null;
    updateAuthUI(true);
    loadFromLocalStorage();
    document.getElementById('cloud-status').innerText = "👤 Modo Invitado";
    document.getElementById('cloud-status').style.color = "#fbbf24";
}

async function logout() {
    if (!isGuest) {
        const { error } = await _supabase.auth.signOut();
        if (error) console.error('Error de logout:', error);
    }
    isGuest = false;
    currentUser = null;
    DATA = { libraries: {}, currentLibrary: null };

    // Limpiar localStorage completamente para evitar datos residuales
    localStorage.clear();

    // Recargar pagina para estado limpio
    location.reload();
}

async function handleAuth() {
    if (currentUser || isGuest) {
        logout();
    } else {
        document.getElementById('welcome-screen').classList.add('modal-active');
        document.getElementById('welcome-screen').classList.remove('hidden');
    }
}
