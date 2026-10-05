import { spawn } from 'child_process';
import fs from 'fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tokens = [];
for (const f of ['d:/NUBJobs-full/tmp-tokens.txt', 'd:/NUBJobs-full/tmp-tokens2.txt']) {
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const p = line.trim().split('|');
    if (p.length >= 3) tokens.push({ id: p[0], role: p[1], token: p[2] });
    else if (p.length === 2 && p[1].startsWith('ey')) tokens.push({ id: p[0], role: 'ADMIN', token: p[1] });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  for (const t of tokens) {
    const profile = `C:\\Temp\\cdp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const port = 9334 + tokens.indexOf(t);
    const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { detached: false, stdio: 'ignore' });
    await sleep(2500);
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((x) => x.type === 'page');
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      let id = 0;
      const send = (method, params = {}) => new Promise((res) => {
        const myId = ++id;
        const handler = (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.id === myId) { ws.removeEventListener('message', handler); res(msg.result); }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: myId, method, params }));
      });
      const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

      await send('Page.enable');
      await send('Page.navigate', { url: 'http://localhost:3000/' });
      await sleep(4000);
      await evalJs(`localStorage.setItem('token', ${JSON.stringify(t.token)})`);
      await send('Page.navigate', { url: 'http://localhost:3000/employer/post-job' });
      await sleep(7000);
      const path = await evalJs('location.pathname');
      const hasForm = await evalJs(`!!document.querySelector('textarea, [placeholder*=Describe], input') && document.body.innerText.includes('Post')`);
      const snippet = (await evalJs('document.body.innerText.slice(0, 160)'))?.replace(/\n+/g, ' / ');
      console.log(`[${t.role.padEnd(8)}] ${t.id} -> path=${path} form=${hasForm} :: ${snippet}`);
      ws.close();
    } catch (e) {
      console.log(`[${t.role}] ${t.id} -> CDP error: ${e.message}`);
    }
    try { edge.kill(); } catch {}
    await sleep(1200);
  }
  process.exit(0);
}
main();
