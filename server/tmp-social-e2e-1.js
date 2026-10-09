/* Temp smoke test for the social network — part 1. DELETE AFTER VERIFICATION. */
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
  ok(st.status === 200 && st.json?.data?.accessToken, 'student login', st);
  const em = await api('POST', '/auth/login', null, { email: 'hr@brainstation23.test', password: 'Password123!' });
  ok(em.status === 200 && em.json?.data?.accessToken, 'employer login', em);
  if (st.status !== 200 || em.status !== 200) throw new Error('login failed');

  const tok = { st: st.json.data.accessToken, em: em.json.data.accessToken };
  const stUser = st.json.data.user, emUser = em.json.data.user;
  ok(Boolean(stUser.username) && Boolean(emUser.username), 'usernames present on login', { stUser, emUser });

  console.log('== authz ==');
  const no = await api('GET', '/social/feed', null);
  ok(no.status === 401, 'unauth feed → 401', no);

  console.log('== posts ==');
  const tooLong = await api('POST', '/social/posts', tok.st, { content: 'x'.repeat(501) });
  ok(tooLong.status === 400, 'content >500 → 400', tooLong);
  const empty = await api('POST', '/social/posts', tok.st, { content: '   ' });
  ok(empty.status === 400, 'empty content → 400', empty);

  const created = await api('POST', '/social/posts', tok.st, { content: `My first tip @${emUser.username} #InterviewTips #JobSearching`, photoUrl: 'https://example.com/p.png' });
  ok(created.status === 201 && created.json?.data?.post?.id, 'student creates post w/ hashtag+mention', created);
  const postId = created.json?.data?.post?.id;
  ok((created.json?.data?.post?.hashtags || []).includes('interviewtips'), 'hashtag extracted+lowercased', created.json?.data?.post?.hashtags);

  console.log('== feed/follow ==');
  const home0 = await api('GET', '/social/feed', tok.em);
  ok(home0.status === 200, 'employer feed 200', home0);
  const fl = await api('POST', `/social/users/${stUser.username}/follow`, tok.em);
  ok(fl.status === 200 && fl.json?.data?.isFollowing === true, 'employer follows student', fl);
  const selfFl = await api('POST', `/social/users/${stUser.username}/follow`, tok.st);
  ok(selfFl.status === 400, 'self-follow → 400', selfFl);
  const home1 = await api('GET', '/social/feed', tok.em);
  ok(home1.status === 200 && (home1.json?.data?.posts || []).some((p) => p.id === postId), 'followed post visible in feed', home1.json?.data?.pagination);

  console.log('== likes ==');
  const lk = await api('POST', `/social/posts/${postId}/like`, tok.em);
  ok(lk.status === 200 && lk.json?.data?.likeCount === 1, 'like → count 1', lk);
  const lk2 = await api('POST', `/social/posts/${postId}/like`, tok.em);
  ok(lk2.status === 200 && lk2.json?.data?.likeCount === 1, 'duplicate like idempotent', lk2);
  const un = await api('DELETE', `/social/posts/${postId}/like`, tok.em);
  ok(un.status === 200 && un.json?.data?.likeCount === 0, 'unlike → count 0', un);

  console.log('== comments ==');
  const c1 = await api('POST', `/social/posts/${postId}/comments`, tok.em, { content: 'Great tip!' });
  ok(c1.status === 201 && c1.json?.data?.comment?.id, 'comment created', c1);
  const cid = c1.json?.data?.comment?.id;
  const r1 = await api('POST', `/social/posts/${postId}/comments`, tok.st, { content: 'Thanks!', parentCommentId: cid });
  ok(r1.status === 201, 'reply created', r1);
  const cl = await api('POST', `/social/comments/${cid}/like`, tok.st);
  ok(cl.status === 200 && cl.json?.data?.likeCount === 1, 'comment liked', cl);
  const clu = await api('DELETE', `/social/comments/${cid}/like`, tok.st);
  ok(clu.status === 200 && clu.json?.data?.likeCount === 0, 'comment unliked', clu);
  const clist = await api('GET', `/social/posts/${postId}/comments`, tok.em);
  const top = (clist.json?.data?.comments || [])[0] || {};
  ok(clist.status === 200 && Array.isArray(top.replies) && top.replies.length >= 1, 'threaded replies nested', top);
  const delR = await api('DELETE', `/social/comments/${r1.json?.data?.comment?.id}`, tok.st);
  ok(delR.status === 200, 'reply deleted', delR);

  console.log('== get/edit/delete post + authz ==');
  const gp = await api('GET', `/social/posts/${postId}`, tok.em);
  ok(gp.status === 200 && gp.json?.data?.post?.id === postId, 'post detail', gp);
  const editOther = await api('PATCH', `/social/posts/${postId}`, tok.em, { content: 'hijack' });
  ok(editOther.status === 403, 'edit others post → 403', editOther);
  const ed = await api('PATCH', `/social/posts/${postId}`, tok.st, { content: 'Edited in window #CareerAdvice' });
  ok(ed.status === 200 && ed.json?.data?.post?.editedAt, 'author edits within 30min', ed);
  const unfl = await api('DELETE', `/social/users/${stUser.username}/follow`, tok.em);
  ok(unfl.status === 200 && unfl.json?.data?.isFollowing === false, 'unfollow', unfl);

  module.exports = { BASE, pass, fail };
})();
