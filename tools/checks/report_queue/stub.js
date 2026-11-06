// Mock Supabase client for the admin Reports checks. Never talks to the network.
// Query switches: ?fail=1 (admin_content_reports fails until window.__healed is set),
// ?nocomment=1 (comment rows lack the T-451 columns), ?nodelfn=1 (admin_delete_comment
// does not exist yet), ?empty=1 (no reports at all).
(function () {
  const q = new URLSearchParams(location.search);
  window.confirm = () => true;
  window.__calls = [];
  window.__contentCalls = 0;
  const now = Date.now();
  const iso = m => new Date(now - m * 60000).toISOString();
  const user = { id: 'admin1', email: 'admin@example.com', user_metadata: {} };
  const spotReports = q.get('empty') ? [] : [
    { id: 'p1', post_id: 'sp1', reporter_user_id: 'u9', reporter: 'ana', reason: 'Not a real spot', details: '', status: 'pending', created_at: iso(50),
      map_posts: { id: 'sp1', title: 'Hubba Hideout', description: '', category: 'Ledge', photo_url: null, photo_urls: null, deleted_at: null } }
  ];
  const commentCols = q.get('nocomment') ? {} : { comment_text: 'you are all trash', commenter: 'rude_rob', post_id: 'sp1' };
  const content = q.get('empty') ? [] : [
    { id: 'c1', target_type: 'clip', target_id: 'v1', reason: 'Spam', status: 'open', created_at: iso(10), reporter: 'bea', target_username: null },
    { id: 'c2', target_type: 'user', target_id: 'u2', reason: 'Harassment', status: 'open', created_at: iso(20), reporter: 'cal', target_username: 'bully_bo' },
    { id: 'c3', target_type: 'message', target_id: 'm1', reason: 'Threats', status: 'open', created_at: iso(30), reporter: 'dee', target_username: null },
    Object.assign({ id: 'c4', target_type: 'comment', target_id: 'cm1', reason: 'Abuse', status: 'open', created_at: iso(40), reporter: 'eli', target_username: null }, commentCols),
    { id: 'c5', target_type: 'clip', target_id: 'v2', reason: 'Old one', status: 'dismissed', created_at: iso(900), reporter: 'fay', target_username: null }
  ];
  const tables = { post_reports: spotReports };
  function builder(table) {
    const b = new Proxy({}, { get(_, k) {
      if (k === 'then') return (res, rej) => Promise.resolve({ data: tables[table] || [], error: null, count: (tables[table] || []).length }).then(res, rej);
      return () => b;
    } });
    return b;
  }
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { user } } }),
      getUser: async () => ({ data: { user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: {} } }),
      signOut: async () => ({})
    },
    from: builder,
    rpc: async (name, args) => {
      window.__calls.push({ name, args });
      if (name === 'is_admin') return { data: true, error: null };
      if (name === 'admin_content_reports') {
        window.__contentCalls++;
        if (q.get('fail') && !window.__healed) return { data: null, error: { message: 'boom: connection lost' } };
        return { data: content.filter(r => !args.p_status || r.status === args.p_status), error: null };
      }
      if (name === 'admin_set_report_status') {
        const r = content.find(x => x.id === args.p_report); if (r) r.status = args.p_status;
        return { data: null, error: null };
      }
      if (name === 'admin_delete_comment') {
        if (q.get('nodelfn')) return { data: null, error: { message: 'Could not find the function public.admin_delete_comment(p_comment, p_note) in the schema cache' } };
        const i = content.findIndex(x => x.target_id === args.p_comment); if (i >= 0) content[i].status = 'reviewed';
        return { data: null, error: null };
      }
      return { data: [], error: null };
    }
  };
  window.supabase = { createClient: () => client };
})();
