// ── Supabase authentication ──────────────────────────────────────────────────

const AuthModule = (() => {
    const SUPABASE_URL = 'https://vlukdlfzhprxqsbiwbcu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdWtkbGZ6aHByeHFzYml3YmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNzg0NjIsImV4cCI6MjEwNzk1NDQ2Mn0.DcmTARDMpVl5gxNePwoKV3VC2iOo1aYLulnxCMrNH5s';
    let mode = 'login';
    let supabaseClient;

    function setAuthMessage(message, success = false) {
        const messageEl = document.getElementById('auth-message');
        if (!messageEl) return;
        messageEl.textContent = message;
        messageEl.classList.toggle('success', success);
    }

    function setMode(nextMode) {
        mode = nextMode;
        const registering = mode === 'register';
        document.getElementById('auth-form').hidden = false;
        document.getElementById('auth-description').textContent = registering
            ? 'A fresh start, built around the goals that matter to you.'
            : 'Pick up where you left off. Your next win is waiting.';
        document.getElementById('name-field').hidden = !registering;
        document.getElementById('confirm-field').hidden = !registering;
        document.getElementById('login-options').hidden = registering;
        document.getElementById('terms-option').hidden = !registering;
        document.getElementById('password-hint').hidden = !registering;
        document.getElementById('login-tab').classList.toggle('active', !registering);
        document.getElementById('register-tab').classList.toggle('active', registering);
        document.getElementById('login-tab').setAttribute('aria-selected', String(!registering));
        document.getElementById('register-tab').setAttribute('aria-selected', String(registering));
        document.getElementById('login-tab').tabIndex = registering ? -1 : 0;
        document.getElementById('register-tab').tabIndex = registering ? 0 : -1;
        document.getElementById('auth-form').setAttribute('aria-labelledby', registering ? 'register-tab' : 'login-tab');
        document.getElementById('auth-eyebrow').textContent = registering ? 'START YOUR JOURNEY' : 'WELCOME BACK';
        const title = document.getElementById('auth-title');
        title.replaceChildren(
            document.createTextNode(registering ? 'Create your' : 'Sign in to your'),
            document.createElement('br'),
            document.createTextNode(registering ? 'fitness account' : 'fitness journey'),
        );
        document.getElementById('submit-label').textContent = registering ? 'Create my account' : 'Sign in';
        const switchCopy = document.getElementById('auth-switch-copy');
        const switchButton = document.createElement('button');
        switchButton.type = 'button';
        switchButton.dataset.switch = registering ? 'login' : 'register';
        switchButton.textContent = registering ? 'Sign in' : 'Create an account';
        switchCopy.replaceChildren(
            document.createTextNode(registering ? 'Already have an account? ' : 'New to APEX? '),
            switchButton,
        );
        document.getElementById('auth-password').autocomplete = registering ? 'new-password' : 'current-password';
        document.getElementById('accept-terms').required = registering;
        setAuthMessage('');
    }

    function showApp(account) {
        const app = document.getElementById('app-layout');
        const auth = document.getElementById('auth-screen');
        const accountName = account?.user_metadata?.display_name;
        if (accountName && typeof Storage !== 'undefined') {
            const profile = Storage.getProfile();
            if (!profile.name || profile.name === 'Athlete') Storage.saveProfile({ ...profile, name: accountName });
            if (typeof refreshProfile === 'function') refreshProfile();
        }
        auth.hidden = true;
        app.hidden = false;
        document.body.classList.remove('auth-active');
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof loadProfilePhoto === 'function') loadProfilePhoto();
    }

    function showAuth() {
        document.getElementById('app-layout').hidden = true;
        document.getElementById('auth-screen').hidden = false;
        document.body.classList.add('auth-active');
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        document.getElementById('auth-confirm').value = '';
        setMode('login');
        document.getElementById('auth-email').focus();
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setAuthMessage('');

        const submitButton = document.getElementById('auth-submit');
        const email = document.getElementById('auth-email').value.trim().toLowerCase();
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name').value.trim();

        if (!email || !document.getElementById('auth-email').validity.valid) {
            setAuthMessage('Enter a valid email address.');
            document.getElementById('auth-email').focus();
            return;
        }
        if (password.length < 8 || password.length > 128) {
            setAuthMessage('Your password must be between 8 and 128 characters.');
            document.getElementById('auth-password').focus();
            return;
        }

        const registering = mode === 'register';
        if (registering) {
            if (name.length < 2 || name.length > 60) {
                setAuthMessage('Please enter a name between 2 and 60 characters.');
                document.getElementById('auth-name').focus();
                return;
            }
            if (password !== document.getElementById('auth-confirm').value) {
                setAuthMessage('Those passwords do not match.');
                document.getElementById('auth-confirm').focus();
                return;
            }
            if (!document.getElementById('accept-terms').checked) {
                setAuthMessage('Please confirm how profile photos and fitness data are stored.');
                return;
            }
        }

        submitButton.disabled = true;
        document.getElementById('submit-label').textContent = registering ? 'Creating account…' : 'Signing in…';
        setAuthMessage(registering ? 'Sending your registration to Supabase…' : 'Signing in securely…');
        const waitingTimer = window.setTimeout(() => {
            setAuthMessage('Supabase is taking longer than expected. Please wait; this request is still in progress.');
        }, 10000);
        try {
            if (registering) {
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { display_name: name },
                        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
                    },
                });
                if (error) throw error;
                if (data.session) {
                    showToast('Your APEX account was created successfully.', 'success');
                    showApp(data.user);
                } else {
                    setAuthMessage('Registration request completed. Check your inbox and spam folder for a confirmation email. If it does not arrive, verify Supabase email delivery settings.', true);
                }
            } else {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showApp(data.user);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setAuthMessage(`Could not ${registering ? 'create your account' : 'sign in'}: ${message || 'Please try again.'}`);
        } finally {
            window.clearTimeout(waitingTimer);
            submitButton.disabled = false;
            document.getElementById('submit-label').textContent = mode === 'register' ? 'Create my account' : 'Sign in';
        }
    }

    async function init() {
        const form = document.getElementById('auth-form');
        if (!form) return;
        localStorage.removeItem('prism_demo_account');
        localStorage.removeItem('prism_demo_session');
        sessionStorage.removeItem('prism_demo_session');
        if (!window.supabase?.createClient) {
            document.getElementById('auth-screen').hidden = false;
            document.body.classList.add('auth-active');
            setAuthMessage('The authentication service could not be loaded. Check your internet connection and reload.');
            return;
        }

        const authStorage = {
            async getItem(key) {
                return localStorage.getItem(key) ?? sessionStorage.getItem(key);
            },
            async setItem(key, value) {
                const target = document.getElementById('remember-me').checked ? localStorage : sessionStorage;
                const other = target === localStorage ? sessionStorage : localStorage;
                other.removeItem(key);
                target.setItem(key, value);
            },
            async removeItem(key) {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            },
        };
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });

        document.getElementById('login-tab').addEventListener('click', () => setMode('login'));
        document.getElementById('register-tab').addEventListener('click', () => setMode('register'));
        document.querySelector('.auth-tabs')?.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const registering = mode === 'register';
            const nextMode = event.key === 'Home' ? 'login'
                : event.key === 'End' ? 'register'
                    : event.key === 'ArrowRight' ? (registering ? 'login' : 'register')
                        : (registering ? 'login' : 'register');
            setMode(nextMode);
            document.getElementById(nextMode === 'register' ? 'register-tab' : 'login-tab').focus();
        });
        document.getElementById('auth-switch-copy').addEventListener('click', event => {
            const switchButton = event.target.closest('[data-switch]');
            if (switchButton) setMode(switchButton.dataset.switch);
        });
        document.getElementById('password-toggle').addEventListener('click', event => {
            const passwordInput = document.getElementById('auth-password');
            const showPassword = passwordInput.type === 'password';
            passwordInput.type = showPassword ? 'text' : 'password';
            event.currentTarget.textContent = showPassword ? 'Hide' : 'Show';
            event.currentTarget.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
        });
        document.getElementById('sign-out-btn').addEventListener('click', async () => {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                showToast(`Could not sign out: ${error.message}`, 'error');
                return;
            }
            showAuth();
        });
        form.addEventListener('submit', handleSubmit);

        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session?.user) showApp(session.user);
            else if (event === 'SIGNED_OUT') showAuth();
        });
        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            if (data.session?.user) showApp(data.session.user);
            else {
                document.getElementById('app-layout').hidden = true;
                document.getElementById('auth-screen').hidden = false;
                document.body.classList.add('auth-active');
            }
        } catch (error) {
            document.getElementById('app-layout').hidden = true;
            document.getElementById('auth-screen').hidden = false;
            document.body.classList.add('auth-active');
            setAuthMessage(`Could not check your sign-in session: ${error.message}`);
        }
    }

    async function getCurrentUser() {
        if (!supabaseClient) throw new Error('The authentication service is not initialized.');
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) throw error;
        if (!data.user) throw new Error('Sign in to save a profile photo to your account.');
        return data.user;
    }

    async function uploadProfilePhoto(file) {
        const user = await getCurrentUser();
        const path = `${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabaseClient.storage
            .from('profile-photos')
            .upload(path, file, { cacheControl: '0', contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;

        const avatarPath = `profile-photos/${path}`;
        const { data: updatedUser, error: updateError } = await supabaseClient.auth.updateUser({
            data: { avatar_path: avatarPath },
        });
        if (updateError) throw updateError;

        const { data, error } = await supabaseClient.storage
            .from('profile-photos')
            .createSignedUrl(path, 60 * 60);
        if (error) throw error;
        return {
            path: avatarPath,
            userId: updatedUser.user.id,
            url: `${data.signedUrl}&v=${Date.now()}`,
        };
    }

    async function getProfilePhotoUrl() {
        const user = await getCurrentUser();
        const path = user.user_metadata?.avatar_path;
        if (!path) return null;
        const objectPath = `${user.id}/avatar.jpg`;
        if (path !== `profile-photos/${objectPath}`) {
            throw new Error('The saved profile photo path is invalid for this account.');
        }
        const { data, error } = await supabaseClient.storage
            .from('profile-photos')
            .createSignedUrl(objectPath, 60 * 60);
        if (error) throw error;
        return `${data.signedUrl}&v=${Date.now()}`;
    }

    document.addEventListener('DOMContentLoaded', init);
    return { showAuth, getCurrentUser, uploadProfilePhoto, getProfilePhotoUrl };
})();
