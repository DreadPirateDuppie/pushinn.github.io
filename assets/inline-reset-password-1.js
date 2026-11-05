    (function () {
      const API = 'https://hbwycwbmkarztmodssyc.supabase.co/auth/v1';
      const KEY = 'sb_publishable_l_vkhikI4yoBWubK0MGL9Q_5wxWDEIg'; // gitleaks:allow — Supabase publishable key, safe for client code
      const tokenHash = new URLSearchParams(location.search).get('token_hash');

      const form = document.getElementById('reset-form');
      const errorEl = document.getElementById('error');
      const button = document.getElementById('submit');
      const show = (id) => document.getElementById(id).classList.remove('hidden');

      if (!tokenHash) {
        show('no-link');
        const reqForm = document.getElementById('request-form');
        const reqError = document.getElementById('request-error');
        const reqButton = document.getElementById('request-submit');
        reqForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          reqError.classList.add('hidden');
          const email = document.getElementById('request-email').value.trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            reqError.textContent = 'Enter a valid email address.';
            reqError.classList.remove('hidden');
            return;
          }
          reqButton.disabled = true;
          try {
            const res = await fetch(API + '/recover', {
              method: 'POST',
              headers: { 'apikey': KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            if (res.status === 429) {
              reqError.textContent = 'Too many requests. Wait a minute and try again.';
              reqError.classList.remove('hidden');
              reqButton.disabled = false;
              return;
            }
            // Same answer whether or not the address has an account, so this page can't be used to find out who has one.
            reqForm.classList.add('hidden');
            document.getElementById('request-done').classList.remove('hidden');
          } catch (e) {
            reqError.textContent = "Couldn't reach Pushinn. Check your connection and try again.";
            reqError.classList.remove('hidden');
            reqButton.disabled = false;
          }
        });
        return;
      }
      show('reset-form');
      // Keep the token out of the address bar and browser history.
      history.replaceState(null, '', location.pathname);

      // The link is only spent when the form is sent, so a mail scanner
      // opening it doesn't use it up. One sign-in per link: kept for a retry.
      let accessToken = null;

      function fail(message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        button.disabled = false;
      }

      async function call(method, path, body, token) {
        const headers = { 'apikey': KEY, 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(API + path, { method, headers, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorEl.classList.add('hidden');
        const password = document.getElementById('password').value;
        if (password.length < 6) return fail('Use at least 6 characters.');
        if (password !== document.getElementById('confirm').value) return fail("Those two don't match.");

        button.disabled = true;
        try {
          if (!accessToken) {
            const verified = await call('POST', '/verify', { type: 'recovery', token_hash: tokenHash });
            if (!verified.ok || !verified.data.access_token) {
              return fail('This link has expired or was already used. Ask for a new one from the app.');
            }
            accessToken = verified.data.access_token;
          }
          const updated = await call('PUT', '/user', { password }, accessToken);
          if (!updated.ok) {
            return fail(updated.data.msg || updated.data.message || "Couldn't save that password. Try a different one.");
          }
          form.classList.add('hidden');
          show('done');
        } catch (e) {
          fail("Couldn't reach Pushinn. Check your connection and try again.");
        }
      });
    })();
  
