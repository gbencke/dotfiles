// Renders a scene frozen at several moments into one contact sheet PNG, and reports page errors.
// usage: node frames.mjs --scene <id> --src <scene.js> [--src more.js] [--frames "idle:0,idle:3,s:1,s:2.5"] [--out sheet.png] [--fw 360 --fh 230 --cols 4]
// frames: idle:<seconds> = resting loop at that time; s:<seconds> = into the action; u:<0..1> = fraction of the action.
// Needs playwright: run `npm i playwright@1.56.1` in some scratch dir and pass NODE_PATH=<that dir>/node_modules, or run from there.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = { src: [] };
for (let i = 0; i < args.length; i += 2) {
  const k = args[i].replace(/^--/, '');
  if (k === 'src') opt.src.push(args[i + 1]);
  else opt[k] = args[i + 1];
}
if (!opt.scene || !opt.src.length) {
  console.error('need --scene <id> and --src <scene.js>');
  process.exit(1);
}
const require = createRequire(resolve(process.cwd(), 'x.js'));
let pw;
try {
  pw = require('playwright');
} catch {
  for (const p of (process.env.NODE_PATH || '').split(':').filter(Boolean)) {
    try {
      pw = createRequire(resolve(p, 'x.js'))('playwright');
      break;
    } catch {}
  }
}
if (!pw) {
  console.error('playwright not found. In a scratch dir: npm i playwright@1.56.1, then run this with NODE_PATH=<dir>/node_modules');
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const preview = pathToFileURL(resolve(here, '../templates/preview.html'));
const frames = opt.frames || 'idle:0,idle:2.5,u:0.1,u:0.25,u:0.4,u:0.55,u:0.7,u:0.85';
const q = new URLSearchParams({ scene: opt.scene, frames, cols: opt.cols || '4' });
for (const s of opt.src) q.append('src', pathToFileURL(resolve(s)).href);
if (opt.fw) q.set('fw', opt.fw);
if (opt.fh) q.set('fh', opt.fh);
if (opt.theme) q.set('theme', opt.theme);
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await pw.chromium.launch(existsSync(chrome) ? { executablePath: chrome, headless: true } : { headless: true });
const cols = Number(opt.cols || 4), fw = Number(opt.fw || 360);
const p = await b.newPage({ viewport: { width: cols * (fw + 14) + 60, height: 1000 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() !== 'log' && errs.push(`${m.type()}: ${m.text()}`));
await p.goto(`${preview.href}?${q}`);
await p.waitForSelector('body[data-ready]', { timeout: 15000 }).catch(() => errs.push('scene never became ready (wrong id or a throw in draw?)'));
const out = resolve(opt.out || `${opt.scene}-frames.png`);
await (await p.$('#root')).screenshot({ path: out });
await b.close();
console.log(out);
if (errs.length) {
  console.log('errors:\n' + errs.join('\n'));
  process.exitCode = 2;
}
