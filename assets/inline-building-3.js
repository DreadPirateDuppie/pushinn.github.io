    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIconOpen = mobileMenuButton.querySelector('svg:first-child');
    const menuIconClose = mobileMenuButton.querySelector('svg:last-child');

    function toggleMenu(show) {
      const isExpanded = typeof show === 'boolean' ? show : mobileMenu.classList.contains('hidden');
      mobileMenuButton.setAttribute('aria-expanded', isExpanded);
      if (isExpanded) {
        mobileMenu.classList.remove('hidden');
        menuIconOpen.classList.add('hidden');
        menuIconClose.classList.remove('hidden');
      } else {
        mobileMenu.classList.add('hidden');
        menuIconOpen.classList.remove('hidden');
        menuIconClose.classList.add('hidden');
      }
    }

    mobileMenuButton.addEventListener('click', () => toggleMenu());
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    (function() {
      const _supabaseUrl = 'https://hbwycwbmkarztmodssyc.supabase.co';
      const _supabaseKey = ['sb_publishable', 'l_vkhikI4yoBWubK0MGL9Q_5wxWDEIg'].join('_'); // gitleaks:allow
      const db = window.supabase ? window.supabase.createClient(_supabaseUrl, _supabaseKey) : null;
      if (!db) return;

      const navLoginLink = document.getElementById('nav-login-link');
      const navUserBadge = document.getElementById('nav-user-badge');
      const navUserEmail = document.getElementById('nav-user-email');
      const navLogoutBtn = document.getElementById('nav-logout-btn');

      const mobileLoginLink = document.getElementById('mobile-login-link');
      const mobileUserBadge = document.getElementById('mobile-user-badge');
      const mobileUserEmail = document.getElementById('mobile-user-email');
      const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

      function updateNav(user) {
        if (user && user.email) {
          const handle = user.email.split('@')[0];
          if (navLoginLink) navLoginLink.classList.add('hidden');
          if (navUserBadge) navUserBadge.classList.remove('hidden');
          if (navUserEmail) navUserEmail.textContent = handle;

          if (mobileLoginLink) mobileLoginLink.classList.add('hidden');
          if (mobileUserBadge) mobileUserBadge.classList.remove('hidden');
          if (mobileUserEmail) mobileUserEmail.textContent = handle;
        } else {
          if (navLoginLink) navLoginLink.classList.remove('hidden');
          if (navUserBadge) navUserBadge.classList.add('hidden');

          if (mobileLoginLink) mobileLoginLink.classList.remove('hidden');
          if (mobileUserBadge) mobileUserBadge.classList.add('hidden');
        }
      }

      async function checkSession() {
        try {
          const { data: { session } } = await db.auth.getSession();
          updateNav(session ? session.user : null);
        } catch (e) {
          console.error('Session error:', e);
        }
      }

      checkSession();

      async function handleSignOut() {
        await db.auth.signOut();
        window.location.reload();
      }

      if (navLogoutBtn) navLogoutBtn.addEventListener('click', handleSignOut);
      if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleSignOut);

      db.auth.onAuthStateChange((event, session) => {
        updateNav(session ? session.user : null);
      });
    })();
  
document.querySelectorAll('[data-screen]').forEach(function (b) {
  b.addEventListener('click', function () { setScreen(parseInt(b.getAttribute('data-screen'), 10)); });
});
