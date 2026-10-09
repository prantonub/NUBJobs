/* Temp smoke test — part 3: notifications, search, moderation, cleanup. */
const BASE = 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  PASS ' + label); }
  else { fail++; console.log('  FAIL ' + label + (extra ? ' :: ' + JSON.stringify(extra).slice(0, 300) : '')); }
};
const api = async (method, path, token, body) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch (e) { /* ignore */ }
  return { status: r.status, json };
};

(async () => {
  const st = await api('POST', '/auth/login', null, { email: 'seed.student1@nubjobs.test', password: 'Password123!' });
  const em = await api('POST', '/auth/login', null, { email: 'hr@brainstation23.test', password: 'Password123!' });
  if (st.status !== 200 || em.status !== 200) throw new Error('login failed');
  const tok = { st: st.json.data.accessToken, em: em.json.data.accessToken };
  const stUser = st.json.data.user, emUser = em.json.data.user;

  // Seed: mention + follow + comment so notifications exist for the employer.
  const post = await api('POST', '/social/posts', tok.st, { content: `Noted @${emUser.username} #CareerAdvice` });
  const postId = post.json?.data?.post?.id;
  ok(post.status === 201 && postId, 'seed post for notif search', post);
  // Student follows employer → employer receives the FOLLOW notification.
  await api('POST', `/social/users/${emUser.username}/follow`, tok.st);
  await api('POST', `/social/posts/${postId}/comments`, tok.em, { content: 'Nice one' });

  console.log('== notifications ==');
  const ns = await api('GET', '/social/notifications', tok.em);
  const ntypes = ((ns.json?.data?.notifications) || []).map((n) => n.type);
  ok(ns.status === 200 && ntypes.includes('MENTION') && ntypes.includes('FOLLOW'), 'mention+follow present', ntypes);
  const first = ((ns.json?.data?.notifications) || [])[0];
  const nr = await api('PATCH', `/social/notifications/${first.id}/read`, tok.em);
  ok(nr.status === 200, 'mark notification read', nr);
  const nrOther = await api('PATCH', `/social/notifications/${first.id}/read`, tok.st);
  ok(nrOther.status === 404, 'read others notification → 404', nrOther);
  const nra = await api('PATCH', '/social/notifications/read-all', tok.em);
  ok(nra.status === 200, 'read-all', nra);
  const nuc = await api('GET', '/social/notifications/unread-count', tok.em);
  ok(nuc.status === 200 && nuc.json?.data?.unreadCount === 0, 'unread-count 0', nuc);

  console.log('== search/discovery/moderation ==');
  const sp = await api('GET', '/social/search/posts?q=Noted', tok.em);
  ok(sp.status === 200 && (sp.json?.data?.posts || []).some((p) => p.id === postId), 'search posts', sp);
  const sh = await api('GET', '/social/search/posts?hashtag=careeradvice', tok.em);
  ok(sh.status === 200 && (sh.json?.data?.posts || []).some((p) => p.id === postId), 'hashtag param search', sh);
  const su = await api('GET', `/social/search/users?q=${stUser.username.slice(0, 6)}`, tok.em);
  ok(su.status === 200 && ((su.json?.data?.users || []).some((u) => u.username === stUser.username)), 'search users', su);
  const ht = await api('GET', '/social/hashtags/careeradvice', tok.em);
  ok(ht.status === 200 && (ht.json?.data?.posts || []).some((p) => p.id === postId), 'hashtag posts', ht);
  const tr = await api('GET', '/social/trending/hashtags?limit=10', tok.em);
  const trNames = ((tr.json?.data?.hashtags) || []).map((h) => h.name);
  ok(tr.status === 200 && trNames.includes('careeradvice'), 'trending includes tag', trNames);
  const rep = await api('POST', '/social/report', tok.em, { contentType: 'post', contentId: postId, reason: 'smoke test report' });
  ok(rep.status === 201, 'report filed', rep);
  const repBad = await api('POST', '/social/report', tok.em, { contentType: 'post', contentId: 'nope', reason: 'x' });
  ok(repBad.status === 404, 'report unknown id → 404', repBad);

  console.log('== cleanup ==');
  const dp = await api('DELETE', `/social/posts/${postId}`, tok.st);
  ok(dp.status === 200, 'author deletes post', dp);
  const gp2 = await api('GET', `/social/posts/${postId}`, tok.em);
  ok(gp2.status === 404, 'deleted post → 404', gp2);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { fail++; console.log('HARNESS ERROR', e); console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(1); });
