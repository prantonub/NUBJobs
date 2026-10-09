/* Temp smoke test — part 2: profiles, DMs, notifications (needs part 1's post alive). */
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

  console.log('== profiles ==');
  const prof = await api('GET', `/social/users/${stUser.username}`, tok.em);
  ok(prof.status === 200 && prof.json?.data?.user?.username === stUser.username, 'public profile', prof);
  const p404 = await api('GET', '/social/users/definitely-not-a-user', tok.em);
  ok(p404.status === 404, 'unknown username → 404', p404);
  const me1 = await api('PATCH', '/social/users/me', tok.st, { bio: 'CS student hunting internships' });
  ok(me1.status === 200 && (me1.json?.data?.user?.bio || '').startsWith('CS student'), 'update bio', me1);
  const badBio = await api('PATCH', '/social/users/me', tok.st, { bio: 'y'.repeat(151) });
  ok(badBio.status === 400, 'bio >150 → 400', badBio);
  const badUrl = await api('PATCH', '/social/users/me', tok.st, { website: 'not-a-url' });
  ok(badUrl.status === 400, 'bad website → 400', badUrl);
  const fls = await api('GET', `/social/users/${stUser.username}/followers`, tok.em);
  ok(fls.status === 200 && Array.isArray(fls.json?.data?.followers), 'followers list', fls);
  const flg = await api('GET', `/social/users/${stUser.username}/following`, tok.em);
  ok(flg.status === 200 && Array.isArray(flg.json?.data?.following), 'following list', flg);
  const sug = await api('GET', '/social/suggestions?limit=5', tok.em);
  ok(sug.status === 200 && Array.isArray(sug.json?.data?.users), 'suggestions', sug);

  console.log('== DMs ==');
  const dm = await api('POST', `/social/messages/${emUser.id}`, tok.st, { content: 'Hi, loved your post' });
  ok(dm.status === 201 && dm.json?.data?.message?.id, 'DM sent', dm);
  const mid = dm.json?.data?.message?.id;
  const dmEmpty = await api('POST', `/social/messages/${emUser.id}`, tok.st, { content: '' });
  ok(dmEmpty.status === 400, 'empty DM → 400', dmEmpty);
  const dmSelf = await api('POST', `/social/messages/${stUser.id}`, tok.st, { content: 'hi me' });
  ok(dmSelf.status === 400, 'DM to self → 400', dmSelf);
  const convs = await api('GET', '/social/messages', tok.em);
  ok(convs.status === 200 && (convs.json?.data?.conversations || []).length >= 1, 'conversation list', convs.json?.data?.conversations?.length);
  const ur0 = await api('GET', '/social/messages/unread-count', tok.em);
  ok(ur0.status === 200 && ur0.json?.data?.unreadCount >= 1, 'unread-count >= 1', ur0);
  const hist = await api('GET', `/social/messages/${stUser.id}`, tok.em);
  ok(hist.status === 200 && ((hist.json?.data?.messages || []).some((m) => m.id === mid)), 'history shows DM', hist);
  const rd = await api('PATCH', `/social/messages/${mid}/read`, tok.em);
  ok(rd.status === 200 && rd.json?.data?.isRead === true, 'recipient marks read', rd);
  const rdOther = await api('PATCH', `/social/messages/${mid}/read`, tok.st);
  ok(rdOther.status === 403, 'sender marking read → 403', rdOther);
  const dm2 = await api('POST', `/social/messages/${stUser.id}`, tok.em, { content: '', photoUrl: 'https://example.com/a.png' });
  ok(dm2.status === 201, 'photo-only DM', dm2);
  const delOther = await api('DELETE', `/social/messages/${dm2.json?.data?.message?.id}`, tok.st);
  ok(delOther.status === 403, 'delete others msg → 403', delOther);
  const delMsg = await api('DELETE', `/social/messages/${dm2.json?.data?.message?.id}`, tok.em);
  ok(delMsg.status === 200, 'sender deletes DM', delMsg);
  const ur1 = await api('GET', '/social/messages/unread-count', tok.st);
  console.log('  (student unread after clearing: ' + ur1.json?.data?.unreadCount + ')');
  module.exports = {};
})();
