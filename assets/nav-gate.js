/* Remember me: if the visitor signed in with "Remember me" unticked, sign them out once the
   browser has been closed. pushinn_alive is a cookie with no expiry, so the browser drops it on
   close; if the flag is set and the cookie is gone, the saved sign-in is cleared. */
(function () {
  try {
    if (localStorage.getItem('pushinn_remember') !== '0') return;
    if (document.cookie.indexOf('pushinn_alive=1') !== -1) return;
    var gone = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-.+-auth-token/.test(k)) gone.push(k);
    }
    gone.forEach(function (k) { localStorage.removeItem(k); });
    localStorage.removeItem('pushinn_remember');
  } catch (e) { /* leave sign-in alone */ }
})();

/* Remember the page's Supabase client so the nav can ask "is this account an admin?"
   without a second copy of the project key. If anything here fails, the Admin link
   simply doesn't appear. */
(function () {
  var lib;
  try {
    Object.defineProperty(window, 'supabase', {
      configurable: true,
      get: function () { return lib; },
      set: function (x) {
        lib = x;
        try {
          if (x && typeof x.createClient === 'function') {
            var orig = x.createClient;
            x.createClient = function () { var c = orig.apply(this, arguments); window.__pushinnDb = c; return c; };
          }
        } catch (e) { /* leave it alone */ }
      }
    });
  } catch (e) { /* ignore */ }
})();

/* Hide the Union link in the nav until the visitor is signed in.
   Cosmetic only: the Union page itself sends signed-out visitors to sign-in,
   and its data is protected by the database, not by this script. */
(function () {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k) && localStorage.getItem(k)) return;
    }
  } catch (e) { return; }
  var st = document.createElement('style');
  st.textContent = 'nav a[href="/union"]{display:none!important}';
  document.head.appendChild(st);
})();

/* Account cog menu: open/close the dropdown in the nav. */
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('nav-cog-btn');
  var menu = document.getElementById('nav-cog-menu');
  if (!btn || !menu) return;
  function set(open) {
    menu.classList.toggle('hidden', !open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(menu.classList.contains('hidden')); });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
});

/* Admin link in the cog menu: only for accounts the database says are admins. */
window.addEventListener('load', function () {
  var menu = document.getElementById('nav-cog-menu');
  var db = window.__pushinnDb;
  if (!menu || !db) return;
  function add() {
    if (document.getElementById('nav-admin-link')) return;
    var a = document.createElement('a');
    a.id = 'nav-admin-link'; a.href = '/admin'; a.setAttribute('role', 'menuitem');
    a.className = 'block px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/5';
    a.textContent = 'Admin';
    var out = document.getElementById('nav-logout-btn');
    menu.insertBefore(a, out);
    var mout = document.getElementById('mobile-logout-btn');
    if (mout) {
      var m = document.createElement('a');
      m.href = '/admin'; m.textContent = 'Admin';
      m.className = 'text-xs font-mono px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-white uppercase mr-2';
      mout.parentNode.insertBefore(m, mout);
    }
  }
  db.auth.getSession().then(function (r) {
    var u = r && r.data && r.data.session && r.data.session.user;
    if (!u) return;
    var key = 'pushinn_is_admin_' + u.id, cached = null;
    try { cached = sessionStorage.getItem(key); } catch (e) {}
    if (cached === '1') { add(); return; }
    if (cached === '0') return;
    return db.rpc('is_admin').then(function (res) {
      var ok = res && res.data === true;
      try { sessionStorage.setItem(key, ok ? '1' : '0'); } catch (e) {}
      if (ok) add();
    });
  }).catch(function () {});
});

/* Mobile menu: below tablet width the page links are hidden, so add a hamburger
   that opens them as a list. Built from the links already in the nav, so every
   page stays in step. On pages where the sign-in area is hidden on phones, the
   menu also carries Sign in, or Settings / Admin / Sign out. */
document.addEventListener('DOMContentLoaded', function () {
  var nav = document.querySelector('nav');
  if (!nav || document.getElementById('mobile-menu-button')) return; /* these pages already have a mobile menu */
  var row = nav.querySelector('.justify-between');
  var desk = nav.querySelector('.hidden.md\\:flex');
  if (!row || !desk) return;
  var seen = {}, links = [];
  desk.querySelectorAll('a[href]').forEach(function (a) {
    if (a.closest('#nav-auth-container')) return;
    var h = a.getAttribute('href');
    if (!/^\/(building|devlog|union|support|roadmap)?$/.test(h) || seen[h]) return;
    seen[h] = 1; links.push(a);
  });
  if (!links.length) return;

  var btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'nav-burger-btn';
  btn.setAttribute('aria-label', 'Menu'); btn.setAttribute('aria-expanded', 'false');
  btn.className = 'md:hidden flex items-center justify-center w-9 h-9 ml-2 rounded-full border border-gray-700 bg-surface text-gray-300 hover:text-matrix hover:border-matrix/60 transition-colors';
  var ico = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="w-5 h-5" aria-hidden="true">';
  var openIco = ico + '<path d="M4 7h16M4 12h16M4 17h16"/></svg>', closeIco = ico + '<path d="M6 6l12 12M18 6L6 18"/></svg>';
  btn.innerHTML = openIco;
  var last = row.lastElementChild;
  (last && last.offsetParent !== null ? last : row).appendChild(btn);

  var panel = document.createElement('div');
  panel.id = 'nav-burger-panel';
  panel.className = 'hidden md:hidden border-t border-white/10 py-2';
  nav.firstElementChild.appendChild(panel);
  var cls = 'block px-1 py-3 font-mono text-sm uppercase tracking-wider text-gray-300 hover:text-matrix';
  function item(label, href, onclick, active) {
    var el = document.createElement(href ? 'a' : 'button');
    if (href) el.href = href; else { el.type = 'button'; el.style.textAlign = 'left'; el.style.width = '100%'; }
    el.className = cls + (active ? ' text-matrix' : '');
    el.textContent = label;
    if (onclick) el.addEventListener('click', onclick);
    panel.appendChild(el);
  }
  function build() {
    panel.textContent = '';
    links.forEach(function (a) {
      var h = a.getAttribute('href');
      var here = h === location.pathname || (h !== '/' && location.pathname.indexOf(h) === 0);
      item(a.textContent.trim(), h, null, here);
    });
    var auth = document.getElementById('nav-auth-container');
    if (auth && auth.offsetParent === null) {
      var badge = document.getElementById('nav-user-badge');
      if (badge && !badge.classList.contains('hidden')) {
        item('Settings', '/settings');
        if (document.getElementById('nav-admin-link')) item('Admin', '/admin');
        item('Sign out', null, function () { var b = document.getElementById('nav-logout-btn'); if (b) b.click(); });
      } else {
        var login = document.getElementById('nav-login-link');
        if (login) item('Sign in', login.getAttribute('href'));
      }
    }
  }
  function set(open) {
    if (open) build();
    panel.classList.toggle('hidden', !open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.innerHTML = open ? closeIco : openIco;
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(panel.classList.contains('hidden')); });
  document.addEventListener('click', function (e) { if (!panel.contains(e.target) && e.target !== btn) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 768) set(false); });
});
