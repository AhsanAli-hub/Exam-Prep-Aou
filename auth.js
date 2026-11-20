const SUPABASE_URL = 'https://sdqhrxybowzyxveqwkwo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UBviShU8w5kEtL0sGkIh6w_Ay8_lnaj';
const ADMIN_EMAIL = 'ahsan.ali72@outlook.com';
const CHECKOUT_URL = 'https://your-store.lemonsqueezy.com/buy/your-product-id';

window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.currentUser = null;
window.isProUser = false;
let authMode = 'signin';

/* ====================== PERSISTENT DEVICE ID ====================== */
function getDeviceId() {
    let id = localStorage.getItem('exam_prep_device_id');
    if (!id) {
        id = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('exam_prep_device_id', id);
    }
    return id;
}

/* ====================== INJECT AUTH MODAL & STYLES ====================== */
function injectAuthUI() {
    if (document.getElementById('auth-modal')) return;

    const style = document.createElement('style');
    style.textContent = `
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.58); display: none; align-items: center; justify-content: center; padding: 20px; z-index: 1000; }
        .modal-backdrop.open { display: flex; }
        .modal-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 20px; padding: 28px; width: 100%; max-width: 410px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); }
        .modal-card h3 { margin: 0 0 6px 0; color: var(--purple); font-size: 1.35rem; font-weight: 800; }
        .modal-card p { margin: 0 0 18px 0; color: var(--text-muted); font-size: 0.88rem; line-height: 1.45; }
        .modal-input { width: 100%; padding: 12px 14px; margin-bottom: 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text-main); font-family: inherit; font-size: 0.95rem; }
        .modal-input:focus { outline: none; border-color: var(--purple); }
        .password-wrap { position: relative; margin-bottom: 12px; }
        .password-wrap .modal-input { margin-bottom: 0; padding-right: 44px; }
        .password-wrap input::-ms-reveal, .password-wrap input::-ms-clear { display: none; }
        .password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-muted); padding: 4px; display: flex; align-items: center; justify-content: center; }
        .password-toggle:hover { color: var(--purple); }
        .modal-submit { width: 100%; padding: 13px; background: var(--purple); color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; font-family: inherit; margin-top: 4px; }
        .modal-submit:hover { background: var(--purple-hover); }
        .modal-cancel { width: 100%; padding: 10px; background: transparent; color: var(--text-muted); border: 1.5px solid var(--border); border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: inherit; margin-top: 10px; }
        .modal-switch { margin-top: 14px; text-align: center; font-size: 0.85rem; color: var(--text-muted); }
        .modal-switch a { color: var(--purple); font-weight: 700; cursor: pointer; text-decoration: none; }
        .modal-msg { font-size: 0.85rem; margin-top: 10px; font-weight: 600; text-align: center; line-height: 1.4; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal-backdrop" id="auth-modal">
            <div class="modal-card">
                <h3 id="modal-title">Student Sign In</h3>
                <p id="modal-subtitle">Log in to access your Pro question bank.</p>
                
                <div id="signup-extra-top" style="display: none;">
                    <input type="text" id="auth-student-id" class="modal-input" placeholder="University Student ID (e.g. 24123456)" maxlength="20">
                </div>

                <input type="email" id="auth-email" class="modal-input" placeholder="Email address">

                <div class="password-wrap">
                    <input type="password" id="auth-password" class="modal-input" placeholder="Password (min 6 characters)">
                    <button type="button" class="password-toggle" onclick="togglePwdField('auth-password', this)" aria-label="Toggle password">👁️</button>
                </div>

                <div class="password-wrap" id="confirm-pwd-wrap" style="display: none;">
                    <input type="password" id="auth-confirm-password" class="modal-input" placeholder="Confirm password">
                    <button type="button" class="password-toggle" onclick="togglePwdField('auth-confirm-password', this)" aria-label="Toggle confirm password">👁️</button>
                </div>

                <button class="modal-submit" id="auth-submit-btn" onclick="submitAuth()">Sign In</button>
                <div class="modal-msg" id="auth-msg"></div>

                <div class="modal-switch">
                    <span id="modal-switch-text">Don't have an account?</span>
                    <a id="modal-switch-link" onclick="toggleAuthMode()">Create one</a>
                </div>
                <button class="modal-cancel" onclick="closeAuthModal()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper.firstElementChild);
}

window.togglePwdField = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    btn.textContent = hidden ? '🙈' : '👁️';
};

window.openAuthModal = function(mode = 'signin', customMessage = '') {
    injectAuthUI();
    authMode = mode;
    updateAuthModalUI();
    const msgEl = document.getElementById('auth-msg');
    msgEl.style.color = customMessage ? 'var(--error)' : 'var(--text-muted)';
    msgEl.textContent = customMessage;
    document.getElementById('auth-modal').classList.add('open');
};

window.closeAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
};

window.toggleAuthMode = function() {
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    document.getElementById('auth-msg').textContent = '';
    updateAuthModalUI();
};

function updateAuthModalUI() {
    const isSignIn = authMode === 'signin';
    document.getElementById('modal-title').textContent = isSignIn ? 'Student Sign In' : 'Create Student Account';
    document.getElementById('modal-subtitle').textContent = isSignIn
        ? 'Log in to access your Pro question bank (Max 2 devices).'
        : 'Enter your University Student ID and email. Accounts are limited to 2 devices.';
    document.getElementById('signup-extra-top').style.display = isSignIn ? 'none' : 'block';
    document.getElementById('confirm-pwd-wrap').style.display = isSignIn ? 'none' : 'block';
    document.getElementById('auth-submit-btn').textContent = isSignIn ? 'Sign In' : 'Create Account';
    document.getElementById('modal-switch-text').textContent = isSignIn ? "Don't have an account?" : "Already have an account?";
    document.getElementById('modal-switch-link').textContent = isSignIn ? 'Create one' : 'Sign in';
}

window.submitAuth = async function() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const msgEl = document.getElementById('auth-msg');

    if (!email || !password) {
        msgEl.style.color = 'var(--error)';
        msgEl.textContent = 'Please enter your email and password.';
        return;
    }

    if (authMode === 'signup') {
        const studentId = document.getElementById('auth-student-id').value.trim();
        const confirmPwd = document.getElementById('auth-confirm-password').value;

        if (!/^[a-zA-Z0-9-]{5,20}$/.test(studentId)) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Please enter a valid University Student ID (5–20 letters/numbers).';
            return;
        }
        if (password.length < 6) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Password must be at least 6 characters.';
            return;
        }
        if (password !== confirmPwd) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Passwords do not match.';
            return;
        }

        msgEl.style.color = 'var(--text-muted)';
        msgEl.textContent = 'Creating account...';

        const { error } = await window.db.auth.signUp({
            email,
            password,
            options: { data: { student_id: studentId } }
        });

        if (error) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = error.message;
            return;
        }
    } else {
        msgEl.style.color = 'var(--text-muted)';
        msgEl.textContent = 'Signing in...';

        const { error } = await window.db.auth.signInWithPassword({ email, password });
        if (error) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = error.message;
            return;
        }
    }

    // Clear cached questions on login change so Pro questions load immediately
    Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('qcache_')) sessionStorage.removeItem(k);
    });

    msgEl.style.color = 'var(--success)';
    msgEl.textContent = 'Success! Loading...';
    setTimeout(() => location.reload(), 500);
};

window.handleAuthHeaderClick = function() {
    if (window.currentUser) {
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('qcache_')) sessionStorage.removeItem(k);
        });
        window.db.auth.signOut().then(() => location.reload());
    } else {
        openAuthModal('signin');
    }
};

window.handleUpgradeClick = function() {
    if (!window.currentUser) {
        openAuthModal('signup');
        return;
    }
    window.open(`${CHECKOUT_URL}?checkout[email]=${encodeURIComponent(window.currentUser.email)}`, '_blank');
};

/* ====================== INIT SESSION & DEVICE CHECK ====================== */
window.initAuth = async function() {
    injectAuthUI();
    const { data: { session } } = await window.db.auth.getSession();
    window.currentUser = session?.user || null;
    window.isProUser = false;

    const authBtn = document.getElementById('auth-header-btn');
    const emailEl = document.getElementById('user-email');
    const proBadge = document.getElementById('pro-badge');
    const proBanner = document.getElementById('pro-banner');
    const proCtaBtn = document.getElementById('pro-cta-btn');
    const adminBtn = document.getElementById('admin-link-btn');

    if (window.currentUser) {
        // Enforce 2-device limit
        const { data: devCheck, error: devErr } = await window.db.rpc('register_device', {
            p_device_id: getDeviceId()
        });

        if (!devErr && devCheck && devCheck.allowed === false && devCheck.reason === 'limit_reached') {
            await window.db.auth.signOut();
            window.currentUser = null;
            if (authBtn) authBtn.textContent = 'Sign In';
            if (proBanner) proBanner.style.display = 'flex';
            openAuthModal(
                'signin',
                `⛔ Device Limit Reached (Max ${devCheck.max} devices). This account is already active on 2 other devices. Contact admin if you switched devices.`
            );
            return { user: null, isPro: false, deviceBlocked: true };
        }

        if (authBtn) authBtn.textContent = 'Sign Out';

        const { data: profile } = await window.db
            .from('profiles')
            .select('is_pro, student_id')
            .eq('id', window.currentUser.id)
            .single();

        window.isProUser = Boolean(profile?.is_pro);

        if (emailEl) {
            emailEl.textContent = profile?.student_id
                ? `${window.currentUser.email} (${profile.student_id})`
                : window.currentUser.email;
        }
        if (proBadge) proBadge.style.display = window.isProUser ? 'inline-block' : 'none';
        if (proBanner) proBanner.style.display = window.isProUser ? 'none' : 'flex';
        if (proCtaBtn) proCtaBtn.textContent = 'Unlock Full Access ➔';
        if (adminBtn && window.currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            adminBtn.style.display = 'inline-block';
        }
    } else {
        if (authBtn) authBtn.textContent = 'Sign In';
        if (proBadge) proBadge.style.display = 'none';
        if (proBanner) proBanner.style.display = 'flex';
        if (proCtaBtn) proCtaBtn.textContent = 'Sign Up & Unlock ➔';
    }

    return { user: window.currentUser, isPro: window.isProUser, deviceBlocked: false };
};

/* ====================== CACHED QUESTION LOADER (SAVES COMPUTE) ====================== */
window.fetchCourseQuestions = async function(courseCode) {
    const cacheKey = `qcache_${courseCode}_${window.isProUser ? 'pro' : 'free'}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch (e) {}
    }

    const { data, error } = await window.db
        .from('questions')
        .select('id, topic, question_data')
        .eq('course_code', courseCode)
        .order('id', { ascending: true });

    if (error) throw error;
    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
    return data;
};
