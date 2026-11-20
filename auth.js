const SUPABASE_URL = 'https://sdqhrxybowzyxveqwkwo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UBviShU8w5kEtL0sGkIh6w_Ay8_lnaj';
const ADMIN_EMAIL = 'ahsan.ali72@outlook.com';

// Separate checkout links for each subject
const COURSE_CHECKOUT_URLS = {
    el112: 'https://your-store.lemonsqueezy.com/buy/el112-product-id',
    gr101el: 'https://your-store.lemonsqueezy.com/buy/gr101el-product-id',
    gt103: 'https://your-store.lemonsqueezy.com/buy/gt103-product-id',
    tu170: 'https://your-store.lemonsqueezy.com/buy/tu170-product-id',
    all: 'https://your-store.lemonsqueezy.com/buy/all-courses-bundle-id'
};

window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.currentUser = null;
window.unlockedCourses = [];
let authMode = 'signin';

window.hasCourseAccess = function(courseCode) {
    if (!courseCode) return window.unlockedCourses.length > 0;
    const code = courseCode.toLowerCase();
    return window.unlockedCourses.includes('all') || window.unlockedCourses.includes(code);
};

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

/* ====================== INJECT STYLES & AUTH MODAL ====================== */
function injectAuthUI() {
    if (!document.getElementById('shared-auth-styles')) {
        const style = document.createElement('style');
        style.id = 'shared-auth-styles';
        style.textContent = `
            /* Profile Avatar & Dropdown */
            .profile-menu-wrap { position: relative; display: inline-flex; align-items: center; }
            .profile-avatar-btn {
                width: 40px; height: 40px; border-radius: 50%;
                background: linear-gradient(135deg, var(--purple), #6d28d9);
                color: #fff; border: 2px solid transparent;
                font-weight: 800; font-size: 1rem; font-family: inherit;
                cursor: pointer; display: flex; align-items: center; justify-content: center;
                box-shadow: 0 2px 6px rgba(139, 92, 246, 0.35);
            }
            .profile-avatar-btn.has-pro { border-color: #f59e0b; }
            .profile-avatar-btn:hover { transform: scale(1.05); }
            .profile-dropdown {
                position: absolute; right: 0; top: 50px; width: 270px;
                background: var(--card-bg); border: 1px solid var(--border);
                border-radius: 16px; padding: 16px; z-index: 999;
                box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
                display: none; flex-direction: column; gap: 12px; text-align: left;
            }
            .profile-dropdown.open { display: flex; }
            .pd-header { border-bottom: 1px solid var(--border); padding-bottom: 10px; }
            .pd-email { font-size: 0.86rem; font-weight: 700; color: var(--text-main); word-break: break-all; }
            .pd-sid { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; margin-top: 3px; }
            .pd-section-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 6px; }
            .pd-courses { display: flex; flex-wrap: wrap; gap: 6px; }
            .pd-chip { font-size: 0.74rem; font-weight: 800; padding: 3px 9px; border-radius: 8px; background: rgba(16, 185, 129, 0.14); color: #10b981; }
            .pd-chip.none { background: var(--bg); color: var(--text-muted); font-weight: 600; }
            .pd-item {
                width: 100%; padding: 10px 12px; border-radius: 10px; border: none;
                background: var(--bg); color: var(--text-main); font-family: inherit;
                font-size: 0.85rem; font-weight: 700; cursor: pointer;
                text-align: left; text-decoration: none; display: block;
            }
            .pd-item:hover { background: var(--purple-light); color: var(--purple); }
            .pd-item.admin { color: #10b981; }
            .pd-item.danger { color: var(--error); }
            .pd-item.danger:hover { background: rgba(239, 68, 68, 0.12); color: var(--error); }

            /* Course Card Status Pill on index.html */
            .course-status-pill {
                margin-top: 14px; font-size: 0.76rem; font-weight: 800;
                padding: 5px 12px; border-radius: 20px; letter-spacing: 0.03em;
            }
            .course-status-pill.unlocked { background: rgba(16, 185, 129, 0.14); color: #10b981; }
            .course-status-pill.locked { background: var(--purple-light); color: var(--purple); }

            /* Auth Modal */
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
    }

    if (!document.getElementById('auth-modal')) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal-backdrop" id="auth-modal">
                <div class="modal-card">
                    <h3 id="modal-title">Student Sign In</h3>
                    <p id="modal-subtitle">Log in to access your unlocked subjects.</p>
                    <div id="signup-extra-top" style="display: none;">
                        <input type="text" id="auth-student-id" class="modal-input" placeholder="University Student ID (e.g. 26464141)" maxlength="20">
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
}

/* ====================== RENDER PROFILE AVATAR IN NAVBAR ====================== */
function renderHeaderProfile(profile) {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn || !themeBtn.parentElement) return;
    const container = themeBtn.parentElement;

    // Remove legacy cluttered header elements if present
    ['user-email', 'pro-badge', 'admin-link-btn', 'auth-header-btn', 'profile-slot'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    const slot = document.createElement('div');
    slot.id = 'profile-slot';
    slot.className = 'profile-menu-wrap';

    if (!window.currentUser) {
        slot.innerHTML = `<button type="button" class="nav-btn auth-btn" onclick="openAuthModal('signin')">Sign In</button>`;
        container.insertBefore(slot, themeBtn);
        return;
    }

    const email = window.currentUser.email || '';
    const initial = email.charAt(0).toUpperCase() || 'U';
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const hasAnyCourse = window.unlockedCourses.length > 0;

    const courseBadges = hasAnyCourse
        ? window.unlockedCourses.map(c => `<span class="pd-chip">${c === 'all' ? 'ALL SUBJECTS' : c.toUpperCase()}</span>`).join('')
        : `<span class="pd-chip none">Free Preview Only</span>`;

    slot.innerHTML = `
        <button type="button" class="profile-avatar-btn ${hasAnyCourse ? 'has-pro' : ''}" id="profile-avatar-btn" title="Account">${initial}</button>
        <div class="profile-dropdown" id="profile-dropdown">
            <div class="pd-header">
                <div class="pd-email">${email}</div>
                ${profile?.student_id ? `<div class="pd-sid">Student ID: ${profile.student_id}</div>` : ''}
            </div>
            <div>
                <div class="pd-section-label">Unlocked Subjects</div>
                <div class="pd-courses">${courseBadges}</div>
            </div>
            ${isAdmin ? `<a href="admin.html" class="pd-item admin">⚡ + Add MCQs (Admin)</a>` : ''}
            <button type="button" class="pd-item danger" onclick="signOutUser()">Sign Out</button>
        </div>
    `;

    container.insertBefore(slot, themeBtn);

    const avatarBtn = document.getElementById('profile-avatar-btn');
    const dropdown = document.getElementById('profile-dropdown');
    avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (!slot.contains(e.target)) dropdown.classList.remove('open');
    });
}

/* ====================== UPDATE HOME PAGE COURSE CARDS ====================== */
function updateHomeCourseCards() {
    const cards = document.querySelectorAll('.grid-container a.card');
    if (!cards.length) return;

    cards.forEach(card => {
        const href = (card.getAttribute('href') || '').toLowerCase();
        const code = href.replace('.html', '').trim();
        if (!code) return;

        const oldPill = card.querySelector('.course-status-pill');
        if (oldPill) oldPill.remove();

        const unlocked = window.hasCourseAccess(code);
        const pill = document.createElement('span');
        pill.className = `course-status-pill ${unlocked ? 'unlocked' : 'locked'}`;
        pill.textContent = unlocked ? '✓ Unlocked' : '🔒 15 Free Questions';
        card.appendChild(pill);
    });

    const proBanner = document.getElementById('pro-banner');
    if (proBanner) {
        const allUnlocked = ['el112', 'gr101el', 'gt103', 'tu170'].every(c => window.hasCourseAccess(c));
        proBanner.style.display = allUnlocked ? 'none' : 'flex';
        const h2 = proBanner.querySelector('h2');
        const p = proBanner.querySelector('p');
        const btn = document.getElementById('pro-cta-btn');
        if (h2) h2.textContent = '📚 Unlock Your Subjects';
        if (p) p.textContent = 'Pick only the courses you are taking this semester—or unlock all 4 at once.';
        if (btn) {
            btn.textContent = window.currentUser ? 'Unlock All 4 Courses ➔' : 'Sign Up & Get Started ➔';
            btn.onclick = () => handleUpgradeClick('all');
        }
    }
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
        ? 'Log in to access your unlocked subjects (Max 2 devices).'
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

    Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('qcache_')) sessionStorage.removeItem(k);
    });

    msgEl.style.color = 'var(--success)';
    msgEl.textContent = 'Success! Loading...';
    setTimeout(() => location.reload(), 500);
};

window.signOutUser = function() {
    Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('qcache_')) sessionStorage.removeItem(k);
    });
    window.db.auth.signOut().then(() => location.reload());
};

window.handleUpgradeClick = function(courseCode = 'all') {
    if (!window.currentUser) {
        openAuthModal('signup');
        return;
    }
    const code = (courseCode || 'all').toLowerCase();
    const baseUrl = COURSE_CHECKOUT_URLS[code] || COURSE_CHECKOUT_URLS.all;
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}checkout[email]=${encodeURIComponent(window.currentUser.email)}&checkout[custom][course_code]=${encodeURIComponent(code)}`;
    window.open(url, '_blank');
};

/* ====================== INIT SESSION & DEVICE CHECK ====================== */
window.initAuth = async function() {
    injectAuthUI();
    const { data: { session } } = await window.db.auth.getSession();
    window.currentUser = session?.user || null;
    window.unlockedCourses = [];

    if (window.currentUser) {
        const { data: devCheck, error: devErr } = await window.db.rpc('register_device', {
            p_device_id: getDeviceId()
        });

        if (!devErr && devCheck && devCheck.allowed === false && devCheck.reason === 'limit_reached') {
            await window.db.auth.signOut();
            window.currentUser = null;
            renderHeaderProfile(null);
            updateHomeCourseCards();
            openAuthModal(
                'signin',
                `⛔ Device Limit Reached (Max ${devCheck.max} devices). This account is already active on 2 other devices. Contact admin if you switched devices.`
            );
            return { user: null, unlockedCourses: [], deviceBlocked: true };
        }

        const { data: profile } = await window.db
            .from('profiles')
            .select('unlocked_courses, student_id')
            .eq('id', window.currentUser.id)
            .single();

        const rawCourses = Array.isArray(profile?.unlocked_courses) ? profile.unlocked_courses : [];
        window.unlockedCourses = rawCourses.map(c => String(c).toLowerCase());

        renderHeaderProfile(profile);
        updateHomeCourseCards();
        return { user: window.currentUser, unlockedCourses: window.unlockedCourses, deviceBlocked: false };
    }

    renderHeaderProfile(null);
    updateHomeCourseCards();
    return { user: null, unlockedCourses: [], deviceBlocked: false };
};

/* ====================== CACHED QUESTION LOADER ====================== */
window.fetchCourseQuestions = async function(courseCode) {
    const unlocked = window.hasCourseAccess(courseCode);
    const cacheKey = `qcache_${courseCode}_${unlocked ? 'unlocked' : 'free'}`;
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
