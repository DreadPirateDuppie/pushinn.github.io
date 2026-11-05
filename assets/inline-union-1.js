    const _supabaseUrl = 'https://hbwycwbmkarztmodssyc.supabase.co';
    const _supabaseKey = ['sb_publishable', 'l_vkhikI4yoBWubK0MGL9Q_5wxWDEIg'].join('_'); // gitleaks:allow — Supabase publishable key, safe for client code
    const db = window.supabase.createClient(_supabaseUrl, _supabaseKey);

    // APP CONTEXT: the app's "Report a bug" opens /dao?from=app&app=…&os=….
    // Keep the version and system in this browser (they survive signing in)
    // and send them with each report. Labels only; the database trims them.
    const APP_KEY = 'pushinn_dao_app';
    (function captureAppContext() {
      const q = new URLSearchParams(location.search);
      if (q.get('from') !== 'app') return;
      const clean = (v, n) => (v || '').replace(/[^\w .()\-]/g, '').trim().slice(0, n);
      try {
        localStorage.setItem(APP_KEY, JSON.stringify({ app: clean(q.get('app'), 40), os: clean(q.get('os'), 60), at: Date.now() }));
      } catch (e) { /* private mode: carry on without it */ }
      ['from', 'app', 'os'].forEach(k => q.delete(k));
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    })();
    function appContext() {
      try {
        const c = JSON.parse(localStorage.getItem(APP_KEY) || 'null');
        if (!c || Date.now() - c.at > 30 * 86400000) return {};
        return { app: c.app || null, os: c.os || null };
      } catch (e) { return {}; }
    }

    // GATE & SESSION LOGIC
    const gateSection = document.getElementById('gate-section');
    const daoContent = document.getElementById('dao-content');
    const authEmailSpan = document.getElementById('authenticated-email');
    const logoutBtn = document.getElementById('gate-logout-btn');
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

    // Signed-out visitors are not shown the Union: they go straight to sign-in.
    // The one exception is the page an account deletion lands on (?deleted=1),
    // which shows only the "account deleted" notice.
    const cameDeleted = new URLSearchParams(location.search).get('deleted') === '1';
    function leaveSignedOut() {
      document.getElementById('hero').classList.add('hidden');
      daoContent.classList.add('hidden');
      updateNavAuth(null);
      if (cameDeleted) { gateSection.classList.remove('hidden'); return; }
      gateSection.classList.add('hidden');
      location.replace('/login?redirect=/union');
    }

    async function checkAuth() {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (session && session.user && session.user.email) {
          authEmailSpan.textContent = session.user.email;
          document.getElementById('dao-handle').textContent = ', ' + session.user.email.split('@')[0];
          document.getElementById('hero').classList.add('hidden');
          gateSection.classList.add('hidden');
          daoContent.classList.remove('hidden');
          updateNavAuth(session.user);
          onSignedIn();
          return session.user;
        } else {
          leaveSignedOut();
          return null;
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        leaveSignedOut();
        return null;
      }
    }

    async function handleSignOut() {
      await db.auth.signOut();
      window.location.href = '/login?redirect=/union';
    }

    if (logoutBtn) logoutBtn.addEventListener('click', handleSignOut);
    if (navLogoutBtn) navLogoutBtn.addEventListener('click', handleSignOut);

    db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        leaveSignedOut();
      } else if (session && session.user) {
        checkAuth();
      }
    });

    // TAB SWITCHING
    const tabButtons = document.querySelectorAll('.tab-btn');
    function showTab(id) {
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== id));
      tabButtons.forEach(b => b.classList.toggle('p-tab-on', b.dataset.tab === id));
      if (id === 'tab-suggestions') loadSuggestions();
      if (id === 'tab-governance') loadVotes();
    }
    tabButtons.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

    // SHARED HELPERS (all text goes in through textContent, never as HTML)
    function el(tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined && text !== null) n.textContent = text;
      return n;
    }
    const STATUS = {
      new:    { label: 'New',    cls: 'border-white/15 text-white/50' },
      seen:   { label: 'Seen',   cls: 'border-white/30 text-white/80' },
      fixing: { label: 'Fixing', cls: 'border-matrix/40 text-matrix' },
      fixed:  { label: 'Fixed',  cls: 'border-matrix text-matrix' }
    };
    function statusPill(s) {
      const st = STATUS[s] || STATUS.new;
      const pill = el('span', 'p-status ' + st.cls);
      const dot = el('span', 'dot' + (s === 'fixing' ? ' animate-pulse' : ''));
      pill.append(dot, document.createTextNode(s === 'fixed' ? '✓ ' + st.label : st.label));
      if (s === 'fixed') dot.remove();
      return pill;
    }
    function ago(iso) {
      const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
      if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
      if (s < 86400) return Math.round(s / 3600) + 'h ago';
      return Math.round(s / 86400) + 'd ago';
    }
    function peopleText(n) { return n === 1 ? '1 person' : n + ' people'; }
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

    // Plain wording for one admin_audit_list row.
    function auditText(a) {
      const d = a.detail || {};
      switch (a.action) {
        case 'made_admin': return 'Made admin';
        case 'removed_admin': return 'Admin rights removed';
        case 'banned': return 'Banned' + (d.reason ? ': ' + d.reason : '');
        case 'unbanned': return 'Unbanned';
        case 'verified': return 'Verified';
        case 'unverified': return 'Verified badge removed';
        case 'allowed_posting': return 'Allowed to post';
        case 'stopped_posting': return 'Stopped from posting';
        case 'points_changed': return 'Points ' + fmt(Number(d.from) || 0) + ' → ' + fmt(Number(d.to) || 0);
        default: return a.action;
      }
    }

    // BUG BOARD
    const bugSummary = document.getElementById('bug-summary');
    const bugDevice = document.getElementById('bug-device');
    const bugList = document.getElementById('bug-list');
    const bugListTitle = document.getElementById('bug-list-title');
    const bugListStatus = document.getElementById('bug-list-status');
    const bugForm = document.getElementById('bug-form');
    const bugFormTitle = document.getElementById('bug-form-title');
    const bugMsg = document.getElementById('bug-msg');
    const DEVICE_KEY = 'pushinn_dao_device';
    let bugCategory = 'Spots & Map';

    bugDevice.value = localStorage.getItem(DEVICE_KEY) || '';
    (function showAppContext() {
      const c = appContext();
      const parts = [c.app && 'v' + c.app, c.os].filter(Boolean);
      if (parts.length === 0) return;
      const line = document.getElementById('app-context');
      line.textContent = 'From the app: ' + parts.join(' · ') + '. Sent with your report.';
      line.classList.remove('hidden');
      bugDevice.placeholder = 'Phone model, e.g. iPhone 15 Pro';
    })();
    bugDevice.addEventListener('change', () => localStorage.setItem(DEVICE_KEY, bugDevice.value.trim()));

    document.querySelectorAll('.cat-chip').forEach(c => c.addEventListener('click', () => {
      bugCategory = c.dataset.value;
      document.querySelectorAll('.cat-chip').forEach(x => x.classList.toggle('p-chip-on', x === c));
    }));

    function needDevice() {
      if (bugDevice.value.trim()) return false;
      bugDevice.focus();
      bugDevice.placeholder = 'Add your phone first, e.g. iPhone 15 Pro, iOS 18';
      bugDevice.parentElement.classList.add('bg-red-500/10');
      setTimeout(() => bugDevice.parentElement.classList.remove('bg-red-500/10'), 2500);
      return true;
    }

    function showBugMsg(text, ok) {
      bugMsg.textContent = text;
      bugMsg.className = 'text-sm sm:mr-auto ' + (ok ? 'text-matrix' : 'text-red-400');
      bugMsg.style.display = 'block';
    }

    function renderReport(r) {
      const row = el('div', 'flex gap-4 p-4 sm:p-5' + (r.status === 'fixed' && !r.i_hit ? ' opacity-60 hover:opacity-100 transition-opacity' : ''));

      // The count is the button: tap it to add yourself to the bug.
      const btn = el('button', 'hit-btn');
      btn.type = 'button';
      const n = el('span', 'n');
      const t = el('span', 't');
      btn.append(n, t);
      function paint() {
        n.textContent = r.hits;
        btn.classList.toggle('on', r.i_hit || r.mine);
        btn.disabled = r.mine;
        if (r.mine) { t.textContent = 'Yours'; btn.title = 'You reported this'; }
        else if (r.i_hit) { t.textContent = '✓ You'; btn.title = 'Tap to take yourself off'; }
        else if (r.status === 'fixed') { t.textContent = 'Still?'; btn.title = 'Still happening to you? Tap to say so'; }
        else { t.textContent = 'Me too'; btn.title = "Tap if you've had this too"; }
        btn.setAttribute('aria-label', peopleText(r.hits) + ' had this. ' + btn.title);
      }
      btn.addEventListener('click', async () => {
        if (r.mine) return;
        if (!r.i_hit && needDevice()) return;
        btn.disabled = true;
        const call = r.i_hit
          ? db.rpc('remove_bug_hit', { p_report: r.id })
          : db.rpc('add_bug_hit', { p_report: r.id, p_device: bugDevice.value.trim(), p_app_version: appContext().app || null, p_os: appContext().os || null });
        const { data, error } = await call;
        btn.disabled = false;
        if (error) { bugListStatus.textContent = friendlyError(error); return; }
        r.i_hit = !r.i_hit;
        r.hits = data;
        paint();
        updateBugCounts();
      });
      paint();
      row.appendChild(btn);

      const body = el('div', 'min-w-0 flex-1');
      const top = el('div', 'flex items-start justify-between gap-3');
      const title = el('button', 'text-left text-white font-semibold leading-snug break-words hover:text-matrix transition-colors', r.summary);
      title.type = 'button';
      top.append(title, statusPill(r.status));
      body.appendChild(top);
      const meta = el('div', 'flex items-center gap-2 mt-1.5 text-xs text-white/50');
      meta.append(el('span', 'font-mono uppercase tracking-wider text-[10px] text-white/60', r.category), el('span', null, '·'), el('span', null, ago(r.created_at)));
      body.appendChild(meta);

      if (r.admin_note) {
        const note = el('div', 'mt-3 text-sm text-white/80 flex gap-2');
        note.append(el('span', 'p-label pt-0.5 shrink-0', 'Team'), el('span', 'break-words', r.admin_note));
        body.appendChild(note);
      }
      const steps = el('p', 'hidden mt-3 text-sm text-white/60 whitespace-pre-line break-words border-l border-white/10 pl-3', r.details);
      body.appendChild(steps);
      title.addEventListener('click', () => steps.classList.toggle('hidden'));
      row.appendChild(body);
      return row;
    }

    function renderStats(rows) {
      const open = rows.filter(r => r.status !== 'fixed').length;
      document.getElementById('stat-open').textContent = open;
      document.getElementById('stat-fixing').textContent = rows.filter(r => r.status === 'fixing').length;
      document.getElementById('stat-fixed').textContent = rows.filter(r => r.status === 'fixed').length;
    }

    // List filters, Reddit/GitHub style: Top (most reported, still open), New, Mine (filed or "me too"), Fixed.
    // The Open / Fixing / Fixed boxes up top are shortcuts into the same list.
    const BUG_FILTERS = {
      top:    { keep: r => r.status !== 'fixed', sort: (a, b) => b.hits - a.hits || byNewest(a, b), empty: 'No open bugs. Type what went wrong above to file one.' },
      new:    { keep: r => r.status !== 'fixed', sort: byNewest, empty: 'No open bugs. Type what went wrong above to file one.' },
      mine:   { keep: r => r.mine || r.i_hit, sort: byNewest, empty: "Bugs you file or tap 'Me too' on show up here." },
      fixing: { keep: r => r.status === 'fixing', sort: (a, b) => b.hits - a.hits || byNewest(a, b), empty: 'Nothing is being fixed right now.' },
      fixed:  { keep: r => r.status === 'fixed', sort: (a, b) => new Date(b.updated_at) - new Date(a.updated_at), empty: 'Nothing fixed yet.' }
    };
    function byNewest(a, b) { return new Date(b.created_at) - new Date(a.created_at); }
    let bugFilter = 'top';
    let bugRows = [];
    function setBugFilter(f) {
      bugFilter = f;
      document.querySelectorAll('.bug-filter').forEach(b => b.classList.toggle('p-chip-on', b.dataset.filter === f));
      document.querySelectorAll('.stat-btn').forEach(b => b.classList.toggle('on', b.dataset.filter === (f === 'new' ? 'top' : f)));
      drawBugList();
    }
    document.querySelectorAll('.bug-filter').forEach(b => b.addEventListener('click', () => setBugFilter(b.dataset.filter)));
    document.querySelectorAll('.stat-btn').forEach(b => b.addEventListener('click', () => {
      showTab('tab-bugs');
      if (bugSummary.value.trim()) { bugSummary.value = ''; loadBoard(); }
      setBugFilter(b.dataset.filter);
      document.getElementById('bug-filters').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    function updateBugCounts() {
      document.querySelectorAll('.bug-filter').forEach(b => {
        const c = b.querySelector('.chip-count');
        if (c) c.textContent = bugRows.filter(BUG_FILTERS[b.dataset.filter].keep).length;
      });
    }
    function drawBugList() {
      if (bugSummary.value.trim()) return; // search results own the list while typing
      bugList.replaceChildren();
      if (bugRows.length === 0) {
        bugList.appendChild(el('p', 'p-5 text-white/50 text-sm', 'No bugs reported yet. Type what went wrong above to file the first one.'));
        return;
      }
      const f = BUG_FILTERS[bugFilter];
      const rows = bugRows.filter(f.keep).sort(f.sort);
      if (rows.length === 0) { bugList.appendChild(el('p', 'p-5 text-white/50 text-sm', f.empty)); return; }
      rows.forEach(r => bugList.appendChild(renderReport(r)));
    }

    let searchSeq = 0;
    async function loadBoard() {
      const q = bugSummary.value.trim();
      const seq = ++searchSeq;
      bugListStatus.textContent = 'Loading…';
      const { data, error } = await db.rpc('bug_board', { p_query: q || null, p_limit: q ? 8 : 100 });
      if (seq !== searchSeq) return; // a newer search has started
      bugList.replaceChildren();
      bugListStatus.textContent = '';
      // While typing, the chips give way to "Is it one of these?" matches.
      bugListTitle.classList.toggle('hidden', !q);
      document.getElementById('bug-filters').classList.toggle('hidden', !!q);
      bugForm.classList.toggle('hidden', q.length < 5);
      bugFormTitle.textContent = q;
      if (error) {
        bugList.appendChild(el('p', 'p-5 text-red-400 text-sm', friendlyError(error)));
        return;
      }
      if (!q) {
        bugRows = data || [];
        renderStats(bugRows);
        updateBugCounts();
        drawBugList();
        return;
      }
      if (!data || data.length === 0) {
        bugList.appendChild(el('p', 'p-5 text-white/50 text-sm', 'Nobody has reported this yet. File it below.'));
        return;
      }
      data.forEach(r => bugList.appendChild(renderReport(r)));
    }

    let searchTimer = null;
    bugSummary.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadBoard, 300);
    });

    bugForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      bugMsg.style.display = 'none';
      if (bugSummary.value.trim().length < 5) {
        bugSummary.focus();
        showBugMsg('Write what went wrong at the top first (5 characters or more).', false);
        return;
      }
      if (needDevice()) return;
      localStorage.setItem(DEVICE_KEY, bugDevice.value.trim());
      const btn = document.getElementById('bug-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Filing…';
      const { error } = await db.rpc('file_bug_report', {
        p_category: bugCategory,
        p_summary: bugSummary.value.trim(),
        p_details: document.getElementById('bug-details').value.trim(),
        p_device: bugDevice.value.trim(),
        p_app_version: appContext().app || null,
        p_os: appContext().os || null
      });
      btn.disabled = false;
      btn.textContent = 'File new bug';
      if (error) { console.error('file_bug_report:', error); showBugMsg(friendlyError(error), false); return; }
      document.getElementById('bug-details').value = '';
      bugSummary.value = '';
      await loadBoard();
      bugListStatus.textContent = 'Filed. It\'s on the board now.';
    });

    let boardStarted = false;
    async function onSignedIn() {
      if (boardStarted) return;
      boardStarted = true;
      loadBoard();
      loadAnnouncement();
    }
    // -------------------------------------------------------------
    // SUGGESTIONS / COMMUNITY IDEAS BOARD
    // -------------------------------------------------------------
    let selectedSugCategory = 'Spots & Map';
    let suggestionRows = [];

    const sugForm = document.getElementById('suggestion-form');
    const sugTitle = document.getElementById('suggestion-title');
    const sugDetails = document.getElementById('suggestion-details');
    const sugMsg = document.getElementById('suggestion-msg');
    const sugSubmitBtn = document.getElementById('suggestion-submit-btn');
    const sugList = document.getElementById('suggestion-list');
    const sugStatus = document.getElementById('suggestion-status');

    document.querySelectorAll('.sug-cat-chip').forEach(c => c.addEventListener('click', () => {
      selectedSugCategory = c.dataset.val;
      document.querySelectorAll('.sug-cat-chip').forEach(x => x.classList.toggle('p-chip-on', x === c));
    }));

    const SUG_STATUS = {
      exploring: { label: 'Exploring', cls: 'border-amber-400/40 text-amber-400' },
      planned:   { label: 'Planned',   cls: 'border-matrix/40 text-matrix' },
      completed: { label: 'Completed', cls: 'border-cyan-400/40 text-cyan-400' },
      closed:    { label: 'Not doing',    cls: 'border-white/20 text-white/40' }
    };

    function sugStatusPill(s) {
      const st = SUG_STATUS[s] || SUG_STATUS.exploring;
      const pill = el('span', 'p-status ' + st.cls);
      const dot = el('span', 'dot' + (s === 'planned' ? ' animate-pulse' : ''));
      pill.append(dot, document.createTextNode(st.label));
      return pill;
    }

    function renderSuggestion(sug) {
      const row = el('div', 'flex gap-4 p-4 sm:p-5' + (sug.status === 'closed' ? ' opacity-50 hover:opacity-100 transition-opacity' : ''));

      // Upvote Button
      const btn = el('button', 'hit-btn self-start');
      btn.type = 'button';
      const n = el('span', 'n', sug.votes);
      const t = el('span', 't');
      btn.append(n, t);

      function paintBtn() {
        n.textContent = sug.votes;
        btn.classList.toggle('on', sug.i_voted || sug.mine);
        const finished = sug.status === 'completed' || sug.status === 'closed';
        // Your own idea always carries your vote; a finished idea takes no new votes.
        btn.disabled = sug.mine || (finished && !sug.i_voted);
        if (sug.mine) { t.textContent = 'Yours'; btn.title = 'You proposed this idea'; }
        else if (sug.i_voted) { t.textContent = '✓ Voted'; btn.title = 'Tap to take vote back'; }
        else if (finished) { t.textContent = 'Closed'; btn.title = 'Voting on this idea has finished'; }
        else { t.textContent = 'Vote'; btn.title = 'Upvote this idea'; }
        btn.setAttribute('aria-label', sug.votes + ' votes. ' + btn.title);
      }
      paintBtn();

      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const { data, error } = await db.rpc('vote_suggestion', { p_suggestion_id: sug.id });
        if (error) {
          paintBtn();
          sugStatus.textContent = friendlyError(error);
          return;
        }
        if (data) {
          sug.i_voted = data.voted;
          sug.votes = data.votes;
          paintBtn();
          updateSugCounts();
        }
      });
      row.appendChild(btn);

      // Body
      const body = el('div', 'min-w-0 flex-1');
      const top = el('div', 'flex items-start justify-between gap-3');
      const title = el('div', 'text-white font-semibold leading-snug break-words', sug.title);
      top.append(title, sugStatusPill(sug.status));
      body.appendChild(top);

      const meta = el('div', 'flex items-center gap-2 mt-1.5 text-xs text-white/50');
      meta.append(
        el('span', 'font-mono uppercase tracking-wider text-[10px] text-white/60', sug.category),
        el('span', null, '·'),
        el('span', null, ago(sug.created_at))
      );
      body.appendChild(meta);

      const details = el('p', 'mt-3 text-sm text-white/70 whitespace-pre-line break-words border-l border-white/10 pl-3', sug.details);
      body.appendChild(details);

      if (sug.admin_note) {
        const note = el('div', 'mt-3 text-sm text-white/80 flex gap-2 bg-white/[0.02] p-2.5 rounded border border-white/5');
        note.append(el('span', 'p-label pt-0.5 shrink-0 text-matrix', 'Dev Note'), el('span', 'break-words', sug.admin_note));
        body.appendChild(note);
      }

      row.appendChild(body);
      return row;
    }

    async function loadSuggestions() {
      if (!sugList) return;
      sugStatus.textContent = 'Loading ideas…';
      const { data, error } = await db.rpc('suggestion_board', { p_category: null, p_status: null, p_limit: 100 });
      if (error) {
        sugStatus.textContent = 'Could not load ideas';
        sugList.replaceChildren(el('p', 'p-5 text-white/50 text-sm', 'Failed to load: ' + friendlyError(error)));
        return;
      }
      suggestionRows = data || [];
      sugStatus.textContent = '';
      updateSugCounts();
      drawSuggestions();
    }

    // Same chip row as the bug list: Top, New, Mine (posted or voted), Planned.
    // Finished ideas (Completed / Not doing) sink below open ones in Top and New.
    const finishedIdea = s => s.status === 'completed' || s.status === 'closed';
    const SUG_FILTERS = {
      top:     { keep: () => true, sort: (a, b) => finishedIdea(a) - finishedIdea(b) || b.votes - a.votes || byNewest(a, b), empty: 'No ideas posted yet. Be the first!' },
      new:     { keep: () => true, sort: (a, b) => finishedIdea(a) - finishedIdea(b) || byNewest(a, b), empty: 'No ideas posted yet. Be the first!' },
      mine:    { keep: s => s.mine || s.i_voted, sort: byNewest, empty: 'Ideas you post or vote for show up here.' },
      planned: { keep: s => s.status === 'planned', sort: (a, b) => b.votes - a.votes || byNewest(a, b), empty: 'Nothing planned yet.' }
    };
    let sugFilter = 'top';
    document.querySelectorAll('.sug-filter').forEach(b => b.addEventListener('click', () => {
      sugFilter = b.dataset.filter;
      document.querySelectorAll('.sug-filter').forEach(x => x.classList.toggle('p-chip-on', x === b));
      drawSuggestions();
    }));
    function updateSugCounts() {
      document.querySelectorAll('.sug-filter').forEach(b => {
        const c = b.querySelector('.chip-count');
        if (c) c.textContent = suggestionRows.filter(SUG_FILTERS[b.dataset.filter].keep).length;
      });
    }
    function drawSuggestions() {
      const f = SUG_FILTERS[sugFilter];
      const rows = suggestionRows.filter(f.keep).sort(f.sort);
      sugList.replaceChildren();
      if (rows.length === 0) { sugList.appendChild(el('p', 'p-5 text-white/50 text-sm', f.empty)); return; }
      rows.forEach(s => sugList.appendChild(renderSuggestion(s)));
    }

    if (sugForm) {
      sugForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = sugTitle.value.trim();
        const details = sugDetails.value.trim();
        if (title.length < 5) {
          sugMsg.textContent = 'Title needs at least 5 characters.';
          sugMsg.className = 'text-xs text-red-400';
          return;
        }

        sugSubmitBtn.disabled = true;
        sugSubmitBtn.textContent = 'Posting…';
        sugMsg.textContent = '';

        const { data, error } = await db.rpc('submit_suggestion', {
          p_category: selectedSugCategory,
          p_title: title,
          p_details: details
        });

        sugSubmitBtn.disabled = false;
        sugSubmitBtn.textContent = 'Post idea';

        if (error) {
          sugMsg.textContent = friendlyError(error);
          sugMsg.className = 'text-xs text-red-400';
        } else {
          sugMsg.textContent = 'Idea posted!';
          sugMsg.className = 'text-xs text-matrix';
          sugForm.reset();
          loadSuggestions();
          setTimeout(() => { sugMsg.textContent = ''; }, 4000);
        }
      });
    }

    // ANNOUNCEMENTS: newest pinned update from the team, shown above the tabs
    let shownAnnouncement = null;
    async function loadAnnouncement() {
      const { data, error } = await db.rpc('dao_get_announcements', { p_limit: 1 });
      const card = document.getElementById('announcement');
      const a = !error && data && data[0];
      shownAnnouncement = a || null;
      card.classList.toggle('hidden', !a);
      if (!a) return;
      document.getElementById('announcement-title').textContent = a.title;
      document.getElementById('announcement-body').textContent = a.content;
      document.getElementById('announcement-date').textContent = ago(a.created_at);
      const tag = document.getElementById('announcement-tag');
      tag.textContent = a.build_tag || '';
      tag.classList.toggle('hidden', !a.build_tag);
    }
    // COMMUNITY VOTES. Tap an option to vote; tap another to change it while the vote is open.
    // The split stays hidden until it ends.
    const voteList = document.getElementById('vote-list');
    function timeLeft(iso) {
      const ms = new Date(iso) - Date.now();
      const h = Math.floor(ms / 3600e3);
      if (h >= 48) return Math.floor(h / 24) + ' days left';
      if (h >= 1) return h + (h === 1 ? ' hour left' : ' hours left');
      const m = Math.max(1, Math.floor(ms / 60e3));
      return m + (m === 1 ? ' minute left' : ' minutes left');
    }
    function votesText(n) { return n === 1 ? '1 vote' : n + ' votes'; }

    function renderVote(v) {
      const card = el('div', 'p-panel p-5 sm:p-6');
      card.appendChild(el('h3', 'text-base sm:text-lg font-semibold text-white break-words', v.title));
      if (v.description) card.appendChild(el('p', 'text-sm text-white/60 mt-1.5 whitespace-pre-line break-words', v.description));

      const opts = el('div', 'space-y-2 mt-4');
      const voted = v.my_vote !== null && v.my_vote !== undefined;
      const showSplit = Array.isArray(v.results);
      const max = showSplit ? Math.max(...v.results) : 0;
      (v.options || []).forEach((label, i) => {
        if (showSplit && (v.is_closed || voted)) {
          const n = v.results[i] || 0;
          const pct = v.total_votes ? Math.round(n * 100 / v.total_votes) : 0;
          const row = el(v.is_closed ? 'div' : 'button', 'vote-opt result' + (n === max && n > 0 ? ' lead' : '') + (v.my_vote === i ? ' mine' : ''));
          const bar = el('span', 'bar'); bar.style.width = pct + '%';
          row.append(bar, el('span', 'lbl break-words', (v.my_vote === i ? '✓ ' : '') + label), el('span', 'pct', pct + '%'));
          if (!v.is_closed) { row.type = 'button'; row.addEventListener('click', () => castVote(v, i, row)); }
          opts.appendChild(row);
          return;
        }
        const b = el('button', 'vote-opt' + (v.my_vote === i ? ' mine' : ''));
        b.type = 'button';
        b.append(el('span', 'lbl break-words', (v.my_vote === i ? '✓ ' : '') + label));
        if (v.is_closed) b.disabled = true;
        else b.addEventListener('click', () => castVote(v, i, b));
        opts.appendChild(b);
      });
      card.appendChild(opts);

      const foot = el('div', 'flex flex-wrap items-center gap-x-2 gap-y-1 mt-4 text-xs text-white/50');
      const bits = [votesText(v.total_votes)];
      if (v.is_closed) bits.push('Final results');
      else if (v.closes_at) bits.push(timeLeft(v.closes_at));
      if (!v.is_closed && voted) bits.push('You voted · results when it ends');
      bits.forEach((b, k) => { if (k) foot.appendChild(el('span', null, '·')); foot.appendChild(el('span', null, b)); });
      card.appendChild(foot);
      return card;
    }

    async function castVote(v, i, btn) {
      if (v.my_vote === i) return;
      btn.disabled = true;
      const { error } = await db.rpc('dao_cast_vote', { p_ballot_id: v.id, p_option_index: i });
      if (error) { btn.disabled = false; alert(friendlyError(error)); loadVotes(); return; }
      loadVotes();
    }

    async function loadVotes() {
      const { data, error } = await db.rpc('dao_get_ballots');
      voteList.replaceChildren();
      if (error) { voteList.appendChild(el('p', 'p-panel p-5 text-red-400 text-sm', friendlyError(error))); return; }
      if (!data || data.length === 0) {
        voteList.appendChild(el('p', 'p-panel p-5 text-white/50 text-sm', 'No votes running right now. When the team asks the community something, it shows up here.'));
        return;
      }
      data.forEach(v => voteList.appendChild(renderVote(v)));
    }

    (function deletedNotice() {
      const q = new URLSearchParams(location.search);
      if (q.get('deleted') !== '1') return;
      document.getElementById('gate-deleted').classList.remove('hidden');
      history.replaceState(null, '', location.pathname);
    })();

    // INITIALIZE
    checkAuth();
  
