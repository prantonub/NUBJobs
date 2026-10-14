import { spawn } from 'child_process';
import fs from 'fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'C:\\temp\\edge-chat';
fs.rmSync(OUT, { recursive: true, force: true });

const args = [
  '--remote-debugging-port=9333',
  '--user-data-dir=' + OUT,
  '--headless=new',
  '--no-first-run',
  '--disable-gpu',
  '--window-size=1280,900',
  'http://localhost:3000/login',
];
const proc = spawn(EDGE, args, { detached: true, stdio: 'ignore' });
proc.unref();

let wsUrl = null;
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch('http://localhost:9333/json/list')).json();
    const page = list.find((t) => t.type === 'page');
    if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
if (!wsUrl) { console.log('CDP_NOT_UP'); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 1;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
function cdp(method, params) {
  return new Promise((resolve) => {
    const myId = id++;
    pending.set(myId, resolve);
    ws.send(JSON.stringify({ id: myId, method, params: params || {} }));
  });
}
async function evalJs(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return 'ERR:' + JSON.stringify(r.result.exceptionDetails.text);
  return r.result?.result?.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await cdp('Runtime.enable');
await cdp('Page.enable');

async function login(email, password) {
  await cdp('Page.navigate', { url: 'http://localhost:3000/login' });
  await sleep(2800);
  await evalJs(`(()=>{const s=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};const ins=[...document.querySelectorAll('input')];const e=ins.find(i=>i.type==='email'||/email/i.test(i.placeholder||''));const p=ins.find(i=>i.type==='password');if(e)s(e,'${email}');if(p)s(p,'${password}');return {e:!!e,p:!!p};})()`);
  await sleep(400);
  await evalJs(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/log ?in|sign ?in/i.test(x.textContent));if(b){b.click();return 'clicked';}return 'no-btn';})()`);
  await sleep(4000);
}

console.log('LOGIN:', await login('thecrazyboy1595@gmail.com', 'Password123!'));
console.log('PATH:', await evalJs('location.pathname'));

await cdp('Page.navigate', { url: 'http://localhost:3000/messages' });
await sleep(4000);
console.log('MSGS_H1:', await evalJs(`document.querySelector('h1')?.textContent || 'none'`));

const hrefs = await evalJs(`[...document.querySelectorAll('a[href*="?user="]')].map(a=>a.getAttribute('href')).slice(0,5)`);
console.log('HREFS:', JSON.stringify(hrefs));

process.exit(0);
