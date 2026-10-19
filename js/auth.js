// ── Local demo authentication ────────────────────────────────────────────────

const AuthModule = (() => {
    const ACCOUNT_KEY = 'prism_demo_account';
    const SESSION_KEY = 'prism_demo_session';
    const PBKDF2_ITERATIONS = 120000;
    let mode = 'login';

    function bytesToBase64(bytes) {
        return btoa(String.fromCharCode(...new Uint8Array(bytes)));
    }

    function base64ToBytes(value) {
        return Uint8Array.from(atob(value), character => character.charCodeAt(0));
    }

    async function hashPassword(password, salt) {
        if (!window.crypto?.subtle || !window.crypto?.getRandomValues) {
            throw new Error('Secure password hashing is unavailable. Open this page on localhost or HTTPS.');
        }
        const saltBytes = salt ? base64ToBytes(salt) : window.crypto.getRandomValues(new Uint8Array(16));
        const key = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await window.crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, key, 256);
        return { salt: bytesToBase64(saltBytes), hash: bytesToBase64(bits) };
    }

    function getSavedSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null');
        } catch {
            return null;
        }
    }

    function getSavedAccount() {
        try {
            const account = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
            if (!account || typeof account.email !== 'string' || typeof account.salt !== 'string' || typeof account.hash !== 'string') return null;
            return account;
        } catch {
            return null;
        }
    }

    function setSession(email, remember) {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify({ email }));
    }

    function setAuthMessage(message, success = false) {
        const messageEl = document.getElementById('auth-message');
        if (!messageEl) return;
        messageEl.textContent = message;
        messageEl.classList.toggle('success', success);
    }

    function setMode(nextMode) {
        mode = nextMode;
        const registering = mode === 'register';
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
        document.getElementById('auth-description').textContent = registering
            ? 'A fresh start, built around the goals that matter to you.'
            : 'Pick up where you left off. Your next win is waiting.';
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
        setAuthMessage('');
    }

    function showApp(account) {
        const app = document.getElementById('app-layout');
        const auth = document.getElementById('auth-screen');
        if (account?.name && typeof Storage !== 'undefined') {
            const profile = Storage.getProfile();
            if (!profile.name || profile.name === 'Athlete') Storage.saveProfile({ ...profile, name: account.name });
            if (typeof refreshProfile === 'function') refreshProfile();
        }
        auth.hidden = true;
        app.hidden = false;
        document.body.classList.remove('auth-active');
        if (typeof updateDashboard === 'function') updateDashboard();
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
                setAuthMessage('Please accept the local demo terms to continue.');
                return;
            }
            if (getSavedAccount()) {
                setAuthMessage('An account already exists in this browser. Sign in instead.');
                setMode('login');
                return;
            }
        }

        submitButton.disabled = true;
        document.getElementById('submit-label').textContent = registering ? 'Creating account…' : 'Signing in…';
        try {
            const account = getSavedAccount();
            let signedInAccount;

            if (registering) {
                const credentials = await hashPassword(password);
                signedInAccount = { email, name, ...credentials };
                localStorage.setItem(ACCOUNT_KEY, JSON.stringify(signedInAccount));
            } else {
                if (!account || account.email !== email) {
                    setAuthMessage('No matching account found. Check your details or create an account.');
                    return;
                }
                const credentials = await hashPassword(password, account.salt);
                if (credentials.hash !== account.hash) {
                    setAuthMessage('That password does not match. Please try again.');
                    return;
                }
                signedInAccount = account;
            }

            setSession(email, document.getElementById('remember-me').checked);
            showApp(signedInAccount);
        } catch (error) {
            setAuthMessage(error.message || 'Could not complete sign-in. Please try again.');
        } finally {
            submitButton.disabled = false;
            document.getElementById('submit-label').textContent = mode === 'register' ? 'Create my account' : 'Sign in';
        }
    }

    function init() {
        const form = document.getElementById('auth-form');
        if (!form) return;

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
        document.getElementById('sign-out-btn').addEventListener('click', () => {
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);
            showAuth();
        });
        form.addEventListener('submit', handleSubmit);

        const account = getSavedAccount();
        const savedSession = getSavedSession();
        if (account && savedSession?.email === account.email) showApp(account);
        else {
            document.getElementById('app-layout').hidden = true;
            document.getElementById('auth-screen').hidden = false;
            document.body.classList.add('auth-active');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
    return { showAuth };
})();
