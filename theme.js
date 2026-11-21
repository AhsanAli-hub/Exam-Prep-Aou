/*
 * Shared light/dark theme handling for every page.
 *
 * The chosen theme is stored in a site-wide cookie ("theme"), so the home
 * page and all course pages always read the same value. Light is the default
 * until the student picks dark with the theme button.
 *
 * Load this file synchronously in <head> (before any stylesheet paints) so
 * the correct theme is applied without a flash.
 */
(function () {
    var COOKIE = 'theme';
    var ONE_YEAR = 60 * 60 * 24 * 365;

    function readCookie() {
        var match = document.cookie.match(/(?:^|;\s*)theme=(light|dark)(?:;|$)/);
        return match ? match[1] : null;
    }

    function writeCookie(value) {
        var cookie = COOKIE + '=' + value + '; path=/; max-age=' + ONE_YEAR + '; SameSite=Lax';
        if (location.protocol === 'https:') cookie += '; Secure';
        document.cookie = cookie;
    }

    function currentTheme() {
        var saved = readCookie();
        if (saved) return saved;
        // One-time migration from the old per-browser localStorage setting.
        try {
            var legacy = localStorage.getItem('theme');
            if (legacy === 'dark' || legacy === 'light') {
                writeCookie(legacy);
                localStorage.removeItem('theme');
                return legacy;
            }
        } catch (e) {}
        return 'light';
    }

    function updateButton(theme) {
        var btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        var label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
    }

    function applyTheme(theme) {
        var root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.style.colorScheme = theme;
        updateButton(theme);
    }

    window.toggleTheme = function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        writeCookie(next);
        applyTheme(next);
    };

    // Apply immediately (in <head>) to avoid a flash of the wrong theme.
    applyTheme(currentTheme());

    // Set the button icon once the page body exists.
    document.addEventListener('DOMContentLoaded', function () { applyTheme(currentTheme()); });

    // Re-check when returning via the back button (page restored from cache)
    // or switching back to a tab, so a change made on another page shows here too.
    window.addEventListener('pageshow', function () { applyTheme(currentTheme()); });
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) applyTheme(currentTheme());
    });
})();
