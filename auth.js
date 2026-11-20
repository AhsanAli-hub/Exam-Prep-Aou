const SUPABASE_URL = 'https://sdqhrxybowzyxveqwkwo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UBviShU8w5kEtL0sGkIh6w_Ay8_lnaj';
const ADMIN_EMAIL = 'ahsan.ali72@outlook.com';

/* ====================== COURSE PRICING & LABELS ====================== */
const COURSE_CONFIG = {
    prices: {
        el112: '15 SAR',
        gr101el: '15 SAR',
        gt103: '15 SAR',
        tu170: '15 SAR',
        all: '50 SAR'
    },
    labels: {
        el112: 'EL112 — English Language',
        gr101el: 'GR101EL — Life Skills',
        gt103: 'GT103 — Artificial Intelligence',
        tu170: 'TU170 — Computing Essentials',
        all: 'All 4 Courses — Full Semester Bundle'
    }
};

window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.currentUser = null;
window.currentProfile = null;
window.unlockedCourses = [];
window.pendingRequests = [];
let authMode = 'signin';
let activeRequestCourse = 'all';

window.hasCourseAccess = function(courseCode) {
    if (!courseCode) return window.unlockedCourses.length > 0;
    const code = courseCode.toLowerCase();
    return window.unlockedCourses.includes('all') || window.unlockedCourses.includes(code);
};

window.getPendingRequest = function(courseCode) {
    const code = (courseCode || 'all').toLowerCase();
    return window.pendingRequests.find(r => r.course_code === code || r.course_code === 'all') || null;
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

/* ====================== INJECT STYLES & MODALS ====================== */
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
            .pd-chip.pending { background: rgba(245, 158, 11, 0.16); color: #f59e0b; }
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
            .course-status-pill.pending { background: rgba(245, 158, 11, 0.16); color: #f59e0b; }
            .course-status-pill.locked { background: var(--purple-light); color: var(--purple); }

            /* Shared Modal Styles */
            .modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.62); display: none; align-items: center; justify-content: center; padding: 20px; z-index: 1000; }
            .modal-backdrop.open { display: flex; }
            .modal-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 20px; padding: 26px; width: 100%; max-width: 420px; box-shadow: 0 12px 30px rgba(0,0,0,0.3); max-height: 92vh; overflow-y: auto; }
            .modal-card h3 { margin: 0 0 6px 0; color: var(--purple); font-size: 1.32rem; font-weight: 800; }
            .modal-card p { margin: 0 0 16px 0; color: var(--text-muted); font-size: 0.88rem; line-height: 1.45; }
            .modal-input { width: 100%; padding: 12px 14px; margin-bottom: 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text-main); font-family: inherit; font-size: 0.94rem; }
            .modal-input:focus { outline: none; border-color: var(--purple); }
            .password-wrap { position: relative; margin-bottom: 12px; }
            .password-wrap .modal-input { margin-bottom: 0; padding-right: 44px; }
            .password-wrap input::-ms-reveal, .password-wrap input::-ms-clear { display: none; }
            .password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-muted); padding: 4px; display: flex; align-items: center; justify-content: center; }
            .password-toggle:hover { color: var(--purple); }
            .modal-submit { width: 100%; padding: 13px; background: var(--purple); color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; font-family: inherit; margin-top: 4px; }
            .modal-submit:hover:not(:disabled) { background: var(--purple-hover); }
            .modal-submit:disabled { opacity: 0.55; cursor: not-allowed; }
            .modal-cancel { width: 100%; padding: 10px; background: transparent; color: var(--text-muted); border: 1.5px solid var(--border); border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: inherit; margin-top: 10px; }
            .modal-switch { margin-top: 14px; text-align: center; font-size: 0.85rem; color: var(--text-muted); }
            .modal-switch a { color: var(--purple); font-weight: 700; cursor: pointer; text-decoration: none; }
            .modal-msg { font-size: 0.85rem; margin-top: 10px; font-weight: 600; text-align: center; line-height: 1.45; }

            /* Request Access Summary Box */
            .req-summary { background: var(--purple-light); border: 1.5px solid var(--purple); border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
            .req-summary-course { font-weight: 800; font-size: 0.92rem; color: var(--text-main); }
            .req-summary-price { font-weight: 800; font-size: 1.1rem; color: var(--purple); white-space: nowrap; }
            .req-email-note { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; font-size: 0.83rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.45; }
            .req-email-note strong { color: var(--text-main); }
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

    if (!document.getElementById('request-modal')) {
        const rWrap = document.createElement('div');
        rWrap.innerHTML = `
            <div class="modal-backdrop" id="request-modal">
                <div class="modal-card">
                    <h3>📩 Request Course Access</h3>
                    <p>Submit a request below and we will email the payment details directly to your inbox.</p>

                    <div class="req-summary">
                        <span class="req-summary-course" id="rm-course-label">EL112</span>
                        <span class="req-summary-price" id="rm-price">25 SAR</span>
                    </div>

                    <div class="req-email-note" id="rm-email-note"></div>

                    <div id="rm-form-area">
                        <input type="text" id="rm-note" class="modal-input" placeholder="Optional note (e.g. preferred payment method)" maxlength="120">
                        <button type="button" class="modal-submit" id="rm-submit-btn" onclick="submitAccessRequest()">Send Access Request ➔</button>
                    </div>

                    <div class="modal-msg" id="rm-msg"></div>
                    <button type="button" class="modal-cancel" onclick="closeRequestModal()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(rWrap.firstElementChild);
    }
}

window.closeRequestModal = function() {
    const m = document.getElementById('request-modal');
    if (m) m.classList.remove('open');
};

window.handleUpgradeClick = function(courseCode = 'all') {
    if (!window.currentUser) {
        openAuthModal('signup', 'Create your student account first so we can email you the payment details.');
        return;
    }
    injectAuthUI();
    activeRequestCourse = (courseCode || 'all').toLowerCase();
    const label = COURSE_CONFIG.labels[activeRequestCourse] || activeRequestCourse.toUpperCase();
    const price = COURSE_CONFIG.prices[activeRequestCourse] || COURSE_CONFIG.prices.all;

    document.getElementById('rm-course-label').textContent = label;
    document.getElementById('rm-price').textContent = price;
    document.getElementById('rm-email-note').innerHTML =
        `Payment instructions will be sent to: <strong>${window.currentUser.email}</strong>`;

    const existingPending = window.getPendingRequest(activeRequestCourse);
    const formArea = document.getElementById('rm-form-area');
    const msgEl = document.getElementById('rm-msg');

    if (existingPending) {
        formArea.style.display = 'none';
        msgEl.style.color = '#f59e0b';
        msgEl.textContent = `⏳ Access already requested for ${label}. Please check your email inbox (and Spam/Junk folder) for payment details.`;
    } else {
        formArea.style.display = 'block';
        document.getElementById('rm-note').value = '';
        document.getElementById('rm-submit-btn').disabled = false;
        msgEl.textContent = '';
    }

    document.getElementById('request-modal').classList.add('open');
};

window.submitAccessRequest = async function() {
    const note = document.getElementById('rm-note').value.trim();
    const msgEl = document.getElementById('rm-msg');
    const submitBtn = document.getElementById('rm-submit-btn');

    submitBtn.disabled = true;
    msgEl.style.color = 'var(--text-muted)';
    msgEl.textContent = 'Sending request...';

    const price = COURSE_CONFIG.prices[activeRequestCourse] || COURSE_CONFIG.prices.all;

    const { data, error } = await window.db
        .from('payment_requests')
        .insert({
            user_id: window.currentUser.id,
            email: window.currentUser.email,
            student_id: window.currentProfile?.student_id || null,
            course_code: activeRequestCourse,
            amount: price,
            transfer_ref: note || 'Access requested'
        })
        .select()
        .single();

    if (error) {
        submitBtn.disabled = false;
        msgEl.style.color = 'var(--error)';
        msgEl.textContent = 'Error: ' + error.message;
        return;
    }

    window.pendingRequests.push(data);
    renderHeaderProfile(window.currentProfile);
    updateHomeCourseCards();

    document.getElementById('rm-form-area').style.display = 'none';
    msgEl.style.color = 'var(--success)';
    msgEl.textContent = `✅ Request sent! We will email payment instructions to ${window.currentUser.email} shortly.`;
};

/* ====================== RENDER PROFILE AVATAR IN NAVBAR ====================== */
function renderHeaderProfile(profile) {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn || !themeBtn.parentElement) return;
    const container = themeBtn.parentElement;

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

    let chips = [];
    if (hasAnyCourse) {
        chips.push(...window.unlockedCourses.map(c => `<span class="pd-chip">${c === 'all' ? 'ALL SUBJECTS' : c.toUpperCase()}</span>`));
    }
    if (window.pendingRequests.length > 0) {
        chips.push(...window.pendingRequests.map(r => `<span class="pd-chip pending">⏳ ${r.course_code.toUpperCase()}</span>`));
    }
    const courseBadges = chips.length > 0 ? chips.join('') : `<span class="pd-chip none">Free Preview Only</span>`;

    slot.innerHTML = `
        <button type="button" class="profile-avatar-btn ${hasAnyCourse ? 'has-pro' : ''}" id="profile-avatar-btn" title="Account">${initial}</button>
        <div class="profile-dropdown" id="profile-dropdown">
            <div class="pd-header">
                <div class="pd-email">${email}</div>
                ${profile?.student_id ? `<div class="pd-sid">Student ID: ${profile.student_id}</div>` : ''}
            </div>
            <div>
                <div class="pd-section-label">My Subjects</div>
                <div class="pd-courses">${courseBadges}</div>
            </div>
            ${isAdmin ? `<a href="admin.html" class="pd-item admin">⚡ Admin Dashboard</a>` : ''}
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
        const pending = !unlocked && Boolean(window.getPendingRequest(code));

        const pill = document.createElement('span');
        if (unlocked) {
            pill.className = 'course-status-pill unlocked';
            pill.textContent = '✓ Unlocked';
        } else if (pending) {
            pill.className = 'course-status-pill pending';
            pill.textContent = '⏳ Access Requested';
        } else {
            pill.className = 'course-status-pill locked';
            pill.textContent = '🔒 15 Free Questions';
        }
        card.appendChild(pill);
    });

    const proBanner = document.getElementById('pro-banner');
    if (proBanner) {
        const allUnlocked = ['el112', 'gr101el', 'gt103', 'tu170'].every(c => window.hasCourseAccess(c));
        proBanner.style.display = allUnlocked ? 'none' : 'flex';
        const h2 = proBanner.querySelector('h2');
        const p = proBanner.querySelector('p');
        const btn = document.getElementById('pro-cta-btn');
        if (h2) h2.textContent = '📚 Request Full Subject Access';
        if (p) p.textContent = 'Unlock individual courses (' + COURSE_CONFIG.prices.el112 + ' each) or all 4 courses (' + COURSE_CONFIG.prices.all + ').';
        if (btn) {
            btn.textContent = window.currentUser ? 'Request Full Access ➔' : 'Sign Up & Request Access ➔';
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

      if (!/^2[0-9]{4,19}$/.test(studentId)) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Student ID must start with 2 and contain digits only (5–20 digits).';
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

        const { data, error } = await window.db.auth.signUp({
            email,
            password,
            options: {
                data: { student_id: studentId },
                emailRedirectTo: 'https://ahsanali-hub.github.io/Exam-Prep-Aou/'
            }
        });

        if (error) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = error.message;
            return;
        }

        if (!data?.session) {
            msgEl.style.color = 'var(--success)';
            msgEl.textContent = `✅ Account created! Check ${email} (including Spam/Junk) and click the verification link before signing in.`;
            return;
        }
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

/* ====================== INIT SESSION & DEVICE CHECK ====================== */
window.initAuth = async function() {
    injectAuthUI();
    const { data: { session } } = await window.db.auth.getSession();
    window.currentUser = session?.user || null;
    window.currentProfile = null;
    window.unlockedCourses = [];
    window.pendingRequests = [];

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

        const [{ data: profile }, { data: pending }] = await Promise.all([
            window.db
                .from('profiles')
                .select('unlocked_courses, student_id')
                .eq('id', window.currentUser.id)
                .single(),
            window.db
                .from('payment_requests')
                .select('*')
                .eq('user_id', window.currentUser.id)
                .eq('status', 'pending')
        ]);

        window.currentProfile = profile || null;
        const rawCourses = Array.isArray(profile?.unlocked_courses) ? profile.unlocked_courses : [];
        window.unlockedCourses = rawCourses.map(c => String(c).toLowerCase());
        window.pendingRequests = Array.isArray(pending) ? pending : [];

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
