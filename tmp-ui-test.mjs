import { spawn } from 'child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9333;
const API = 'http://localhost:5000/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' }),
  });
  const j = await r.json();
  return { token: (j.data || j).accessToken, id: (j.data || j).user.id };
}

async function seedThread(st, em) {
  await fetch(`${API}/social/messages/${em.id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${st.token}` },
    body: JSON.stringify({ content: 'ui-probe from student #Job' }),
  });
  await fetch(`${API}/social/messages/${st.id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${em.token}` },
    body: JSON.stringify({ content: 'ui-probe from employer' }),
  });
}

(async () => {
  const st = await login('seed.student1@nubjobs.test');
  const em = await login('hr@brainstation23.test');
  await seedThread(st, em);

  const child = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=C:\\Temp\\edge-cdp-${Date.now()}`,
    '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank',
  ], { stdio: 'ignore', detached: false });

  let wsUrl = null;
  for (let i = 0; i < 40 && !wsUrl; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
  }
  if (!wsUrl) { console.log('FATAL no CDP target'); child.kill(); process.exit(1); }

  const ws = new WebSocket(wsUrl);
  let msgId = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(JSON.stringify(m.params.args?.map((a) => a.value ?? a.description).slice(0, 2)));
    }
  };
  const cdp = (method, params = {}) => new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    return r?.result?.value;
  };
  await new Promise((r) => { ws.onopen = r; });
  await cdp('Page.enable'); await cdp('Runtime.enable');

  await ev(`localStorage.setItem('token','${st.token}'); localStorage.setItem('refreshToken','r');`);
  await cdp('Page.navigate', { url: `http://localhost:3000/social/messages/${em.id}` });
  await sleep(9000);
