    const _supabaseUrl = 'https://hbwycwbmkarztmodssyc.supabase.co';
    const _supabaseKey = ['sb_publishable', 'l_vkhikI4yoBWubK0MGL9Q_5wxWDEIg'].join('_'); // gitleaks:allow — Supabase publishable key, safe for client code
    const db = window.supabase.createClient(_supabaseUrl, _supabaseKey);

    const settingsContent = document.getElementById('settings-content');
    const authEmailSpan = document.getElementById('authenticated-email');
    const navLoginLink = document.getElementById('nav-login-link');
    const navUserBadge = document.getElementById('nav-user-badge');
    const navUserEmail = document.getElementById('nav-user-email');
    const navLogoutBtn = document.getElementById('nav-logout-btn');
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
    function leaveSignedOut() {
      settingsContent.classList.add('hidden');
      updateNavAuth(null);
      location.replace('/login?redirect=/settings');
    }
    async function checkAuth() {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (!(session && session.user && session.user.email)) { leaveSignedOut(); return null; }
        updateNavAuth(session.user);
        authEmailSpan.textContent = session.user.email;
        settingsContent.classList.remove('hidden');
        loadAccount();
        return session.user;
      } catch (err) { console.error('Auth verification error:', err); leaveSignedOut(); return null; }
    }
    async function handleSignOut() { await db.auth.signOut(); window.location.href = '/login'; }
    if (navLogoutBtn) navLogoutBtn.addEventListener('click', handleSignOut);
    db.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') leaveSignedOut(); });

    function el(tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined && text !== null) n.textContent = text;
      return n;
    }
    function friendlyError(error) {
      const m = (error && error.message) || '';
      if (m.includes('TOO_MANY_REPORTS')) return "You've filed 10 reports today. Add to an existing one, or try again tomorrow.";
      if (m.includes('ACCOUNT_SUSPENDED')) return "This account can't post right now. Contact admin@pushinn.app.";
      if (m.includes('SIGN_IN_REQUIRED')) return 'Your session ended. Sign in again.';
      if (m.includes('TOO_MANY_IDEAS')) return "You've posted 5 ideas today. Vote on others, or try again tomorrow.";
      if (m.includes('IDEA_CLOSED')) return 'Voting on this idea has finished.';
      if (m.includes('IDEA_NOT_FOUND')) return 'That idea was removed. Refresh the page.';
      if (m.includes('suggestions_shape')) return 'Check the fields: the title needs at least 5 characters.';
      if (m.includes('BALLOT_CLOSED')) return 'This vote has ended.';
      if (m.includes('BALLOT_NOT_FOUND')) return 'That vote was removed. Refresh the page.';
      if (m.includes('INVALID_OPTIONS')) return 'Give 2 to 6 options, each up to 120 characters.';
      if (m.includes('ADMIN_REQUIRED')) return 'Only admins can do that.';
      if (m.includes('ADMIN_PROTECTED')) return "Admins can't be banned, and one admin can't remove another. An admin can step down themselves.";
      if (m.includes('LAST_ADMIN')) return "The last admin can't be removed. Make someone else an admin first.";
      if (m.includes('dao_ballots_shape')) return 'The question needs at least 5 characters.';
      if (m.includes('dao_announcements_shape')) return 'The headline needs at least 3 characters and the update at least 5.';
      if (m.includes('bug_reports_shape')) return 'Check the fields: the summary needs at least 5 characters.';
      return 'That didn\'t go through. Check your connection, or email admin@pushinn.app.';
    }

    // ACCOUNT (Stage 5): username, email, password, delete. Same calls as
    // the app: the username goes on user_profiles (the database checks the
    // rules and lookalikes) and on the member's spots; delete runs
    // delete_user_account, which signs the account out everywhere.
    let acctUser = null;
    function acctMsg(id, text, ok) {
      const m = document.getElementById(id);
      m.textContent = text;
      m.className = 'text-sm sm:mr-auto ' + (ok ? 'text-matrix' : 'text-red-400');
    }
    async function loadAccount() {
      const { data } = await db.auth.getUser();
      acctUser = data && data.user;
      if (!acctUser) return;
      document.getElementById('acct-email').textContent = acctUser.email || '–';
      const { data: prof } = await db.from('user_profiles').select('username').eq('id', acctUser.id).maybeSingle();
      document.getElementById('acct-username').textContent = prof && prof.username ? '@' + prof.username : 'Not set yet';
    }
    function usernameProblem(name) {
      if (name.length < 3 || name.length > 20) return 'Usernames are 3 to 20 characters.';
      if (!/^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$/.test(name)) return 'Use letters, numbers, - and _ only (not at the start or end).';
      return null;
    }
    document.getElementById('acct-username-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      const raw = document.getElementById('acct-username-input').value.trim();
      const name = raw.toLowerCase();
      const problem = usernameProblem(name);
      if (problem) { acctMsg('acct-username-msg', problem, false); return; }
      if (!acctUser) await loadAccount();
      btn.disabled = true;
      acctMsg('acct-username-msg', 'Saving…', true);
      const res = await db.from('user_profiles').update({ username: name, display_name: raw }).eq('id', acctUser.id).select('id');
      if (res.error || !res.data || !res.data.length) {
        btn.disabled = false;
        const er = res.error || {};
        acctMsg('acct-username-msg', er.code === '23505' ? 'That username is taken.' : er.code === '23514' ? er.message : res.error ? friendlyError(er) : 'Not saved. Sign in again and retry.', false);
        return;
      }
      const spots = await db.from('map_posts').update({ user_name: raw }).eq('user_id', acctUser.id);
      btn.disabled = false;
      e.target.reset();
      document.getElementById('acct-username').textContent = '@' + name;
      acctMsg('acct-username-msg', spots.error ? 'Saved, but your spots still show the old name. Try again later.' : 'Saved. You are now @' + name + '.', !spots.error);
    });
    document.getElementById('acct-email-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      const email = document.getElementById('acct-email-input').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { acctMsg('acct-email-msg', 'Enter a full email address.', false); return; }
      if (acctUser && email.toLowerCase() === (acctUser.email || '').toLowerCase()) { acctMsg('acct-email-msg', "That's already your email.", false); return; }
      btn.disabled = true;
      acctMsg('acct-email-msg', 'Sending…', true);
      const { data, error } = await db.auth.updateUser({ email }, { emailRedirectTo: location.origin + '/settings' });
      btn.disabled = false;
      if (error) { acctMsg('acct-email-msg', error.message || friendlyError(error), false); return; }
      e.target.reset();
      const u = data && data.user;
      if (u && u.email && u.email.toLowerCase() === email.toLowerCase()) {
        acctUser = u;
        document.getElementById('acct-email').textContent = u.email;
        acctMsg('acct-email-msg', 'Email changed.', true);
      } else acctMsg('acct-email-msg', 'Check your inbox for a link to confirm the change. Your email stays the same until you tap it.', true);
    });
    document.getElementById('acct-password-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      const p1 = document.getElementById('acct-pw1').value, p2 = document.getElementById('acct-pw2').value;
      if (p1.length < 6) { acctMsg('acct-password-msg', 'Use at least 6 characters.', false); return; }
      if (p1 !== p2) { acctMsg('acct-password-msg', "The two passwords don't match.", false); return; }
      btn.disabled = true;
      acctMsg('acct-password-msg', 'Saving…', true);
      const { error } = await db.auth.updateUser({ password: p1 });
      btn.disabled = false;
      if (error) { acctMsg('acct-password-msg', error.message || friendlyError(error), false); return; }
      e.target.reset();
      acctMsg('acct-password-msg', 'Password changed.', true);
    });
    const delStart = document.getElementById('acct-delete-start');
    const delForm = document.getElementById('acct-delete-form');
    const delInput = document.getElementById('acct-delete-input');
    const delGo = document.getElementById('acct-delete-go');
    delStart.addEventListener('click', () => { delStart.classList.add('hidden'); delForm.classList.remove('hidden'); delInput.value = ''; delGo.disabled = true; delInput.focus(); });
    document.getElementById('acct-delete-cancel').addEventListener('click', () => { delForm.classList.add('hidden'); delStart.classList.remove('hidden'); document.getElementById('acct-delete-msg').textContent = ''; });
    delInput.addEventListener('input', () => { delGo.disabled = delInput.value.trim().toUpperCase() !== 'DELETE'; });
    delForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (delInput.value.trim().toUpperCase() !== 'DELETE') return;
      delGo.disabled = true;
      delGo.textContent = 'Deleting…';
      const { error } = await db.rpc('delete_user_account');
      if (error) {
        delGo.disabled = false;
        delGo.textContent = 'Delete for good';
        document.getElementById('acct-delete-msg').textContent = "Couldn't delete it: " + friendlyError(error);
        return;
      }
      try { await db.auth.signOut(); } catch (err) { /* the account is already gone */ }
      location.replace('/union?deleted=1');
    });

    checkAuth();
  
