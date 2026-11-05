    (function () {
      const _supabaseUrl = 'https://hbwycwbmkarztmodssyc.supabase.co';
      const _supabaseKey = ['sb_publishable', 'l_vkhikI4yoBWubK0MGL9Q_5wxWDEIg'].join('_'); // gitleaks:allow — Supabase publishable key, safe for client code
      const db = window.supabase.createClient(_supabaseUrl, _supabaseKey);

      // Remember me: ticked (default) keeps you signed in on this device. Unticked signs you out
      // when the browser is closed (nav-gate.js does the sign-out on the next visit).
      function applyRememberChoice() {
        const box = document.getElementById('remember-me');
        const remember = !box || box.checked;
        try {
          if (remember) {
            localStorage.removeItem('pushinn_remember');
            document.cookie = 'pushinn_alive=; path=/; max-age=0; SameSite=Lax';
          } else {
            localStorage.setItem('pushinn_remember', '0');
            document.cookie = 'pushinn_alive=1; path=/; SameSite=Lax'; // no expiry: lasts until the browser closes
          }
        } catch (e) { /* storage blocked: default behaviour */ }
      }

      const loginForm = document.getElementById('login-form');
      const loginBtn = document.getElementById('login-btn');
      const errorMsg = document.getElementById('error-msg');
      const successMsg = document.getElementById('success-msg');
      const alreadyLoggedIn = document.getElementById('already-logged-in');
      const currentUserEmail = document.getElementById('current-user-email');
      const signoutBtn = document.getElementById('signout-btn');
      const navLoginLink = document.getElementById('nav-login-link');
      const navUserBadge = document.getElementById('nav-user-badge');
      const navUserEmail = document.getElementById('nav-user-email');
      const navLogoutBtn = document.getElementById('nav-logout-btn');
      const socialAuthSection = document.getElementById('social-auth-section');
      const googleSigninBtn = document.getElementById('google-signin-btn');
      const appleSigninBtn = document.getElementById('apple-signin-btn');

      function updateNavAuth(user) {
        if (user && user.email) {
          if (navLoginLink) navLoginLink.classList.add('hidden');
          if (navUserBadge) navUserBadge.classList.remove('hidden');
          if (navUserEmail) navUserEmail.textContent = user.email.split('@')[0];
        } else {
          if (navLoginLink) navLoginLink.classList.remove('hidden');
          if (navUserBadge) navUserBadge.classList.add('hidden');
        }
      }

      // Check destination query param - only allow same-origin relative paths starting with single '/'
      const urlParams = new URLSearchParams(window.location.search);
      function getSafeRedirect(raw) {
        if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) {
          return raw;
        }
        return '/union';
      }
      const redirectTarget = getSafeRedirect(urlParams.get('redirect'));

      // Check current session
      async function initSession() {
        try {
          const { data: { session } } = await db.auth.getSession();
          if (session && session.user) {
            // Accounts are not created from this page. If this Google/Apple sign-in has
            // just created a brand-new account, sign it straight back out.
            const cameFromOAuth = window.location.hash.includes('access_token') || window.location.search.includes('code=');
            const createdMs = Date.parse(session.user.created_at || '');
            if (cameFromOAuth && createdMs && Date.now() - createdMs < 5 * 60 * 1000) {
              await db.auth.signOut();
              updateNavAuth(null);
              errorMsg.innerHTML = 'We could not find an existing Pushinn account for that sign-in, so we have not signed you in.';
              errorMsg.classList.remove('hidden');
              history.replaceState(null, '', window.location.pathname);
              return;
            }
            currentUserEmail.textContent = `Signed in as: ${session.user.email}`;
            alreadyLoggedIn.classList.remove('hidden');
            loginForm.classList.add('hidden');
            if (socialAuthSection) socialAuthSection.classList.add('hidden');
            updateNavAuth(session.user);
            if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
              successMsg.textContent = 'Signed in successfully. Redirecting...';
              successMsg.classList.remove('hidden');
              setTimeout(() => {
                window.location.href = redirectTarget;
              }, 800);
            }
          } else {
            updateNavAuth(null);
          }
        } catch (err) {
          console.error('Session check error:', err);
          updateNavAuth(null);
        }
      }

      initSession();

      async function handleSignOut() {
        await db.auth.signOut();
        alreadyLoggedIn.classList.add('hidden');
        loginForm.classList.remove('hidden');
        if (socialAuthSection) socialAuthSection.classList.remove('hidden');
        updateNavAuth(null);
      }

      if (signoutBtn) signoutBtn.addEventListener('click', handleSignOut);
      if (navLogoutBtn) navLogoutBtn.addEventListener('click', handleSignOut);

      db.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          alreadyLoggedIn.classList.add('hidden');
          loginForm.classList.remove('hidden');
          if (socialAuthSection) socialAuthSection.classList.remove('hidden');
          updateNavAuth(null);
        } else if (session && session.user) {
          initSession();
        }
      });

      const rawRedirect = urlParams.get('redirect');
      const safeRedirectParam = (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('\\')) ? rawRedirect : null;
      const oauthRedirect = window.location.origin + '/login.html' + (safeRedirectParam ? '?redirect=' + encodeURIComponent(safeRedirectParam) : '');

      if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', async () => {
          errorMsg.classList.add('hidden');
          applyRememberChoice();
          try {
            const { error } = await db.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: oauthRedirect
              }
            });
            if (error) {
              errorMsg.textContent = error.message;
              errorMsg.classList.remove('hidden');
            }
          } catch (err) {
            errorMsg.textContent = 'Unable to initiate Google sign-in. Please try again.';
            errorMsg.classList.remove('hidden');
          }
        });
      }

      if (appleSigninBtn) {
        appleSigninBtn.addEventListener('click', async () => {
          errorMsg.classList.add('hidden');
          applyRememberChoice();
          try {
            const { error } = await db.auth.signInWithOAuth({
              provider: 'apple',
              options: {
                redirectTo: oauthRedirect
              }
            });
            if (error) {
              errorMsg.textContent = error.message;
              errorMsg.classList.remove('hidden');
            }
          } catch (err) {
            errorMsg.textContent = 'Unable to initiate Apple sign-in. Please try again.';
            errorMsg.classList.remove('hidden');
          }
        });
      }

      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          errorMsg.classList.add('hidden');
          successMsg.classList.add('hidden');

          const email = loginForm.elements['email'].value.trim();
          const password = loginForm.elements['password'].value;

          loginBtn.disabled = true;
          loginBtn.textContent = 'Signing in...';
          applyRememberChoice();

          try {
            const { data, error } = await db.auth.signInWithPassword({
              email: email,
              password: password
            });

            if (error) {
              errorMsg.textContent = error.message;
              errorMsg.classList.remove('hidden');
              loginBtn.disabled = false;
              loginBtn.textContent = 'Sign In';
            } else if (data && data.session) {
              successMsg.classList.remove('hidden');
              loginBtn.textContent = 'Signed In';
              setTimeout(() => {
                window.location.href = redirectTarget;
              }, 800);
            }
          } catch (err) {
            errorMsg.textContent = 'Network error. Please check your connection and try again.';
            errorMsg.classList.remove('hidden');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
          }
        });
      }
    })();
  
