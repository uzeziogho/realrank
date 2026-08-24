import { chromium } from 'playwright';
const dir = '/tmp/claude-0/-home-user-realrank/93a7f030-a7e1-5570-aa0c-9a5e10369683/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 1 });
await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await p.screenshot({ path: dir + '/login.png' });
await b.close(); console.log('done');
