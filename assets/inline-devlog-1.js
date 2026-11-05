    const _supabaseUrl = 'https://hbwycwbmkarztmodssyc.supabase.co';
    const _supabaseKey = ['sb_publishable', 'l_vkhikI4yoBWubK0MGL9Q_5wxWDEIg'].join('_'); // gitleaks:allow
    // The library is on the page as `supabase`, so the client needs a name of its own.
    const db = window.supabase.createClient(_supabaseUrl, _supabaseKey);

    // Members only: signed-out visitors are sent to sign-in and come back here afterwards.
    (function () {
      var main = document.querySelector('main');
      if (main) main.style.visibility = 'hidden';
      db.auth.getSession().then(function (r) {
        var session = r && r.data && r.data.session;
        if (session && session.user) { if (main) main.style.visibility = ''; }
        else { location.replace('/login?redirect=/devlog'); }
      }).catch(function () { location.replace('/login?redirect=/devlog'); });
    })();

    const supportForm = document.getElementById('support-form');
    if (supportForm) {
      supportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('support-submit-btn');
        const category = (supportForm.elements['category'] && supportForm.elements['category'].value) || 'Beta Feedback';
        const name = (supportForm.elements['name'].value || '').trim();
        const email = (supportForm.elements['email'].value || '').trim();
        const subject = (supportForm.elements['subject'].value || '').trim();
        const message = (supportForm.elements['message'].value || '').trim();
        const successMsg = document.getElementById('support-success-msg');
        const errorMsg = document.getElementById('support-error-msg');
        
        btn.textContent = 'Sending...';
        btn.disabled = true;
        successMsg.style.display = 'none';
        errorMsg.style.display = 'none';

        // The database refuses subjects over 150 characters; the tag adds up to 18.
        const taggedSubject = ('[' + category + '] ' + subject).slice(0, 150);

        // using contact_messages table for general support & beta tester feedback
        const { error } = await db
          .from('contact_messages')
          .insert([{ username: name, email: email, subject: taggedSubject, message: message }]);

        btn.disabled = false;
        btn.textContent = 'Send Message';

        if (error) {
          errorMsg.style.display = 'block';
          console.error('Supabase error:', error);
        } else {
          successMsg.style.display = 'block';
          supportForm.reset();
        }
      });
    }

    // Mobile menu toggle & close on link tap
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
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
    }

    // Navbar session management
    (function() {
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

          // Auto-fill support form fields if empty
          const nameInput = document.getElementById('support-name');
          const emailInput = document.getElementById('support-email');
          if (nameInput && !nameInput.value) nameInput.value = handle;
          if (emailInput && !emailInput.value) emailInput.value = user.email;
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
  
