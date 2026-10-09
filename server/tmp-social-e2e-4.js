/* Temp smoke test for social polls + post photo upload — part 4. DELETE AFTER VERIFICATION. */
const BASE = 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  PASS ' + label); }
  else { fail++; console.log('  FAIL ' + label + (extra ? ' :: ' + JSON.stringify(extra).slice(0, 400) : '')); }
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

  console.log('== poll validation ==');
  const oneOpt = await api('POST', '/social/posts', tok.st, { content: 'poll test', pollQuestion: 'Best stack?', pollOptions: ['React'] });
  ok(oneOpt.status === 400, '1 option -> 400', oneOpt);
  const noQ = await api('POST', '/social/posts', tok.st, { content: 'poll test', pollOptions: ['A', 'B'] });
  ok(noQ.status === 400, 'options without question -> 400', noQ);
  const dupes = await api('POST', '/social/posts', tok.st, { content: 'poll test', pollQuestion: 'Q?', pollOptions: ['A', 'a'] });
  ok(dupes.status === 400, 'duplicate options -> 400', dupes);

  console.log('== poll create + serialize ==');
  const created = await api('POST', '/social/posts', tok.st, { content: 'Which track? #Career', pollQuestion: 'Best track?', pollOptions: ['Frontend', 'Backend', 'DevOps'] });
  ok(created.status === 201 && created.json?.data?.post?.poll?.question === 'Best track?', 'poll created', created);
  const pid = created.json?.data?.post?.id;
  ok(created.json?.data?.post?.poll?.totalVotes === 0 && created.json?.data?.post?.poll?.myVote === null, 'zero votes + null myVote', created.json?.data?.post?.poll);

  console.log('== voting ==');
  const bad = await api('POST', `/social/posts/${pid}/vote`, tok.em, { optionIdx: 9 });
  ok(bad.status === 400, 'bad option idx -> 400', bad);
  const v1 = await api('POST', `/social/posts/${pid}/vote`, tok.em, { optionIdx: 0 });
  ok(v1.status === 200 && v1.json?.data?.poll?.totalVotes === 1 && v1.json?.data?.poll?.myVote === 0, 'employer votes Frontend', v1);
  const v2 = await api('POST', `/social/posts/${pid}/vote`, tok.st, { optionIdx: 1 });
  ok(v2.status === 200 && v2.json?.data?.poll?.totalVotes === 2, 'author votes Backend', v2);
  const change = await api('POST', `/social/posts/${pid}/vote`, tok.em, { optionIdx: 2 });
  ok(change.status === 200 && change.json?.data?.poll?.totalVotes === 2 && change.json?.data?.poll?.myVote === 2, 're-vote moves (total stays 2)', change);
  const feed = await api('GET', '/social/feed', tok.em);
  const row = (feed.json?.data?.posts || []).find((p) => p.id === pid);
  ok(feed.status === 200 && row?.poll?.myVote === 2 && row?.poll?.options?.[2]?.votes === 1, 'feed carries myVote + counts', row?.poll);
  const unv = await api('DELETE', `/social/posts/${pid}/vote`, tok.em);
  ok(unv.status === 200, 'unvote 200', unv);
  const after = await api('GET', `/social/posts/${pid}`, tok.em);
  ok(after.json?.data?.post?.poll?.totalVotes === 1 && after.json?.data?.post?.poll?.myVote === null, 'vote retracted', after.json?.data?.post?.poll);

  console.log('== photo upload endpoint ==');
  const unauth = await fetch(BASE + '/social/posts/photo', { method: 'POST' });
  ok(unauth.status === 401, 'unauth photo upload -> 401', { status: unauth.status });
  // 1x1 PNG via multipart
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const fd = new FormData();
  fd.append('photo', new Blob([png], { type: 'image/png' }), 'tiny.png');
  const up = await fetch(BASE + '/social/posts/photo', { method: 'POST', headers: { Authorization: 'Bearer ' + tok.st }, body: fd });
  const upJson = await up.json().catch(() => null);
  ok(up.status === 200 && upJson?.data?.photoUrl?.startsWith('https://'), 'photo upload -> Cloudinary URL', upJson);
  if (upJson?.data?.photoUrl) {
    const withPhoto = await api('POST', '/social/posts', tok.st, { content: 'photo post', photoUrl: upJson.data.photoUrl });
    ok(withPhoto.status === 201 && withPhoto.json?.data?.post?.photoUrl === upJson.data.photoUrl, 'post with uploaded photo', withPhoto);
  }

  console.log('== edit resets votes ==');
  const ed = await api('PATCH', `/social/posts/${pid}`, tok.st, { pollQuestion: 'New Q?', pollOptions: ['X', 'Y'] });
  ok(ed.status === 200, 'poll replaced', ed);
  const afterEdit = await api('GET', `/social/posts/${pid}`, tok.st);
  ok(afterEdit.json?.data?.post?.poll?.totalVotes === 0, 'votes reset after option change', afterEdit.json?.data?.post?.poll);
  const rm = await api('PATCH', `/social/posts/${pid}`, tok.st, { pollQuestion: null });
  ok(rm.status === 200 && rm.json?.data?.post?.poll === null, 'poll removed', rm.json?.data?.post?.poll);

  console.log(`\\npart4: ${pass} pass, ${fail} fail`);
  if (fail) process.exitCode = 1;
})();
