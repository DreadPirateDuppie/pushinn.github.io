// Headless Chrome checks for the admin Reports list. Run with run.sh.
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 60; i++) { try { targets = await (await fetch('http://127.0.0.1:9361/json/list')).json(); if (targets.length) break; } catch (e) {} await sleep(200); }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function load(qs) {
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:8361/admin' + qs });
  await sleep(1500);
  await ev(`document.querySelector('.admin-sec[data-sec=mod]').click()`);
  await sleep(700);
}
const rows = () => ev(`JSON.stringify([...document.querySelectorAll('#mod-list > div')].map(d => d.textContent.replace(/\\s+/g,' ').trim()))`).then(JSON.parse);
const text = () => ev(`document.getElementById('mod-list').textContent.replace(/\\s+/g,' ')`);
const calls = name => ev(`JSON.stringify(window.__calls.filter(c => c.name === '${name}'))`).then(JSON.parse);
const clickBtn = (label, rowMatch) => ev(`(() => { const r = [...document.querySelectorAll('#mod-list > div')].find(d => d.textContent.includes(${JSON.stringify(rowMatch)})); const b = r && [...r.querySelectorAll('button')].find(x => x.textContent === ${JSON.stringify(label)}); if (!b) return false; b.click(); return true; })()`);

console.log('--- default: all five kinds, newest first');
await load('');
let t = await text(); let r = await rows();
ok(r.length === 5, 'five rows (1 spot report + 4 open content reports): got ' + r.length);
ok(r[0].includes('Spam') && r[0].includes('Clip'), 'newest row is the clip report labelled Clip');
ok(t.includes('Profile') && t.includes('@bully_bo'), 'profile report labelled Profile with the reported username');
ok(r.some(x => x.includes('Message') && x.includes('Threats')), 'message report labelled Message');
ok(r.some(x => x.includes('Comment') && x.includes('you are all trash') && x.includes('Written by @rude_rob')), 'comment row shows the comment text and its writer');
ok(r.some(x => x.includes('Not a real spot') && x.includes('Hubba Hideout')), 'spot report still listed as before');
ok(!t.includes('Old one'), 'dismissed report hidden by default');
ok((await calls('admin_content_reports'))[0].args.p_status === 'open', 'asks the database for open reports only');
ok((await ev(`document.querySelector('.mod-filter[data-q=reports] .admin-count').textContent`)) === '5', 'Reports count = 1 spot + 4 open content = 5');
ok((await ev(`document.getElementById('admin-mod-badge').textContent`)) === '5', 'tab badge counts them too');
ok((await ev(`[...document.querySelectorAll('#mod-list button')].filter(b => b.textContent === 'Delete comment').length`)) === 1, 'Delete comment appears on the comment row only');
ok(!r.some(x => !x.includes('Comment') && x.includes('Delete comment')), 'no Delete comment on clip, profile or message rows');

console.log('--- actions');
await clickBtn('Dismiss', 'Threats'); await sleep(1500);
let c = await calls('admin_set_report_status');
ok(c.length === 1 && c[0].args.p_report === 'c3' && c[0].args.p_status === 'dismissed', 'Dismiss sends admin_set_report_status dismissed for that report');
ok(!(await text()).includes('Threats'), 'dismissed row leaves the list');
await clickBtn('Reviewed', 'Spam'); await sleep(1500);
c = await calls('admin_set_report_status');
ok(c.length === 2 && c[1].args.p_report === 'c1' && c[1].args.p_status === 'reviewed', 'Reviewed sends admin_set_report_status reviewed');
await clickBtn('Delete comment', 'you are all trash'); await sleep(1500);
c = await calls('admin_delete_comment');
ok(c.length === 1 && c[0].args.p_comment === 'cm1' && c[0].args.p_note === '', 'Delete comment sends admin_delete_comment with the comment id');
ok((await ev(`document.querySelector('.mod-filter[data-q=reports] .admin-count').textContent`)) === '2', 'count falls to 2 after three are closed');
await ev(`document.getElementById('mod-all').click()`); await sleep(900);
ok((await calls('admin_content_reports')).slice(-1)[0].args.p_status === null, 'Show dismissed reports too asks for every status');
ok((await text()).includes('Old one') && (await text()).includes('Dismissed'), 'dismissed report listed with a Dismissed tag');

console.log('--- comment columns not applied yet');
await load('?nocomment=1'); t = await text();
ok(t.includes('The comment text is not available.'), 'comment row without T-451 columns says the text is not available');
ok(t.includes('Not a real spot') && t.includes('Spam'), 'other rows still draw');

console.log('--- delete function not there yet');
await load('?nodelfn=1');
await clickBtn('Delete comment', 'you are all trash'); await sleep(900);
ok((await text()).includes('Deleting comments is not switched on yet.'), 'plain error shown when admin_delete_comment is missing');
ok((await ev(`[...document.querySelectorAll('#mod-list button')].every(b => !b.disabled)`)), 'buttons usable again after the error');
ok((await text()).includes('you are all trash'), 'the comment row stays in the list');

console.log('--- content source fails, spot reports survive');
await load('?fail=1'); t = await text();
ok(t.includes('Could not load clip, profile, message and comment reports: boom: connection lost'), 'plain error names what failed');
ok(t.includes('Not a real spot') && t.includes('Hubba Hideout'), 'spot report list still shown');
ok(!t.includes('Spam'), 'no content rows while it failed');
ok((await ev(`document.querySelector('.mod-filter[data-q=reports] .admin-count').textContent`)) === '1', 'count shows only the spot report');
ok(await ev(`[...document.querySelectorAll('#mod-list button')].some(b => b.textContent === 'Retry')`), 'Retry button present');
await ev(`window.__healed = true`);
await ev(`[...document.querySelectorAll('#mod-list button')].find(b => b.textContent === 'Retry').click()`); await sleep(900);
t = await text();
ok(t.includes('Spam') && t.includes('Not a real spot') && !t.includes('Could not load'), 'Retry loads the content reports and clears the error');

console.log('--- nothing to review');
await load('?empty=1');
ok((await text()).includes('No reports waiting.'), 'empty message when there are no reports');

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
