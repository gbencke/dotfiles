// Checks a scene's motion frame by frame at 60 fps and reports glitches a contact sheet can miss.
// usage: node motion.mjs --scene <id> --src <scene.js> [--src more.js]
// Needs playwright, like frames.mjs. Exit code 2 when something is found.
//
// jump              a joint teleports between two frames (a snap or twitch)
// arm-through-face  the near arm passes through the head
// head-covered     something is drawn over a figure's head (a note, a prop, a bubble)
// bent-back-elbow   an elbow bends the wrong way (the forearm folds backwards)
// elbow-out-back    the upper arm swings back and the forearm folds forward to a low hand (a broken wing)
// squash            a figure is squashed sideways (turn it with sx = ±1 instead)
// skate             both planted feet slide along the ground
// reach-short       the hand is aimed at something past the arm's reach
// start-pop         the first action frame doesn't match the idle before it
// end-pop           the last action frame doesn't match the idle after it
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = { src: [] };
for (let i = 0; i < args.length; i += 2) {
  const k = args[i].replace(/^--/, '');
  if (k === 'src') {
    opt.src.push(args[i + 1]);
  } else {
    opt[k] = args[i + 1];
  }
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
const runtime = readFileSync(resolve(here, '../runtime/stick.js'), 'utf8');
const hook = '    return J;\n';
if (!runtime.includes(hook)) {
  console.error('runtime changed: cannot find the fig() return to instrument');
  process.exit(1);
}
const rec = `    if (window.__rec) {
      window.__rec.push({ x, y, s, sx, sh, handF, handB, eF, eB, hc, fF: p.fF, fB: p.fB, kF, kB, wantF: Math.hypot(p.hF[0] - sh[0], p.hF[1] - sh[1]), alpha: opt.alpha ?? 1, ink: opt.ink || C.ink, bot: !!opt.bot, m: (() => { const t = g.getTransform(); return [t.a, t.b, t.c, t.d, t.e, t.f]; })() });
    }
`;
const instrumented = runtime.replace(hook, rec + hook);

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await pw.chromium.launch(existsSync(chrome) ? { executablePath: chrome, headless: true } : { headless: true });
const p = await b.newPage({ viewport: { width: 420, height: 260 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0"></body>');
await p.addScriptTag({ content: instrumented });
for (const s of opt.src) {
  await p.addScriptTag({ url: pathToFileURL(resolve(s)).href }).catch(async () => {
    await p.addScriptTag({ content: readFileSync(resolve(s), 'utf8') });
  });
}
const data = await p.evaluate(async (id) => {
  const el = document.createElement('stick-scene');
  el.setAttribute('scene', id);
  el.setAttribute('play', 'idle');
  el.setAttribute('no-font', '');
  el.style.cssText = 'display:block;width:380px;height:230px';
  document.body.appendChild(el);
  for (let i = 0; i < 300 && !el.v; i++) {
    await new Promise((r) => requestAnimationFrame(r));
  }
  if (!el.v) {
    return null;
  }
  const def = window.STICK.SCENES[id];
  const FPS = 60, T0 = 5;
  const out = [];
  const v = el.v;
  const g2 = v.cv.getContext('2d');
  const hex = (c) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(c || '');
    return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null;
  };
  // A head is a solid disc in the figure's ink. Sample it after the whole frame is drawn: if most of it
  // isn't ink any more, something was drawn on top of the face.
  const covered = (f) => {
    const ink = hex(f.ink);
    if (!ink || f.bot || f.alpha < 1) {
      return false;
    }
    // f.m is the canvas transform when fig() drew this figure, so camera pans and zooms are included.
    const [ma, mb, mc, md, me, mf] = f.m;
    const cx = f.x + f.hc[0] * f.s * f.sx, cy = f.y + f.hc[1] * f.s, r = 7.8 * f.s * 0.55;
    let off = 0;
    for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
      const wx = cx + dx, wy = cy + dy;
      const px = Math.round(ma * wx + mc * wy + me), py = Math.round(mb * wx + md * wy + mf);
      if (px < 0 || py < 0 || px >= v.cv.width || py >= v.cv.height) {
        continue;
      }
      const d = g2.getImageData(px, py, 1, 1).data;
      if (Math.abs(d[0] - ink[0]) + Math.abs(d[1] - ink[1]) + Math.abs(d[2] - ink[2]) > 90) {
        off++;
      }
    }
    return off >= 3;
  };
  const snap = (o, T, phase) => {
    window.__rec = [];
    window.STICK.at(el, o);
    const figs = JSON.parse(JSON.stringify(window.__rec));
    figs.forEach((f) => {
      f.covered = covered(f);
    });
    out.push({ T, phase, figs });
    window.__rec = null;
  };
  for (let i = 0; i < 30; i++) {
    snap({ idle: T0 - 0.5 + i / FPS, since: 99 }, -0.5 + i / FPS, 'idle');
  }
  if (def.loopOnly) {
    for (let i = 0; i < 6 * FPS; i++) {
      snap({ idle: T0 + i / FPS, since: 99 }, i / FPS, 'loop');
    }
  } else {
    const n = Math.round(def.dur * FPS);
    for (let i = 0; i <= n; i++) {
      const u = Math.min(0.9999, i / n);
      snap({ u, t: T0 + u * def.dur }, u * def.dur, 'act');
    }
    for (let i = 1; i <= 30; i++) {
      snap({ idle: T0 + def.dur + i / FPS, since: i / FPS }, def.dur + i / FPS, 'post');
    }
  }
  return { dur: def.dur, loopOnly: !!def.loopOnly, frames: out };
}, opt.scene);
await b.close();
if (!data) {
  console.error(`scene "${opt.scene}" never became ready${errs.length ? ': ' + errs.join('; ') : ''}`);
  process.exit(1);
}

const HEAD_R = 7.8, ARM = 42;
const W = (f, q) => [f.x + q[0] * f.s * f.sx, f.y + q[1] * f.s];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const segDist = (pt, a, c) => {
  const vx = c[0] - a[0], vy = c[1] - a[1];
  const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * vx + (pt[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(pt[0] - (a[0] + t * vx), pt[1] - (a[1] + t * vy));
};
const found = [];
const add = (kind, T, note) => {
  const last = found.findLast((x) => x.kind === kind && x.note.split(' ')[0] === note.split(' ')[0]);
  if (last && T - last.to < 0.12) {
    last.to = T;
    return;
  }
  found.push({ kind, from: T, to: T, note });
};
const F = data.frames;
F.forEach((fr, i) => {
  fr.figs.forEach((f, k) => {
    if (Math.abs(f.sx) > 0.05 && Math.abs(f.sx) < 0.95) {
      add('squash', fr.T, `fig${k} sx ${f.sx.toFixed(2)}`);
    }
    if (segDist(f.hc, f.eF, f.handF) < HEAD_R - 1.5 || segDist(f.hc, f.sh, f.eF) < HEAD_R - 2.5) {
      add('arm-through-face', fr.T, `fig${k}`);
    }
    for (const [e, h, name] of [[f.eF, f.handF, 'front'], [f.eB, f.handB, 'back']]) {
      const u = [e[0] - f.sh[0], e[1] - f.sh[1]], v = [h[0] - e[0], h[1] - e[1]];
      const lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
      if (lu > 1 && lv > 1 && (u[0] * v[1] - u[1] * v[0]) / (lu * lv) > 0.3) {
        add('bent-back-elbow', fr.T, `fig${k} ${name} arm`);
      }
      if (lu > 1 && lv > 1 && u[0] / lu < -0.55 && v[0] / lv > 0.25 && v[1] > 0) {
        add('elbow-out-back', fr.T, `fig${k} ${name} arm`);
      }
    }
    if (f.covered) {
      add('head-covered', fr.T, `fig${k}`);
    }
    if (fr.phase === 'act' && f.wantF > ARM + 10) {
      add('reach-short', fr.T, `fig${k} by ${(f.wantF - ARM).toFixed(0)}`);
    }
  });
  if (i < 1 || i >= F.length - 1) {
    return;
  }
  const a = F[i - 1], c = F[i + 1];
  if (a.figs.length !== fr.figs.length || c.figs.length !== fr.figs.length) {
    return;
  }
  fr.figs.forEach((f, k) => {
    const fa = a.figs[k], fc = c.figs[k];
    if (Math.sign(fa.sx) !== Math.sign(f.sx) || Math.sign(fc.sx) !== Math.sign(f.sx) || f.alpha < 1) {
      return;
    }
    for (const j of ['handF', 'handB', 'eF', 'eB', 'hc', 'kF', 'kB', 'fF', 'fB']) {
      const pa = W(fa, fa[j]), pb = W(f, f[j]), pc = W(fc, fc[j]);
      const acc = Math.hypot(pc[0] - 2 * pb[0] + pa[0], pc[1] - 2 * pb[1] + pa[1]);
      if (acc > 6) {
        add('jump', fr.T, `fig${k} ${j} ${acc.toFixed(1)}`);
      }
    }
    const planted = [f.fF, f.fB, fa.fF, fa.fB].every((q) => q[1] > -4);
    const dF = W(f, f.fF)[0] - W(fa, fa.fF)[0], dB = W(f, f.fB)[0] - W(fa, fa.fB)[0];
    if (planted && Math.abs(dF) > 1.2 && Math.abs(dB) > 1.2 && Math.sign(dF) === Math.sign(dB)) {
      add('skate', fr.T, `fig${k} ${dF.toFixed(1)}/frame`);
    }
  });
});
const poseGap = (x, y) => {
  if (!x || !y || x.figs.length !== y.figs.length) {
    return x && y ? [`figure count ${x.figs.length}->${y.figs.length}`] : [];
  }
  return x.figs.map((f, k) => {
    const g = y.figs[k];
    const m = Math.max(...['handF', 'handB', 'hc', 'fF', 'fB'].map((j) => dist(W(f, f[j]), W(g, g[j]))));
    return m > 4 || Math.sign(f.sx) !== Math.sign(g.sx) ? `fig${k} ${m.toFixed(1)}` : null;
  }).filter(Boolean);
};
if (!data.loopOnly) {
  for (const n of poseGap(F.filter((f) => f.phase === 'idle').at(-1), F.find((f) => f.phase === 'act'))) {
    add('start-pop', 0, n);
  }
  for (const n of poseGap(F.filter((f) => f.phase === 'act').at(-1), F.find((f) => f.phase === 'post'))) {
    add('end-pop', data.dur, n);
  }
}
if (errs.length) {
  console.log('errors:\n' + errs.join('\n'));
}
if (!found.length) {
  console.log(`${opt.scene}: motion is clean`);
  process.exit(errs.length ? 2 : 0);
}
console.log(`${opt.scene}: ${found.length} finding(s)`);
for (const x of found) {
  console.log(`  ${x.kind.padEnd(17)} ${x.from.toFixed(2)}–${x.to.toFixed(2)}s  ${x.note}`);
}
process.exitCode = 2;
