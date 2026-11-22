const SUPABASE_URL = 'https://sdqhrxybowzyxveqwkwo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UBviShU8w5kEtL0sGkIh6w_Ay8_lnaj';
const ADMIN_EMAIL = 'ahsan.ali72@outlook.com';
const REDIRECT_URL = 'https://exam-prep-aou.online/';
const EMAIL_COOLDOWN_SECONDS = 90;
const COOLDOWN_STORAGE_KEY = 'exam_prep_email_cooldown_until';

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

let authMode = 'signin'; // 'signin' | 'signup' | 'verify-signup' | 'forgot' | 'reset'
let activeRequestCourse = 'all';
let pendingSignupEmail = '';
let cooldownTimerId = null;

/* ====================== PASSWORD EYE SVG HELPERS ====================== */
const EYE_OPEN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

const EYE_CLOSED_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.85 21.85 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function setPwdToggleIcon(btn, isVisible) {
    if (!btn) return;
    btn.innerHTML = isVisible ? EYE_OPEN_SVG : EYE_CLOSED_SVG;
}

function resetPwdToggles() {
    document.querySelectorAll('#auth-modal .password-toggle').forEach(btn => {
        setPwdToggleIcon(btn, false);
    });
    document.querySelectorAll('#auth-modal input[type="text"][id*="password"]').forEach(input => {
        input.type = 'password';
    });
}

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

/* ====================== EMAIL COOLDOWN HELPERS ====================== */
function clearCooldownTimer() {
    if (cooldownTimerId) {
        clearInterval(cooldownTimerId);
        cooldownTimerId = null;
    }
}

function setEmailCooldown(seconds = EMAIL_COOLDOWN_SECONDS) {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now() + seconds * 1000));
}

function getRemainingCooldown() {
    const until = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || 0);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function syncCooldownButton(btnId, defaultLabel) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    clearCooldownTimer();

    const tick = () => {
        const remaining = getRemainingCooldown();
        if (remaining <= 0) {
            clearCooldownTimer();
            btn.disabled = false;
            btn.textContent = defaultLabel;
        } else {
            btn.disabled = true;
            btn.textContent = `${defaultLabel} (${remaining}s)`;
        }
    };

    tick();
    if (getRemainingCooldown() > 0) {
        cooldownTimerId = setInterval(tick, 1000);
    }
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
            .pd-expiry { font-size: 0.75rem; color: #f59e0b; font-weight: 700; margin-top: 6px; }
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
            .otp-code-input {
                width: 100%; padding: 14px; margin-bottom: 10px;
                border-radius: 12px; border: 2px solid var(--purple);
                background: var(--bg); color: var(--text-main);
                font-family: inherit; font-size: 1.65rem; font-weight: 800;
                letter-spacing: 0.42em; text-align: center;
            }
            .otp-code-input:focus { outline: none; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25); }
            .otp-resend-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 0.82rem; color: var(--text-muted); }
            .forgot-row { display: flex; justify-content: flex-end; margin: -6px 0 12px; }
            .inline-link-btn { background: none; border: none; padding: 0; color: var(--purple); font-family: inherit; font-size: 0.82rem; font-weight: 700; cursor: pointer; text-decoration: none; }
            .inline-link-btn:hover:not(:disabled) { text-decoration: underline; }
            .inline-link-btn:disabled { color: var(--text-muted); cursor: not-allowed; opacity: 0.7; }
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

            /* Google OAuth Button & Divider */
            .oauth-divider { display: flex; align-items: center; gap: 10px; margin: 14px 0 10px; color: var(--text-muted); font-size: 0.78rem; font-weight: 700; }
            .oauth-divider::before, .oauth-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
            .google-btn { width: 100%; padding: 12px; background: var(--bg); color: var(--text-main); border: 1.5px solid var(--border); border-radius: 12px; font-weight: 700; font-size: 0.92rem; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 10px; }
            .google-btn:hover { border-color: var(--purple); background: var(--purple-light); }
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
                        <input type="text" id="auth-student-id" class="modal-input" placeholder="University Student ID (8 digits, e.g. 26464141)" inputmode="numeric" maxlength="8">
                    </div>

                    <input type="email" id="auth-email" class="modal-input" placeholder="Email address">

                    <div class="password-wrap" id="auth-pwd-wrap">
                        <input type="password" id="auth-password" class="modal-input" placeholder="Password (min 6 characters)">
                        <button type="button" class="password-toggle" onclick="togglePwdField('auth-password', this)" aria-label="Toggle password"></button>
                    </div>

                    <div class="forgot-row" id="forgot-row">
                        <button type="button" class="inline-link-btn" onclick="openForgotPassword()">Forgot password?</button>
                    </div>

                    <div class="password-wrap" id="confirm-pwd-wrap" style="display: none;">
                        <input type="password" id="auth-confirm-password" class="modal-input" placeholder="Confirm password">
                        <button type="button" class="password-toggle" onclick="togglePwdField('auth-confirm-password', this)" aria-label="Toggle confirm password"></button>
                    </div>

                    <div id="otp-verify-wrap" style="display: none;">
                        <input type="text" id="auth-otp-code" class="otp-code-input" placeholder="000000" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code">
                        <div class="otp-resend-row">
                            <span>Didn't get the code?</span>
                            <button type="button" class="inline-link-btn" id="resend-otp-btn" onclick="resendSignupCode()">Resend code</button>
                        </div>
                    </div>

                    <button class="modal-submit" id="auth-submit-btn" onclick="submitAuth()">Sign In</button>

                    <div id="oauth-section">
                        <div class="oauth-divider">OR</div>
                        <button type="button" class="google-btn" onclick="signInWithGoogle()">
                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.55-1.14 2.86-2.4 3.73v3.09h3.88c2.27-2.09 3.54-5.17 3.54-9.06z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.09c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.26v3.18C3.23 21.31 7.31 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.28 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.53H1.26C.46 8.17 0 10.02 0 12s.46 3.83 1.26 5.47l4.02-3.18z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.23 2.69 1.26 6.53l4.02 3.18c.95-2.85 3.6-4.96 6.72-4.96z"/>
                            </svg>
                            <span>Continue with Google</span>
                        </button>
                    </div>

                    <div class="modal-msg" id="auth-msg"></div>

                    <div class="modal-switch" id="modal-switch-wrap">
                        <span id="modal-switch-text">Don't have an account?</span>
                        <a id="modal-switch-link" onclick="toggleAuthMode()">Create one</a>
                    </div>

                    <button class="modal-cancel" onclick="closeAuthModal()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper.firstElementChild);
        resetPwdToggles();

        const otpInput = document.getElementById('auth-otp-code');
        otpInput.addEventListener('input', () => {
            otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
        });

        document.getElementById('auth-modal').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitAuth();
            }
        });
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

    let expiryLine = '';
    if (hasAnyCourse && profile?.access_expires_at) {
        const expDate = new Date(profile.access_expires_at);
        if (!Number.isNaN(expDate.getTime()) && expDate > new Date()) {
            expiryLine = `<div class="pd-expiry">⏰ Access expires: ${expDate.toLocaleDateString()}</div>`;
        }
    }

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
                ${expiryLine}
            </div>
            ${isAdmin ? `<a href="admin.html" class="pd-item admin">⚡ Admin Dashboard</a>` : ''}
            <button type="button" class="pd-item danger" id="profile-signout-btn">Sign Out</button>
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

    const signOutBtn = slot.querySelector('#profile-signout-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await window.signOutUser();
        });
    }
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
    const showText = input.type === 'password';
    input.type = showText ? 'text' : 'password';
    setPwdToggleIcon(btn, showText);
};

window.openAuthModal = function(mode = 'signin', customMessage = '') {
    injectAuthUI();
    resetPwdToggles();
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
    clearCooldownTimer();
};

window.openForgotPassword = function() {
    authMode = 'forgot';
    document.getElementById('auth-msg').textContent = '';
    updateAuthModalUI();
    document.getElementById('auth-email').focus();
};

window.toggleAuthMode = function() {
    if (authMode === 'signin') {
        authMode = 'signup';
    } else if (authMode === 'verify-signup') {
        authMode = 'signup';
    } else {
        authMode = 'signin';
    }
    document.getElementById('auth-msg').textContent = '';
    updateAuthModalUI();
};

window.resendSignupCode = async function() {
    if (!pendingSignupEmail || getRemainingCooldown() > 0) return;

    const msgEl = document.getElementById('auth-msg');
    const resendBtn = document.getElementById('resend-otp-btn');
    if (resendBtn) resendBtn.disabled = true;

    msgEl.style.color = 'var(--text-muted)';
    msgEl.textContent = 'Sending new 6-digit code...';

    const { error } = await window.db.auth.resend({
        type: 'signup',
        email: pendingSignupEmail
    });

    if (error) {
        msgEl.style.color = 'var(--error)';
        msgEl.textContent = error.message;
        syncCooldownButton('resend-otp-btn', 'Resend code');
        return;
    }

    setEmailCooldown(EMAIL_COOLDOWN_SECONDS);
    syncCooldownButton('resend-otp-btn', 'Resend code');
    msgEl.style.color = 'var(--success)';
    msgEl.textContent = `✅ A new 6-digit code was sent to ${pendingSignupEmail}.`;
};

function updateAuthModalUI() {
    const titleEl = document.getElementById('modal-title');
    const subEl = document.getElementById('modal-subtitle');
    const signupTop = document.getElementById('signup-extra-top');
    const emailInput = document.getElementById('auth-email');
    const pwdWrap = document.getElementById('auth-pwd-wrap');
    const pwdInput = document.getElementById('auth-password');
    const forgotRow = document.getElementById('forgot-row');
    const confirmWrap = document.getElementById('confirm-pwd-wrap');
    const otpWrap = document.getElementById('otp-verify-wrap');
    const submitBtn = document.getElementById('auth-submit-btn');
    const oauthSec = document.getElementById('oauth-section');
    const switchWrap = document.getElementById('modal-switch-wrap');
    const switchText = document.getElementById('modal-switch-text');
    const switchLink = document.getElementById('modal-switch-link');

    clearCooldownTimer();
    submitBtn.disabled = false;

    signupTop.style.display = 'none';
    emailInput.style.display = 'block';
    pwdWrap.style.display = 'none';
    forgotRow.style.display = 'none';
    confirmWrap.style.display = 'none';
    otpWrap.style.display = 'none';
    oauthSec.style.display = 'none';
    switchWrap.style.display = 'block';
    pwdInput.placeholder = 'Password (min 6 characters)';

    if (authMode === 'signin') {
        titleEl.textContent = 'Student Sign In';
        subEl.textContent = 'Log in to access your unlocked subjects (Max 2 devices).';
        pwdWrap.style.display = 'block';
        forgotRow.style.display = 'flex';
        submitBtn.textContent = 'Sign In';
        oauthSec.style.display = 'block';
        switchText.textContent = "Don't have an account?";
        switchLink.textContent = 'Create one';
    } else if (authMode === 'signup') {
        titleEl.textContent = 'Create Student Account';
        subEl.textContent = 'Enter your University Student ID and email. Accounts are limited to 2 devices.';
        signupTop.style.display = 'block';
        pwdWrap.style.display = 'block';
        confirmWrap.style.display = 'block';
        submitBtn.textContent = 'Create Account';
        oauthSec.style.display = 'block';
        switchText.textContent = 'Already have an account?';
        switchLink.textContent = 'Sign in';
    } else if (authMode === 'verify-signup') {
        titleEl.textContent = 'Verify Your Email';
        subEl.textContent = `Enter the 6-digit code sent to ${pendingSignupEmail} (check Spam/Junk if needed).`;
        emailInput.style.display = 'none';
        otpWrap.style.display = 'block';
        document.getElementById('auth-otp-code').value = '';
        submitBtn.textContent = 'Verify & Create Account';
        switchText.textContent = 'Wrong email?';
        switchLink.textContent = 'Go back';
        syncCooldownButton('resend-otp-btn', 'Resend code');
    } else if (authMode === 'forgot') {
        titleEl.textContent = 'Reset Password';
        subEl.textContent = 'Enter your account email and we will send you a password reset link.';
        submitBtn.textContent = 'Send Reset Link';
        switchText.textContent = 'Remembered your password?';
        switchLink.textContent = 'Back to Sign In';
        syncCooldownButton('auth-submit-btn', 'Send Reset Link');
    } else if (authMode === 'reset') {
        titleEl.textContent = 'Set New Password';
        subEl.textContent = 'Enter your new password below (minimum 6 characters).';
        emailInput.style.display = 'none';
        pwdWrap.style.display = 'block';
        pwdInput.placeholder = 'New password (min 6 characters)';
        confirmWrap.style.display = 'block';
        submitBtn.textContent = 'Update Password';
        switchWrap.style.display = 'none';
    }
}

window.submitAuth = async function() {
    const submitBtn = document.getElementById('auth-submit-btn');
    if (submitBtn.disabled) return;

    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;
    const msgEl = document.getElementById('auth-msg');

    if (authMode === 'verify-signup') {
        const token = document.getElementById('auth-otp-code').value.replace(/\D/g, '').trim();
        if (token.length !== 6) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Please enter the 6-digit verification code.';
            return;
        }

        submitBtn.disabled = true;
        msgEl.style.color = 'var(--text-muted)';
        msgEl.textContent = 'Verifying code...';

        const { error } = await window.db.auth.verifyOtp({
            email: pendingSignupEmail,
            token,
            type: 'signup'
        });

        submitBtn.disabled = false;

        if (error) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Invalid or expired code: ' + error.message;
            return;
        }

        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('qcache_')) sessionStorage.removeItem(k);
        });

        msgEl.style.color = 'var(--success)';
        msgEl.textContent = '✅ Email verified! Loading...';
        setTimeout(() => location.reload(), 500);
        return;
    }

    if (authMode === 'forgot') {
        if (getRemainingCooldown() > 0) return;

        if (!email) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Please enter your email address.';
            return;
        }

        submitBtn.disabled = true;
        msgEl.style.color = 'var(--text-muted)';
        msgEl.textContent = 'Sending password reset link...';

        const { error } = await window.db.auth.resetPasswordForEmail(email, {
            redirectTo: REDIRECT_URL
        });

        if (error) {
            submitBtn.disabled = false;
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = error.message;
            return;
        }

        setEmailCooldown(EMAIL_COOLDOWN_SECONDS);
        syncCooldownButton('auth-submit-btn', 'Send Reset Link');
        msgEl.style.color = 'var(--success)';
        msgEl.textContent = `✅ Reset link sent to ${email}. Open the link in your inbox (check Spam/Junk) to set a new password.`;
        return;
    }

    if (authMode === 'reset') {
        const confirmPwd = document.getElementById('auth-confirm-password').value;
        if (password.length < 6) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'New password must be at least 6 characters.';
            return;
        }
        if (password !== confirmPwd) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Passwords do not match.';
            return;
        }

        submitBtn.disabled = true;
        msgEl.style.color = 'var(--text-muted)';
        msgEl.textContent = 'Updating password...';

        const { error } = await window.db.auth.updateUser({ password });
        submitBtn.disabled = false;

        if (error) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = error.message;
            return;
        }

        window._isPasswordRecovery = false;
        msgEl.style.color = 'var(--success)';
        msgEl.textContent = '✅ Password updated! Signing you in...';
        setTimeout(() => location.replace(REDIRECT_URL), 700);
        return;
    }

    if (!email || !password) {
        msgEl.style.color = 'var(--error)';
        msgEl.textContent = 'Please enter your email and password.';
        return;
    }

    if (authMode === 'signup') {
        const studentId = document.getElementById('auth-student-id').value.trim();
        const confirmPwd = document.getElementById('auth-confirm-password').value;

        if (!/^2[0-9]{7}$/.test(studentId)) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'Student ID must start with 2 and be exactly 8 digits.';
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

        submitBtn.disabled = true;
        msgEl.style.color = 'var(--text-muted)';
        msgEl.textContent = 'Creating account...';

        const { data, error } = await window.db.auth.signUp({
            email,
            password,
            options: {
                data: { student_id: studentId },
                emailRedirectTo: REDIRECT_URL
            }
        });

        submitBtn.disabled = false;

        if (error) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = error.message;
            return;
        }

        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            msgEl.style.color = 'var(--error)';
            msgEl.textContent = 'An account with this email already exists. Please sign in or click Forgot password.';
            return;
        }

        if (!data?.session) {
            pendingSignupEmail = email;
            setEmailCooldown(EMAIL_COOLDOWN_SECONDS);
            authMode = 'verify-signup';
            updateAuthModalUI();
            msgEl.style.color = 'var(--success)';
            msgEl.textContent = `✅ Code sent to ${email}!`;
            document.getElementById('auth-otp-code').focus();
            return;
        }
    } else {
        submitBtn.disabled = true;
        msgEl.style.color = 'var(--text-muted)';
        msgEl.textContent = 'Signing in...';

        const { error } = await window.db.auth.signInWithPassword({ email, password });
        submitBtn.disabled = false;

        if (error) {
            if (error.message.toLowerCase().includes('email not confirmed')) {
                pendingSignupEmail = email;
                authMode = 'verify-signup';
                updateAuthModalUI();
                if (getRemainingCooldown() === 0) {
                    await window.resendSignupCode();
                } else {
                    msgEl.style.color = 'var(--text-muted)';
                    msgEl.textContent = `Please enter the 6-digit code recently sent to ${email}.`;
                }
                document.getElementById('auth-otp-code').focus();
                return;
            }
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

window.signInWithGoogle = async function() {
    const msgEl = document.getElementById('auth-msg');
    msgEl.style.color = 'var(--text-muted)';
    msgEl.textContent = 'Redirecting to Google...';

    const { error } = await window.db.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: REDIRECT_URL
        }
    });

    if (error) {
        msgEl.style.color = 'var(--error)';
        msgEl.textContent = error.message;
    }
};

window.promptMissingStudentId = async function() {
    if (window._studentIdPromptOpen || !window.currentUser?.id) return false;

    window._studentIdPromptOpen = true;

    try {
        let modal = document.getElementById('student-id-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'student-id-modal';
            modal.className = 'modal-backdrop';

            modal.innerHTML = `
                <div class="modal-card" style="max-width:440px;">
                    <div style="
                        width:52px;height:52px;
                        display:flex;align-items:center;justify-content:center;
                        border-radius:16px;
                        background:var(--purple-light);
                        font-size:26px;margin-bottom:18px;">
                        🎓
                    </div>

                    <div style="
                        font-size:11px;font-weight:800;
                        letter-spacing:1.5px;color:var(--purple);
                        margin-bottom:8px;">
                        ACCOUNT SETUP
                    </div>

                    <h3>Complete Your Profile</h3>

                    <p>
                        Just one more step! Enter your university
                        Student ID to finish setting up your account.
                    </p>

                    <form id="student-id-form">
                        <label for="required-student-id"
                            style="display:block;margin-bottom:8px;font-weight:700;">
                            University Student ID
                        </label>

                        <input
                            id="required-student-id"
                            class="modal-input"
                            type="text"
                            inputmode="numeric"
                            maxlength="8"
                            placeholder="e.g. 26262626"
                            required
                        >

                        <div style="
                            font-size:12px;color:var(--text-muted);
                            margin:0 0 14px;">
                            Your ID must start with 2 and be exactly 8 digits.
                        </div>

                        <div id="student-id-message"
                            class="modal-msg"
                            aria-live="polite">
                        </div>

                        <button class="modal-submit"
                            id="student-id-save"
                            type="submit">
                            Save Student ID →
                        </button>
                    </form>

                    <button type="button"
                        class="modal-cancel"
                        id="student-id-cancel">
                        Sign Out
                    </button>
                </div>
            `;

            document.body.appendChild(modal);
        }

        const form = modal.querySelector('#student-id-form');
        const input = modal.querySelector('#required-student-id');
        const message = modal.querySelector('#student-id-message');
        const saveBtn = modal.querySelector('#student-id-save');
        const cancelBtn = modal.querySelector('#student-id-cancel');

        if (modal.dataset.bound !== 'true') {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (modal.dataset.saving === 'true') return;

                const sid = input.value.trim();

                if (!/^2[0-9]{7}$/.test(sid)) {
                    message.style.color = 'var(--error)';
                    message.textContent = 'Student ID must start with 2 and be exactly 8 digits.';
                    return;
                }

                modal.dataset.saving = 'true';
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';

                try {
                    const { data: savedSid, error } = await window.db.rpc('set_student_id', {
                        p_student_id: sid
                    });

                    if (error) throw error;

                    window.currentProfile = {
                        ...(window.currentProfile || {}),
                        student_id: savedSid || sid
                    };

                    message.style.color = 'var(--success)';
                    message.textContent = 'Student ID saved successfully!';

                    modal.classList.remove('open');

                    renderHeaderProfile(window.currentProfile);

                    const resolve = window._studentIdModalResolve;
                    window._studentIdModalResolve = null;
                    if (resolve) resolve(true);

                } catch (err) {
                    console.error(err);
                    message.style.color = 'var(--error)';
                    message.textContent = err.message || 'Unable to save. Please retry.';

                } finally {
                    modal.dataset.saving = 'false';
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Student ID →';
                }
            });

            cancelBtn.addEventListener('click', async () => {
                await window.signOutUser();
            });

            modal.dataset.bound = 'true';
        }

        input.value = '';
        message.textContent = '';
        modal.classList.add('open');
        input.focus();

        return await new Promise(resolve => {
            window._studentIdModalResolve = resolve;
        });

    } finally {
        window._studentIdPromptOpen = false;
    }
};

window.signOutUser = async function() {
    if (window._signingOut) return;
    window._signingOut = true;

    const btn = document.getElementById('profile-signout-btn');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Signing out...';
    }

    try {
        try {
            const { error } = await window.db.auth.signOut({
                scope: 'local'
            });

            if (error) {
                console.warn('Supabase sign-out warning:', error.message);
            }
        } catch (err) {
            console.warn('Sign-out request failed:', err);
        }

        try {
            const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
            const authStorageKey = `sb-${projectRef}-auth-token`;
            localStorage.removeItem(authStorageKey);
        } catch (err) {
            console.warn('Local storage cleanup warning:', err);
        }

        try {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('qcache_')) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (err) {
            console.warn('Cache cleanup warning:', err);
        }

        window.currentUser = null;
        window.currentProfile = null;
        window.unlockedCourses = [];
        window.pendingRequests = [];

        window.location.replace(REDIRECT_URL);

    } catch (err) {
        console.error('Sign-out error:', err);

        window._signingOut = false;

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sign Out';
        }

        alert('Sign-out failed: ' + (err.message || err));
    }
};

/* ====================== INIT SESSION, AUTO-EXPIRY & DEVICE CHECK ====================== */
window.initAuth = async function() {
    injectAuthUI();

    if (window.location.hash.includes('type=recovery')) {
        window._isPasswordRecovery = true;
    }

    window.db.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            window._isPasswordRecovery = true;
            window.currentUser = session?.user || window.currentUser;
            openAuthModal('reset');
        }
    });

    const { data: { session } } = await window.db.auth.getSession();

    window.currentUser = session?.user || null;
    window.currentProfile = null;
    window.unlockedCourses = [];
    window.pendingRequests = [];

    if (window._isPasswordRecovery) {
        openAuthModal('reset');
    }

    if (window.currentUser) {

        // 1. Check automatic global and per-student access expiry before registering the device.
        try {
            const [{ data: expiryRan, error: expiryError }, { data: studentExpiryRan, error: studentExpiryError }] =
                await Promise.all([
                    window.db.rpc('check_and_run_expiry'),
                    window.db.rpc('check_and_run_student_expiry')
                ]);

            if (expiryError) {
                console.error('Global auto-expiry check failed:', expiryError);
            }
            if (studentExpiryError) {
                console.error('Student auto-expiry check failed:', studentExpiryError);
            }

            if (expiryRan === true || studentExpiryRan === true) {
                console.info('Automatic expiry reset completed.');

                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith('qcache_')) {
                        sessionStorage.removeItem(key);
                    }
                });
            }
        } catch (err) {
            console.error('Auto-expiry request failed:', err);
        }

        // 2. Register this device.
        const { data: devCheck, error: devErr } =
            await window.db.rpc('register_device', {
                p_device_id: getDeviceId()
            });

        if (!devErr && devCheck &&
            devCheck.allowed === false &&
            devCheck.reason === 'limit_reached') {

            await window.db.auth.signOut();

            window.currentUser = null;
            renderHeaderProfile(null);
            updateHomeCourseCards();

            openAuthModal(
                'signin',
                `⛔ Device Limit Reached (Max ${devCheck.max} devices). This account is already active on 2 other devices. Contact admin if you switched devices.`
            );

            return {
                user: null,
                unlockedCourses: [],
                deviceBlocked: true
            };
        }

        // 3. Load the updated profile and pending requests.
        const [{ data: profile }, { data: pending }] = await Promise.all([
            window.db
                .from('profiles')
                .select('unlocked_courses, student_id, access_expires_at')
                .eq('id', window.currentUser.id)
                .maybeSingle(),

            window.db
                .from('payment_requests')
                .select('*')
                .eq('user_id', window.currentUser.id)
                .eq('status', 'pending')
        ]);

        window.currentProfile = profile || null;

        const rawCourses = Array.isArray(profile?.unlocked_courses)
            ? profile.unlocked_courses
            : [];

        window.unlockedCourses = rawCourses.map(c =>
            String(c).toLowerCase()
        );

        window.pendingRequests = Array.isArray(pending)
            ? pending
            : [];

        // 4. Check the student's ID (skip if currently resetting password).
        const savedStudentId = String(profile?.student_id || '').trim();

        if (!window._isPasswordRecovery && !/^2[0-9]{7}$/.test(savedStudentId)) {
            await promptMissingStudentId();
        }

        // 5. Update the website interface.
        const activeProfile = window.currentProfile || profile;

        renderHeaderProfile(activeProfile);
        updateHomeCourseCards();

        return {
            user: window.currentUser,
            unlockedCourses: window.unlockedCourses,
            deviceBlocked: false
        };
    }

    renderHeaderProfile(null);
    updateHomeCourseCards();

    return {
        user: null,
        unlockedCourses: [],
        deviceBlocked: false
    };
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
