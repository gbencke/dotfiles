(function () {
  const SC = (window.SCENES = window.SCENES || {});
  const R = window.RIG;
  const { C, FS, TAU, E, P, mix, seq, legs, walkSeg, fig, inkFill, rr, ln, poly, circle, text, lerp, L2, clamp, seg, breathe, star, arcPt, sparks, hash, inWorld, pulse, lp, sxv, partial, strokePath, FONT } = R;

  const CLAUDE = '#d97757';
  const DARK = '#262626';

  function stand(g, x, y, w, h) {
    ln(g, x + 24, y + h, x + 14, 0, 2.2);
    ln(g, x + w - 24, y + h, x + w - 14, 0, 2.2);
  }
  function win(g, x, y, w, h, o) {
    const opt = o || {};
    rr(g, x, y, w, h, 6);
    inkFill(g, C.paper, 1.6);
    if (opt.dark) {
      rr(g, x + 1.5, y + 12, w - 3, h - 13.5, 4.5);
      g.fillStyle = DARK;
      g.fill();
    }
    ln(g, x, y + 12, x + w, y + 12, 1.3);
    for (let i = 0; i < 3; i++) {
      circle(g, x + 8 + i * 7, y + 6, 2);
      inkFill(g, C.paper, 1);
    }
    if (opt.title) {
      text(g, opt.title, x + w / 2 + 10, y + 9.4, 9, C.muted);
    }
  }
  function tickBadge(g, x, y, k, r, a) {
    if (k <= 0 || a === 0) {
      return;
    }
    const rad = r || 8;
    const s = E.back(clamp(k * 1.6, 0, 1));
    g.save();
    g.globalAlpha *= a ?? 1;
    g.translate(x, y);
    g.scale(s, s);
    circle(g, 0, 0, rad);
    inkFill(g, C.green, 1.3, C.greenInk);
    strokePath(g, partial([[-rad * 0.45, 0], [-rad * 0.1, rad * 0.38], [rad * 0.5, -rad * 0.38]], clamp(k * 2 - 0.4, 0.01, 1)), 1.8, C.greenInk);
    g.restore();
  }
  function cylinder(g, cx, top, w, h, fill, bands) {
    const rx = w / 2, ry = 7, bot = top + h - ry;
    g.beginPath();
    g.moveTo(cx - rx, top);
    g.lineTo(cx - rx, bot);
    g.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true);
    g.lineTo(cx + rx, top);
    g.closePath();
    inkFill(g, fill, 1.6);
    for (let i = 1; i <= (bands || 0); i++) {
      g.beginPath();
      g.ellipse(cx, top + (h - ry) * (i / ((bands || 0) + 1)), rx, ry, 0, 0, Math.PI);
      inkFill(g, null, 1.1, 'rgba(20,20,20,0.45)');
    }
    g.beginPath();
    g.ellipse(cx, top, rx, ry, 0, 0, TAU);
    inkFill(g, '#f3fbf4', 1.6);
  }
  function leaf(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.beginPath();
    g.moveTo(0, -11);
    g.quadraticCurveTo(7, -3, 0, 9);
    g.quadraticCurveTo(-7, -3, 0, -11);
    inkFill(g, C.green, 1.2, C.greenInk);
    ln(g, 0, -6, 0, 12, 1.2, C.greenInk);
    g.restore();
  }
  function envelope(g, x, y, rot, s, fill) {
    g.save();
    g.translate(x, y);
    g.rotate(rot || 0);
    g.scale(s || 1, s || 1);
    rr(g, -9, -6, 18, 12, 1.5);
    inkFill(g, fill || C.paper, 1.3);
    poly(g, [[-9, -6], [0, 1], [9, -6]]);
    inkFill(g, null, 1.1);
    g.restore();
  }
  function asterisk(g, x, y, r, rot, col) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const L = r * (i % 2 ? 0.7 : 1);
      ln(g, Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18, Math.cos(a) * L, Math.sin(a) * L, Math.max(1.4, r * 0.2), col || CLAUDE);
    }
    g.restore();
  }
  function heart(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.beginPath();
    g.moveTo(0, 4);
    g.bezierCurveTo(-7, -1, -5, -7, 0, -3.5);
    g.bezierCurveTo(5, -7, 7, -1, 0, 4);
    g.closePath();
    g.restore();
  }
  function twidth(g, s, size) {
    g.font = FONT(size);
    return g.measureText(s).width;
  }

  // ---------- mondex: the index clerk ----------
  const MX = { cx: 70, top: -114, w: 66, rows: [-92, -72, -52], gx: -5 };
  function mxTab(g, x, y, fill, label, rot, a) {
    if (a <= 0.01) {
      return;
    }
    g.save();
    g.globalAlpha *= a;
    g.translate(x, y);
    g.rotate(rot || 0);
    rr(g, -2, -7, 50, 14, 3);
    inkFill(g, fill, 1.3);
    text(g, label, 19, 3.3, 9, '#3d3d3d');
    g.restore();
  }
  function mxPaper(g, x, y, rot, done) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    rr(g, -12, -16, 24, 30, 2);
    inkFill(g, C.paper, 1.3);
    ln(g, -7, -10, -3, -10, 1.6, C.ink);
    ln(g, -4, -6, 7, -6, 2, C.greenInk);
    ln(g, -4, -1, 5, -1, 2, '#6b8fb3');
    ln(g, -4, 4, 8, 4, 2, done ? C.faint : C.redInk);
    ln(g, -7, 9, -3, 9, 1.6, C.ink);
    g.restore();
  }
  SC['p:mondex'] = {
    dur: 5.2,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const READ = P({ hF: [22, -72], hB: [15, -70], head: [7, -112], chest: [2, -90] });
      const CARRY = P({ hF: [12, -56], hB: [-6, -54], head: [4, -116] });
      let x = -72, sx = 1, pose, carry = 0;
      let newTab = null, newA = 0, oldTab = [MX.gx, MX.rows[2], 0], oldA = 1, plan = 0, chk = [0, 0], payoff = -1;
      if (T < 0) {
        const glance = pulse(S.t, 7, 3, 1.8);
        pose = breathe(P({ head: [7 + glance * 3, -112 - glance * 4] }, READ), S.t, 0.7);
      } else {
        carry = E.soft(seg(T, 0, 0.35)) * (1 - E.soft(seg(T, 4.2, 4.6)));
        plan = E.soft(seg(T, 0.2, 0.5)) * (1 - E.soft(seg(T, 4.6, 5.1)));
        const reachN = lp([MX.gx - 1, MX.rows[1]], -28, 0);
        const reachO = lp([MX.gx - 1, MX.rows[2]], -28, 0);
        const pullO = lp([-19, -58], -28, 0);
        const flick = [-24, -62];
        const H = (hf, ef) => P({ hF: hf, hB: [-6, -54], head: [7, -114], chest: [3, -90], ef: ef ?? 1 });
        const KEYS = [[1.0, H(CARRY.hF)], [1.35, H(reachN)], [1.5, H(reachN)], [1.65, H([16, -62])], [1.9, H(reachO)], [2.2, H(pullO, 0.35)], [2.4, H(flick, 0)], [2.75, H([14, -58])], [3.1, H(CARRY.hF)]];
        const rel = seq(2.3, KEYS).hF;
        const BASEP = mix(READ, CARRY, carry);
        if (T < 1.0) {
          const w = walkSeg(T, 0.3, 1.0, -72, -28);
          x = w.x;
          pose = legs(BASEP, w.ph, w.amp, { stride: w.stride });
        } else if (T < 3.1) {
          x = -28;
          pose = seq(T, KEYS);
        } else if (T < 4.3) {
          x = -28;
          sx = sxv(Math.cos(Math.PI * E.soft(seg(T, 3.1, 3.3))));
          if (T > 3.3) {
            const w = walkSeg(T, 3.3, 4.1, -28, -72);
            x = w.x;
            sx = sxv(-Math.cos(Math.PI * E.soft(seg(T, 4.1, 4.3))));
            pose = legs(BASEP, w.ph, w.amp, { stride: w.stride });
          } else {
            pose = BASEP;
          }
        } else {
          pose = BASEP;
        }
        pose = breathe(pose, S.t, 0.5);
        const hw = [x + pose.hF[0] * FS * sx, pose.hF[1] * FS];
        newA = E.soft(seg(T, 0.2, 0.45)) * (1 - E.soft(seg(T, 4.7, 5.2)));
        newTab = T < 1.5 ? [hw[0], hw[1], T < 1.0 ? -0.25 : -0.25 * (1 - seg(T, 1.0, 1.35))] : [MX.gx, MX.rows[1], 0];
        if (T >= 2.0 && T < 2.3) {
          oldTab = [hw[0], hw[1], -0.1 * seg(T, 2.0, 2.3)];
        } else if (T >= 2.3) {
          const k = seg(T, 2.3, 2.9);
          const p = arcPt([-28 + rel[0] * FS, rel[1] * FS], [-128, -4], 40, E.lin(k));
          oldTab = [p[0], p[1], -0.1 - k * 5.5];
          oldA = (1 - seg(T, 3.0, 3.5)) + E.soft(seg(T, 4.7, 5.2));
          if (T >= 4.7) {
            oldTab = [MX.gx, MX.rows[2], 0];
            oldA = E.soft(seg(T, 4.7, 5.2));
          }
        }
        chk = [seg(T, 1.35, 1.6), seg(T, 2.3, 2.55)];
        payoff = seg(T, 2.55, 3.3);
      }
      mxTab(g, MX.gx, MX.rows[0], '#bfdbfe', 'userId', 0, 1);
      mxTab(g, oldTab[0], oldTab[1], '#fecaca', 'legacy', oldTab[2], oldA);
      if (newTab) {
        mxTab(g, newTab[0], newTab[1], '#bbf7d0', 'email', newTab[2], newA);
      }
      cylinder(g, MX.cx, MX.top, MX.w, -MX.top, '#e9f6ec', 2);
      leaf(g, MX.cx, -30, 1);
      if (plan > 0.01) {
        g.save();
        g.globalAlpha *= plan;
        const py = -170 + (1 - plan) * 8;
        rr(g, 26, py, 88, 44, 4);
        inkFill(g, C.paper, 1.4);
        text(g, 'mondex plan', 70, py + 12, 9, C.muted);
        text(g, '+ email', 36, py + 26, 9, C.greenInk, 'left');
        text(g, '− legacy', 36, py + 39, 9, C.redInk, 'left');
        for (let i = 0; i < 2; i++) {
          if (chk[i] > 0) {
            strokePath(g, partial([[90, py + 22 + i * 13], [93, py + 25 + i * 13], [99, py + 18 + i * 13]], chk[i]), 1.6, C.greenInk);
          }
        }
        g.restore();
        tickBadge(g, 114, -168, payoff, 7, S.w);
        sparks(g, 114, -168, payoff, 14, 5, C.greenInk);
      }
      const paperK = T < 0 ? 0 : carry;
      return fig(g, pose, x, 0, {
        sx,
        wave: S.wave, wt: S.wt,
        mid: (gg, J) => {
          if (paperK >= 0.5) {
            mxPaper(gg, J.handB[0] - 2, J.handB[1] + 10, 0.1, T > 2.3);
          }
        },
        held: (gg, J) => {
          if (paperK < 0.5) {
            const c = L2(J.handF, J.handB, 0.5);
            mxPaper(gg, c[0] + 3, c[1] - 8, -0.12, false);
          }
        },
      });
    },
  };

  // ---------- mongodumper: the night porter ----------
  function dumpBox(g, x, y, rot, s, a) {
    if (a <= 0.01 || s <= 0.01) {
      return;
    }
    g.save();
    g.globalAlpha *= a;
    g.translate(x, y);
    g.rotate(rot);
    g.scale(s, s);
    rr(g, -15, -10, 30, 20, 2);
    inkFill(g, C.wood, 1.4);
    ln(g, -15, -4, 15, -4, 1, C.woodDk);
    text(g, 'dump', 0, 6, 9, C.umber);
    g.restore();
  }
  function s3bucket(g, cx, rim, wob, n, newA) {
    g.save();
    g.translate(cx, 0);
    g.rotate(wob);
    g.beginPath();
    g.ellipse(0, rim - 2, 30, 20, 0, Math.PI, TAU);
    inkFill(g, null, 2.2);
    g.beginPath();
    g.ellipse(0, rim, 34, 7, 0, 0, TAU);
    inkFill(g, '#cfd4da', 1.4);
    const slots = [[-14, 0.18], [8, -0.12], [-2, 0.05]];
    for (let i = 0; i < 3; i++) {
      const a = i < 2 ? 1 : newA;
      if (i >= n || a <= 0.01) {
        continue;
      }
      g.save();
      g.globalAlpha *= a;
      g.translate(slots[i][0], rim - 4 - (i === 2 ? 4 : 0));
      g.rotate(slots[i][1]);
      rr(g, -11, -8, 22, 14, 2);
      inkFill(g, C.wood, 1.2);
      g.restore();
    }
    g.beginPath();
    g.moveTo(-34, rim);
    g.lineTo(-24, -2);
    g.quadraticCurveTo(0, 3, 24, -2);
    g.lineTo(34, rim);
    g.ellipse(0, rim, 34, 7, 0, 0, Math.PI, false);
    g.closePath();
    inkFill(g, C.steel, 1.6);
    ln(g, -30, rim + 16, 30, rim + 16, 1, 'rgba(20,20,20,0.25)');
    text(g, 'S3', 0, rim + 38, 15, C.ink);
    g.restore();
  }
  SC['p:mongodumper'] = {
    dur: 4.4,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -64, db = { cx: -128, top: -96, w: 56 };
      const IDLE = P({ hF: [12, -56], hB: [-4, -56], head: [4, -116] });
      const HUG = P({ hF: [18, -68], hB: [13, -66], head: [6, -114] });
      const WIND = P({ hF: [2, -50], hB: [-4, -50], ef: 0.4, chest: [-3, -89], head: [-3, -114], fF: [12, -2.5], fB: [-10, -2.5] });
      const THROW = P({ hF: [28, -106], hB: [22, -102], chest: [6, -90], head: [10, -113], hip: [2, -59], fF: [14, -2.5], fB: [-12, -2.5] });
      let sx = 1, pose, boxP = null, boxA = 0, boxS = 1, n = 2, newA = 0, wob = 0, payoff = -1;
      if (T < 0) {
        const tap = Math.max(0, Math.sin(S.t * 6)) * pulse(S.t, 5, 1, 1.6);
        pose = breathe(P({ fF: [6, -2.5 - tap * 3], head: [4 + pulse(S.t, 7, 4, 1.5) * 3, -116] }, IDLE), S.t);
      } else {
        sx = T < 1.2 ? sxv(Math.cos(Math.PI * E.soft(seg(T, 0, 0.3)))) : 1;
        if (T >= 0.8 && T < 1.2) {
          sx = sxv(-Math.cos(Math.PI * E.soft(seg(T, 0.85, 1.15))));
        }
        const REACH = P({ hF: lp([-97, -60], x, 0, -1), hB: [6, -60], chest: [4, -89], head: [8, -114] });
        const KEYS = [[0, IDLE], [0.3, IDLE], [0.6, REACH], [0.7, REACH], [0.95, HUG], [1.25, HUG], [1.55, WIND, E.soft], [1.8, THROW], [2.0, THROW], [2.7, IDLE]];
        const handsAt = (p, s) => [x + ((p.hF[0] + p.hB[0]) / 2) * FS * s, ((p.hF[1] + p.hB[1]) / 2) * FS - 4];
        pose = breathe(seq(T, KEYS), S.t, 0.5);
        const hw = handsAt(pose, sx);
        const rel = handsAt(seq(1.7, KEYS), 1);
        if (T >= 0.55 && T < 1.7) {
          boxP = hw;
          boxA = 1;
          boxS = E.back(seg(T, 0.55, 0.8));
        } else if (T >= 1.7 && T < 2.55) {
          const k = seg(T, 1.7, 2.55);
          boxP = arcPt(rel, [114, -60], 56, k);
          boxA = 1;
          boxS = 1 - k * 0.25;
          boxP.push(k * TAU * 1.25);
        }
        if (T >= 2.55) {
          n = 3;
          newA = 1 - E.soft(seg(T, 4.0, 4.4));
          const dt = T - 2.55;
          wob = Math.sin(dt * 18) * Math.exp(-dt * 5) * 0.07;
        }
        payoff = seg(T, 2.6, 3.4);
      }
      cylinder(g, db.cx, db.top, db.w, -db.top, '#e9f6ec', 2);
      leaf(g, db.cx, -24, 0.9);
      rr(g, -104, -72, 5, 22, 2);
      g.fillStyle = C.ink;
      g.fill();
      s3bucket(g, 116, -58, wob, n, newA);
      if (payoff > 0) {
        tickBadge(g, 116, -130, payoff, 8, S.w);
        sparks(g, 116, -130, payoff, 16, 6, C.greenInk);
      }
      const J = fig(g, pose, x, 0, { sx, wave: S.wave, wt: S.wt });
      if (boxP) {
        dumpBox(g, boxP[0], boxP[1], boxP[2] || 0, boxS, boxA);
      }
      return J;
    },
  };

  // ---------- slack-msg: the stomper ----------
  function plane(g, x, y, ang, s) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.scale(s, s);
    poly(g, [[10, 0], [-8, -7], [-4, 0], [-8, 6]], true);
    inkFill(g, C.paper, 1.3);
    ln(g, -4, 0, 10, 0, 1, C.ink);
    g.restore();
  }
  function slackMsg(g, x, y, fill, w1, w2, label, a) {
    if (a <= 0.01) {
      return;
    }
    g.save();
    g.globalAlpha *= a;
    rr(g, x, y, 13, 13, 3);
    inkFill(g, fill, 1.1);
    ln(g, x + 18, y + 3, x + 18 + w1, y + 3, 2.2, C.ink);
    if (label) {
      text(g, label, x + 18, y + 14, 9.5, '#3d3d3d', 'left');
    } else {
      ln(g, x + 18, y + 10, x + 18 + w2, y + 10, 2, C.faint);
    }
    g.restore();
  }
  SC['p:slack-msg'] = {
    dur: 3.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -98;
      const IDLE = P({ fF: [8, -2.5], kF: [28, -36], hF: [10, -58], hB: [-2, -57], head: [4, -116] });
      const LIFT = P({ fF: [24, -36], kF: [36, -50], hip: [-3, -60], chest: [-4, -90], head: [-3, -116], hF: [26, -82], hB: [-28, -62], eb: 0.3 });
      const press = T >= 0 ? E.out(seg(T, 0.6, 0.68)) * (1 - E.soft(seg(T, 0.95, 1.2))) : 0;
      const keyTop = -15 + press * 5;
      const STOMP = P({ fF: lp([-50, keyTop - 1.5], x, 0), kF: [42, -46], hip: [3, -58], chest: [5, -89], head: [8, -114], hF: [26, -76], hB: [-24, -60], eb: 0.3 });
      const CHEER = P({ hF: [12, -132], hB: [-4, -58], head: [5, -119] });
      let pose;
      const tap = T < 0 ? Math.max(0, Math.sin(S.t * 7)) * pulse(S.t, 4.5, 1, 1.8) : 0;
      if (T < 0) {
        pose = breathe(P({ fF: [8, -2.5 - tap * 4] }, IDLE), S.t);
      } else {
        pose = seq(T, [[0, IDLE], [0.34, LIFT, E.out], [0.44, LIFT], [0.62, STOMP, E.in], [0.9, STOMP], [1.3, IDLE], [1.9, IDLE], [2.2, CHEER], [2.6, CHEER], [3.1, IDLE]]);
        pose = breathe(pose, S.t, 0.5);
      }
      const tx = -178, ty = -160, tw = 126, th = 56;
      stand(g, tx, ty, tw, th);
      win(g, tx, ty, tw, th, { dark: true });
      text(g, '$ slack-msg', tx + 8, ty + 27, 9.5, '#e5e5e5', 'left');
      const sent = T >= 0 && T > 0.66;
      const cur = !sent && Math.sin((S.t + 0.1) * 6) > 0;
      text(g, '"shipped!"' + (cur ? ' _' : ''), tx + 20, ty + 40, 9.5, C.butterHi, 'left');
      if (sent && T < 3.5) {
        text(g, 'sent', tx + 8, ty + 52, 9, '#86d39a', 'left');
      }
      const kx = -74, kw = 50;
      rr(g, kx - 2, -12, kw + 4, 12, 3);
      inkFill(g, '#d6d6d6', 1.5);
      rr(g, kx, keyTop, kw, 12, 3);
      inkFill(g, press > 0.3 ? C.butterHi : C.paper, 1.5);
      text(g, 'enter', kx + kw / 2, keyTop + 9, 9, C.muted);
      if (T >= 0) {
        sparks(g, kx + kw / 2, keyTop - 2, seg(T, 0.64, 1.0), 14, 5);
      }
      const sx0 = 50, sy0 = -160, sw = 126, sh = 104;
      stand(g, sx0, sy0, sw, sh);
      win(g, sx0, sy0, sw, sh, { title: '# general' });
      const land = T >= 0 ? seg(T, 1.75, 2.05) : 0;
      const up = T >= 0 && T < 3.4 ? E.out(land) * 14 : 0;
      g.save();
      rr(g, sx0 + 2, sy0 + 13, sw - 4, sh - 15, 4);
      g.clip();
      slackMsg(g, sx0 + 8, sy0 + 20 - up, '#bfdbfe', 30, 70, null, 1);
      slackMsg(g, sx0 + 8, sy0 + 42 - up, '#fbcfe8', 24, 56, null, 1);
      slackMsg(g, sx0 + 8, sy0 + 64 - up, '#bbf7d0', 34, 48, null, 1);
      if (land > 0 && T < 3.4) {
        slackMsg(g, sx0 + 8, sy0 + 86 - up, C.butter, 22, 0, 'shipped!', land);
      }
      g.restore();
      if (T >= 0 && T < 3.4) {
        const r = E.back(seg(T, 2.2, 2.45));
        if (r > 0) {
          g.save();
          g.translate(sx0 + 98, sy0 + 82);
          g.scale(r, r);
          rr(g, -12, -7, 24, 13, 6);
          inkFill(g, C.butterSoft, 1.1, C.amber);
          text(g, '+1', 0, 3.4, 9, C.umber);
          g.restore();
        }
      }
      if (T >= 0) {
        const k = seg(T, 0.7, 1.75);
        if (k > 0 && k < 1) {
          const a = [tx + tw - 4, ty + 32], b = [sx0 + 30, sy0 + 82];
          const e = E.io(k);
          const p = arcPt(a, b, 50, e), q = arcPt(a, b, 50, Math.min(1, e + 0.02));
          plane(g, p[0], p[1], Math.atan2(q[1] - p[1], q[0] - p[0]), 1.1);
        }
      }
      return fig(g, pose, x, 0, { wave: S.wave, wt: S.wt });
    },
  };

  // ---------- local-ses: the mail catcher ----------
  function sesCloud(g, x, y) {
    g.beginPath();
    g.arc(x - 18, y + 2, 11, Math.PI * 0.5, Math.PI * 1.5);
    g.arc(x - 4, y - 8, 14, Math.PI * 1.05, Math.PI * 1.85);
    g.arc(x + 14, y - 1, 12, Math.PI * 1.3, Math.PI * 0.5);
    g.closePath();
    inkFill(g, C.sky, 1.5);
    text(g, 'AWS SES', x - 2, y + 6, 9, C.muted);
  }
  SC['p:local-ses'] = {
    dur: 4.6,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = 12, L = 78;
      const A = [-152, -66], B = [138, -146], H = 26, kc = 0.6, t0 = 0.35, fl = 1.7;
      const hand0 = [x + 24 * FS, -70 * FS];
      const I = arcPt(A, B, H, kc);
      const aI = Math.atan2(I[1] - hand0[1], I[0] - hand0[0]);
      const tc = t0 + fl * kc;
      const a0 = -1.22 + Math.sin(S.t * 1.2) * 0.05;
      let ang = a0, env = null, inBag = false, row = 0, payoff = -1, drop = null;
      if (T >= 0) {
        ang = nAng(T, [[0, a0], [0.75, -0.95], [tc - 0.2, -0.88], [tc, aI, E.in], [tc + 0.2, -2.05, E.out], [tc + 0.45, -2.05], [2.4, -0.42], [2.9, -0.42], [3.5, a0]]);
        if (T >= t0 && T < tc) {
          const k = (T - t0) / fl;
          env = arcPt(A, B, H, k);
          env.push(Math.sin(T * 9) * 0.25);
        } else if (T >= tc && T < 2.45) {
          inBag = true;
        } else if (T >= 2.45 && T < 2.75) {
          drop = seg(T, 2.45, 2.75);
        }
        row = E.out(seg(T, 2.7, 2.95)) * (1 - E.soft(seg(T, 4.2, 4.6)));
        payoff = seg(T, 2.85, 3.6);
      }
      const dir = [Math.cos(ang), Math.sin(ang)];
      const tipW = [hand0[0] + dir[0] * L, hand0[1] + dir[1] * L];
      rr(g, -178, -34, 48, 34, 3);
      inkFill(g, C.wood, 1.5);
      text(g, 'app', -154, -14, 9, C.umber);
      rr(g, -172, -64, 36, 26, 3);
      inkFill(g, C.paper, 1.5);
      ln(g, -178, -35, -130, -35, 2.2);
      envelope(g, -154, -51, 0, 0.8, C.butterSoft);
      sesCloud(g, 140, -152);
      const ix = 66, iy = -98, iw = 110, ih = 64;
      stand(g, ix, iy, iw, ih);
      win(g, ix, iy, iw, ih, { title: 'localhost:8282' });
      envelope(g, ix + 14, iy + 24, 0, 0.62);
      ln(g, ix + 26, iy + 24, ix + 70, iy + 24, 2, C.faint);
      if (row > 0.01) {
        g.save();
        g.globalAlpha *= row;
        rr(g, ix + 5, iy + 33 + (1 - row) * 6, iw - 10, 22, 4);
        inkFill(g, C.butterSoft, 1.1, C.amber);
        envelope(g, ix + 16, iy + 44 + (1 - row) * 6, 0, 0.62, C.paper);
        text(g, 'Welcome!', ix + 28, iy + 48 + (1 - row) * 6, 9.5, C.ink, 'left');
        g.restore();
      }
      if (payoff > 0) {
        tickBadge(g, ix + iw - 8, iy + 2, payoff, 7, S.w);
        sparks(g, ix + iw - 8, iy + 2, payoff, 14, 5, C.greenInk);
      }
      if (env) {
        envelope(g, env[0], env[1], env[2], 1);
      }
      if (drop !== null) {
        const p = L2([tipW[0] + 2, tipW[1] + 14], [ix + 50, iy + 44], E.in(drop));
        envelope(g, p[0], p[1], drop * 0.6, 1 - drop * 0.35);
      }
      const hb = [hand0[0] - dir[0] * 16, hand0[1] - dir[1] * 16 + 2];
      const pose = breathe(P({ hF: lp(hand0, x, 0), hB: lp(hb, x, 0), head: [6 + dir[0] * 3, -115 + dir[1] * 3], chest: [2, -90] }), S.t, 0.6);
      return fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => {
          inWorld(gg, J, () => {
            const h = J.W(J.handF);
            const back = [h[0] - dir[0] * 22, h[1] - dir[1] * 22];
            const tip = [h[0] + dir[0] * L, h[1] + dir[1] * L];
            ln(gg, back[0], back[1], tip[0], tip[1], 4.2, C.ink);
            ln(gg, back[0], back[1], tip[0], tip[1], 2, C.wood);
            const c = [tip[0] + dir[0] * 10, tip[1] + dir[1] * 10];
            const sway = Math.sin(S.t * 2.4) * 2;
            const bot = [c[0] + sway, c[1] + 22];
            gg.beginPath();
            gg.moveTo(c[0] - 11, c[1]);
            gg.quadraticCurveTo(c[0] - 8, c[1] + 16, bot[0], bot[1]);
            gg.quadraticCurveTo(c[0] + 8, c[1] + 16, c[0] + 11, c[1]);
            inkFill(gg, 'rgba(255,255,255,0.55)', 1.1, C.far);
            for (let i = -1; i <= 1; i++) {
              ln(gg, c[0] + i * 6, c[1] + 2, bot[0] + i * 1.5, bot[1] - 2, 0.8, C.soft);
            }
            ln(gg, c[0] - 9, c[1] + 9, c[0] + 9, c[1] + 9, 0.8, C.soft);
            if (inBag) {
              envelope(gg, c[0] + sway * 0.5, c[1] + 10, 0.2, 0.8);
            }
            gg.beginPath();
            gg.ellipse(c[0], c[1], 11, 4, 0, 0, TAU);
            inkFill(gg, null, 2, C.ink);
          });
        },
      });
    },
  };
  function nAng(t, keys) {
    if (t <= keys[0][0]) {
      return keys[0][1];
    }
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b[0]) {
        return lerp(a[1], b[1], (b[2] || E.soft)((t - a[0]) / (b[0] - a[0])));
      }
    }
    return keys[keys.length - 1][1];
  }

  // ---------- gitkot: the swiper ----------
  const GK = {
    px: -8, py: -140, pw: 48, ph: 88,
    repos: [['react', '#bfdbfe', '230k'], ['deno', '#bbf7d0', '98k'], ['htmx', '#ede9fe', '41k'], ['vite', '#fbcfe8', '69k'], ['bun', '#fed7aa', '74k'], ['zod', '#fecaca', '34k']],
  };
  function gkCard(g, i, x, y, w, h) {
    const r = GK.repos[((i % GK.repos.length) + GK.repos.length) % GK.repos.length];
    rr(g, x + 3, y + 3, w - 6, 26, 3);
    inkFill(g, r[1], 1.1);
    ln(g, x + 9, y + 11, x + 24, y + 11, 2, 'rgba(255,255,255,0.9)');
    ln(g, x + 9, y + 17, x + 30, y + 17, 2, 'rgba(255,255,255,0.9)');
    text(g, r[0], x + 5, y + 42, 10, C.ink, 'left');
    ln(g, x + 5, y + 49, x + w - 9, y + 49, 1.8, C.faint);
    ln(g, x + 5, y + 55, x + w - 17, y + 55, 1.8, C.faint);
    star(g, x + 9, y + 65, 3.6, 5, 0.45);
    inkFill(g, C.butterHi, 0.9);
    text(g, r[2], x + 15, y + 68.5, 9, C.muted, 'left');
  }
  SC['p:gitkot'] = {
    dur: 4.4,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -26;
      const { px, py, pw, ph } = GK;
      const scr = [px + 3, py + 9, pw - 6, ph - 17];
      const swipes = [0.3, 1.2, 2.1];
      let pos = S.n * 3, finger = [10, -62], tap = 0, liked = 0, big = 0;
      const bob = Math.sin(S.t * 1.6) * 1.2;
      if (T < 0) {
        const peek = pulse(S.t, 4.5, 2, 0.9) * 0.08;
        pos -= -peek;
        finger = [10 + Math.sin(S.t * 2) * 1.5, -62 - peek * 40];
      } else {
        let done = 0;
        swipes.forEach((t0) => {
          done += E.io(seg(T, t0 + 0.08, t0 + 0.45));
        });
        pos += done;
        finger = [10, -62];
        for (const t0 of swipes) {
          if (T >= t0 - 0.1 && T < t0 + 0.7) {
            const k = seg(T, t0 + 0.08, t0 + 0.45);
            const lift = seg(T, t0 + 0.45, t0 + 0.65);
            finger = [10 + Math.sin(Math.PI * lift) * 4, lerp(-62, -108, E.io(k)) + lift * 46 * E.soft(lift)];
          }
        }
        if (T >= 2.55) {
          const k = seg(T, 2.85, 3.0), k2 = seg(T, 3.05, 3.2);
          finger = L2([10, -108], [12, -94], E.soft(seg(T, 2.55, 2.85)));
          finger[1] += Math.sin(Math.PI * k) * 4 + Math.sin(Math.PI * k2) * 4;
          tap = Math.sin(Math.PI * k) + Math.sin(Math.PI * k2);
        }
        if (T >= 3.5) {
          finger = L2([12, -94], [10, -62], E.soft(seg(T, 3.5, 3.9)));
        }
        liked = E.back(seg(T, 3.15, 3.4));
        big = seg(T, 3.15, 3.9);
      }
      const hb = [px + 1, py + 64 + bob];
      const pose = breathe(P({ hF: lp([finger[0] - 2, finger[1] + 3 + bob], x, 0), hB: lp(hb, x, 0), head: [8, -113], chest: [3, -90] }), S.t, 0.6);
      return fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => {
          inWorld(gg, J, () => {
            gg.save();
            gg.translate(0, bob);
            rr(gg, px, py, pw, ph, 8);
            inkFill(gg, '#2b2b2b', 1.6);
            rr(gg, scr[0], scr[1], scr[2], scr[3], 3);
            gg.fillStyle = C.paper;
            gg.fill();
            gg.save();
            rr(gg, scr[0], scr[1], scr[2], scr[3], 3);
            gg.clip();
            const base = Math.floor(pos);
            for (let i = base - 1; i <= base + 1; i++) {
              gkCard(gg, i, scr[0], scr[1] + (i - pos) * scr[3], scr[2], scr[3]);
            }
            heart(gg, scr[0] + scr[2] - 6, scr[1] + scr[3] - 22, 0.9);
            inkFill(gg, liked > 0.05 ? '#f87171' : C.paper, 1.1, liked > 0.05 ? '#b91c1c' : C.ink);
            if (big > 0 && big < 1) {
              gg.save();
              gg.globalAlpha *= 1 - E.in(big);
              heart(gg, scr[0] + scr[2] / 2, scr[1] + 26 - big * 8, 2.2 + E.out(big) * 0.8);
              inkFill(gg, '#f87171', 1.3, '#b91c1c');
              gg.restore();
            }
            gg.restore();
            rr(gg, px + pw / 2 - 7, py + 3, 14, 3, 1.5);
            gg.fillStyle = '#555';
            gg.fill();
            gg.restore();
            if (tap > 0.05) {
              gg.save();
              gg.globalAlpha *= 0.6 * Math.min(1, tap);
              circle(gg, finger[0], finger[1] + bob - 2, 5 + tap * 3);
              inkFill(gg, null, 1.1, C.amber);
              gg.restore();
            }
            sparks(gg, scr[0] + scr[2] - 6, scr[1] + scr[3] - 22 + bob, seg(T, 3.2, 3.8), 9, 5, '#b91c1c');
          });
        },
      });
    },
  };

  // ---------- typingwise: the talker ----------
  const TW = { wx: -66, wy: -154, ww: 238, wh: 72, words: ['ship', 'it', 'on', 'friday'], fs: 12 };
  SC['p:typingwise'] = {
    dur: 4.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -128;
      const { wx, wy, ww, wh, words, fs } = TW;
      const lineY = wy + 34, lx = wx + 10;
      const xs = [];
      let cx = lx;
      for (const w of words) {
        xs.push(cx);
        cx += twidth(g, w + ' ', fs);
      }
      const ts = words.map((_, i) => 0.55 + i * 0.6);
      const LOW = P({ hF: [16, -70], hB: [-4, -56], head: [4, -116] });
      const TALK = P({ hF: [21, -94], hB: [-4, -56], head: [6, -115], chest: [2, -90] });
      let pose, talk = 0, typed = 0, payoff = -1, fade = 1;
      if (T < 0) {
        const hum = pulse(S.t, 6, 2, 1.4);
        pose = breathe(mix(LOW, TALK, hum * 0.5), S.t);
      } else {
        pose = seq(T, [[0, LOW], [0.35, TALK, E.out], [3.2, TALK], [3.7, LOW]]);
        talk = seg(T, 0.4, 3.0) > 0 && T < 3.0 ? 1 : 0;
        pose = breathe(pose, S.t, 0.4);
        if (talk) {
          const m = Math.abs(Math.sin(T * 14)) * 1.6;
          pose = Object.assign({}, pose, { head: [pose.head[0] + m * 0.4, pose.head[1] - m] });
        }
        payoff = seg(T, 3.2, 3.9);
        fade = 1 - E.soft(seg(T, 4.3, 4.8));
      }
      stand(g, wx, wy, ww, wh);
      win(g, wx, wy, ww, wh, { title: 'notes' });
      ln(g, lx, wy + 50, lx + 120, wy + 50, 2, '#ececec');
      ln(g, lx, wy + 60, lx + 80, wy + 60, 2, '#ececec');
      for (let i = 0; i < words.length; i++) {
        const k = T >= 0 ? seg(T, ts[i] + 0.4, ts[i] + 0.5) : 0;
        if (k > 0) {
          typed = i + 1;
          g.save();
          g.globalAlpha *= fade;
          text(g, words[i], xs[i], lineY, fs, C.ink, 'left');
          g.restore();
        }
      }
      const caretX = typed ? xs[typed - 1] + twidth(g, words[typed - 1], fs) + 2 : lx;
      if (Math.sin(S.t * 6) > 0) {
        ln(g, caretX, lineY - 10, caretX, lineY + 2, 1.4, C.amber);
      }
      if (payoff > 0) {
        tickBadge(g, wx + ww - 16, wy + 30, payoff, 7, S.w);
        sparks(g, wx + ww - 16, wy + 30, payoff, 14, 5, C.greenInk);
      }
      rr(g, -56, -12, 62, 12, 2);
      inkFill(g, '#efefef', 1.3);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 8; c++) {
          rr(g, -52 + c * 7, -9.5 + r * 4.5, 5.4, 3, 0.8);
          g.fillStyle = '#c4c4c4';
          g.fill();
        }
      }
      R.wline(g, [[-56, -12], [-46, -22], [-38, -12]], 0.8, C.far, 0.4, 3);
      ln(g, -46, -22, -46, -12, 0.7, C.far);
      ln(g, -51, -17, -42, -17, 0.7, C.far);
      for (let i = 0; i < 2; i++) {
        const zz = (S.t * 0.45 + i * 0.5) % 1;
        g.save();
        g.globalAlpha *= Math.sin(Math.PI * zz);
        text(g, 'z', -14 + zz * 8, -18 - zz * 22, 9 + zz * 3, C.muted);
        g.restore();
      }
      const J = fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J2) => {
          const h = J2.handF;
          ln(gg, h[0], h[1] + 2, h[0] - 3, h[1] - 8, 3.6, '#3a3a3a');
          circle(gg, h[0] - 4, h[1] - 11, 4.2);
          inkFill(gg, C.steel, 1.3);
          ln(gg, h[0] - 7, h[1] - 11, h[0] - 1, h[1] - 11, 0.8, C.far);
        },
      });
      if (T >= 0) {
        const mouth = [x + 14 * FS, -104 * FS];
        for (let i = 0; i < words.length; i++) {
          const kw = seg(T, ts[i], ts[i] + 0.3);
          if (kw > 0 && kw < 1) {
            for (let a = 0; a < 3; a++) {
              const r = 6 + a * 5 + kw * 8;
              g.save();
              g.globalAlpha *= (1 - kw) * 0.9;
              g.beginPath();
              g.arc(mouth[0] + 4, mouth[1], r, -0.6, 0.6);
              inkFill(g, null, 1.3, C.amber);
              g.restore();
            }
          }
          const kf = seg(T, ts[i] + 0.1, ts[i] + 0.45);
          if (kf > 0 && kf < 1) {
            const p = arcPt([mouth[0] + 16, mouth[1] - 4], [xs[i] + 10, lineY - 4], 22, E.io(kf));
            const wd = twidth(g, words[i], 10) + 8;
            rr(g, p[0] - wd / 2, p[1] - 8, wd, 14, 5);
            inkFill(g, C.butterSoft, 1.1, C.amber);
            text(g, words[i], p[0], p[1] + 3, 10, C.umber);
          }
        }
      }
      return J;
    },
  };

  // ---------- timelang: the date machine ----------
  function gear(g, x, y, r, rot, fill) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.beginPath();
    const n = 8;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU;
      const rad = i % 2 ? r : r * 0.78;
      g.lineTo(Math.cos(a - 0.12) * rad, Math.sin(a - 0.12) * rad);
      g.lineTo(Math.cos(a + 0.12) * rad, Math.sin(a + 0.12) * rad);
    }
    g.closePath();
    inkFill(g, fill, 1.2);
    circle(g, 0, 0, r * 0.25);
    inkFill(g, C.paper, 1);
    g.restore();
  }
  function calPage(g, cx, cy, s, done, ring) {
    g.save();
    g.translate(cx, cy);
    g.scale(s, s);
    rr(g, -32, -36, 64, 72, 4);
    inkFill(g, C.paper, 1.5);
    rr(g, -32, -36, 64, 16, 4);
    inkFill(g, '#fecaca', 1.5);
    text(g, 'NOV', 0, -24.5, 9, C.redInk);
    if (done) {
      text(g, '20', 0, 10, 26, C.ink);
      text(g, 'Fri · 3:00 pm', 0, 27, 9, C.muted);
      if (ring > 0) {
        g.beginPath();
        g.ellipse(0, 1, 19, 15, -0.1, -Math.PI / 2, -Math.PI / 2 + ring * TAU * 1.05);
        inkFill(g, null, 1.8, C.redInk);
      }
    } else {
      text(g, '?', 0, 12, 24, C.faint);
    }
    g.restore();
  }
  SC['p:timelang'] = {
    dur: 4.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const mx = -36, mw = 80, mt = -100, slotY = -60, LS = 74;
      const READ = P({ hF: [24, -84], hB: [16, -82], head: [7, -113] });
      let x = -128, pose, stripA = 1, spin = S.t * 0.6, shake = 0, out = -1, ring = 0, payoff = -1, done = false, puff = 0;
      if (T < 0) {
        pose = breathe(P({ head: [7 + Math.sin(S.t * 0.9) * 1.5, -113] }, READ), S.t, 0.7);
      } else {
        const fw = walkSeg(T, 0.45, 1.2, -128, -84);
        const bw = walkSeg(T, 3.1, 3.8, -84, -128);
        x = T < 3.1 ? fw.x : bw.x;
        const push = (xx, k) => P({ hF: lp([lerp(-110, mx - 12, k), slotY], xx, 0), hB: lp([lerp(-116, mx - 18, k), slotY + 1], xx, 0), head: [7, -114], chest: [3, -90] });
        if (T < 0.45) {
          pose = mix(READ, push(x, 0), E.soft(seg(T, 0, 0.4)));
        } else if (T < 1.4) {
          pose = legs(push(x, E.soft(seg(T, 0.45, 1.35))), fw.ph, fw.amp, { stride: fw.stride });
        } else if (T < 1.8) {
          pose = mix(push(x, 1), P({ hF: [14, -56], hB: [4, -56], head: [6, -115] }), E.soft(seg(T, 1.4, 1.8)));
        } else if (T < 3.1) {
          const clap = T > 2.95 ? 0 : 0;
          pose = P({ hF: [14 + clap, -56], hB: [4, -56], head: [8, -114 - pulse(T, 10, 1.8, 1.4) * 2] });
        } else {
          pose = legs(P({ hF: [14, -56], hB: [4, -56] }), -bw.ph, bw.amp, { stride: bw.stride });
          pose = mix(pose, READ, E.soft(seg(T, 3.9, 4.4)));
        }
        pose = breathe(pose, S.t, 0.5);
        spin = S.t * 0.6 + E.io(seg(T, 1.2, 2.5)) * 9;
        shake = seg(T, 1.25, 2.4) > 0 && T < 2.4 ? Math.sin(T * 60) * 1.2 : 0;
        puff = seg(T, 1.3, 2.6);
        out = seg(T, 2.3, 2.9);
        done = T > 2.3 && T < 4.4;
        ring = E.soft(seg(T, 2.95, 3.4));
        payoff = seg(T, 3.0, 3.7);
        stripA = T < 1.4 ? 1 : E.soft(seg(T, 4.2, 4.7));
      }
      const pageA = T >= 0 ? 1 - E.soft(seg(T, 4.3, 4.8)) : 0;
      ln(g, 116, -72, 116, 0, 3);
      ln(g, 104, 0, 128, 0, 3);
      if (T < 0 || T < 2.3 || pageA < 1) {
        g.save();
        g.globalAlpha *= T >= 0 && T > 2.9 ? 1 - pageA : 1;
        calPage(g, 116, -110, 1, false, 0);
        g.restore();
      }
      if (out >= 0 && done) {
        const k = E.out(out);
        const p = arcPt([mx + mw + 6, -40], [116, -110], 26, k);
        g.save();
        g.globalAlpha *= pageA;
        g.translate(p[0], p[1]);
        g.rotate((1 - k) * 0.6);
        calPage(g, 0, 0, lerp(0.3, 1, k), true, ring);
        g.restore();
      }
      if (payoff > 0) {
        sparks(g, 116, -134, payoff, 20, 7, C.redInk);
      }
      g.save();
      g.translate(shake, 0);
      for (let i = 0; i < 3; i++) {
        const k = (puff * 2.4 + i * 0.33) % 1;
        if (puff > 0 && puff < 1) {
          g.save();
          g.globalAlpha *= Math.sin(Math.PI * k) * 0.8;
          circle(g, mx + 62 + k * 10, mt - 16 - k * 26, 4 + k * 6);
          inkFill(g, C.paper, 1.1, C.soft);
          g.restore();
        }
      }
      rr(g, mx + 54, mt - 16, 14, 18, 2);
      inkFill(g, C.steel, 1.4);
      rr(g, mx, mt, mw, -mt, 6);
      inkFill(g, C.steel, 1.6);
      text(g, 'timelang', mx + mw / 2, mt + 15, 9, C.muted);
      circle(g, mx + 40, mt + 50, 25);
      inkFill(g, C.paper, 1.4);
      gear(g, mx + 31, mt + 44, 13, spin, C.butter);
      gear(g, mx + 50, mt + 60, 10, -spin * 1.3 + 0.2, C.butterSoft);
      rr(g, mx - 3, slotY - 6, 6, 12, 2);
      g.fillStyle = C.ink;
      g.fill();
      rr(g, mx + mw - 3, -46, 8, 14, 2);
      g.fillStyle = C.ink;
      g.fill();
      g.restore();
      const flutter = T < 0 ? Math.sin(S.t * 3) * 1.5 : 0;
      return fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J2) => {
          if (stripA <= 0.01) {
            return;
          }
          inWorld(gg, J2, () => {
            const h = J2.W(J2.handF);
            const sl = [h[0] - 4 + (T >= 0 && T < 1.4 ? E.in(seg(T, 1.25, 1.4)) * 26 : 0), h[1] - 2];
            gg.save();
            gg.globalAlpha *= stripA;
            gg.beginPath();
            gg.rect(-200, -200, mx - 2 + 200, 260);
            gg.clip();
            gg.beginPath();
            gg.moveTo(sl[0], sl[1] - 7);
            gg.lineTo(sl[0] + LS, sl[1] - 7 + flutter);
            gg.lineTo(sl[0] + LS, sl[1] + 7 + flutter);
            gg.lineTo(sl[0], sl[1] + 7);
            gg.closePath();
            inkFill(gg, C.butterSoft, 1.2, C.amber);
            text(gg, 'next friday 3pm', sl[0] + LS / 2 + 1, sl[1] + 3.2, 9.5, C.umber);
            gg.restore();
          });
        },
      });
    },
  };

  // ---------- claude-queue: the night shift ----------
  function ticket(g, x, y, num, a) {
    if (a <= 0.01) {
      return;
    }
    g.save();
    g.globalAlpha *= a;
    g.translate(x, y);
    rr(g, -15, -8, 30, 16, 3);
    inkFill(g, C.paper, 1.3);
    circle(g, -8, 0, 3.4);
    inkFill(g, null, 1.4, C.greenInk);
    circle(g, -8, 0, 0.9);
    g.fillStyle = C.greenInk;
    g.fill();
    text(g, '#' + num, 4, 3.2, 9, C.ink);
    g.restore();
  }
  function prCard(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    rr(g, -26, -12, 52, 22, 3);
    inkFill(g, '#ede9fe', 1.4);
    circle(g, -18, -5, 2.2);
    inkFill(g, null, 1.2, '#6d28d9');
    circle(g, -18, 4, 2.2);
    inkFill(g, null, 1.2, '#6d28d9');
    circle(g, -11, -1, 2.2);
    inkFill(g, null, 1.2, '#6d28d9');
    ln(g, -18, -3, -18, 2, 1.2, '#6d28d9');
    text(g, '3 fixes', 6, 2.8, 9, '#4c1d95');
    g.restore();
  }
  SC['p:claude-queue'] = {
    dur: 6,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -150, belt = { x0: -128, x1: 14, y: -42 }, bx = 12, bw = 64;
      const v = 78, puts = [0.3, 0.95, 1.6];
      const IDLE = P({ hF: [14, -60], hB: [6, -62], head: [6, -115] });
      const PUT = P({ hF: lp([belt.x0 + 6, belt.y - 8], x, 0), hB: [6, -62], head: [10, -110], chest: [5, -88], hip: [1, -59] });
      const STRETCH = P({ hF: [18, -126], hB: [-14, -126], head: [1, -119], chest: [0, -91] });
      let pose, travel = S.t * 6, rot = S.t * 0.5, busy = 0, prK = -1, payoff = -1, stack = 3;
      const tix = [];
      if (T < 0) {
        pose = breathe(P({ head: [6 + pulse(S.t, 8, 3, 2) * -3, -115 - pulse(S.t, 8, 3, 2) * 4] }, IDLE), S.t);
      } else {
        const keys = [[0, IDLE]];
        puts.forEach((t0) => {
          keys.push([t0, PUT], [t0 + 0.15, PUT], [t0 + 0.45, IDLE]);
        });
        keys.push([2.4, IDLE], [2.85, STRETCH], [3.4, STRETCH], [3.9, IDLE]);
        pose = breathe(seq(T, keys), S.t, 0.5);
        puts.forEach((t0, i) => {
          const tt = T - (t0 + 0.12);
          if (T < t0) {
            return;
          }
          stack = Math.min(stack, 2 - i);
          if (tt < 0) {
            const hw = [x + pose.hF[0] * FS, pose.hF[1] * FS];
            tix.push([hw[0] + 4, hw[1] + 2, 12 + i]);
            return;
          }
          const px = belt.x0 + 6 + tt * v;
          if (px < bx + 30) {
            tix.push([px, belt.y - 8, 12 + i]);
          }
        });
        travel = S.t * 6 + clamp(T - 0.4, 0, 3.4) * v;
        busy = seg(T, 2.0, 2.3) * (1 - seg(T, 3.9, 4.2));
        rot = S.t * 0.5 + busy * T * 4;
        prK = seg(T, 3.9, 4.5);
        payoff = seg(T, 4.5, 5.2);
        if (T > 5.4) {
          stack = 3;
        }
      }
      circle(g, -150, -150, 11);
      inkFill(g, C.butterSoft, 1.3);
      circle(g, -144, -154, 9.5);
      g.fillStyle = C.floor === '#fafafa' ? '#ffffff' : C.paper;
      g.fill();
      star(g, -118, -160, 3, 5, 0.45);
      inkFill(g, C.butterHi, 0.9);
      star(g, -96, -142, 2.2, 5, 0.45);
      inkFill(g, C.butterHi, 0.8);
      ln(g, belt.x0 + 8, belt.y + 4, belt.x0 + 4, 0, 2.2);
      ln(g, belt.x1 - 10, belt.y + 4, belt.x1 - 6, 0, 2.2);
      ln(g, 90, belt.y + 4, 92, 0, 2.2);
      ln(g, 150, belt.y + 4, 148, 0, 2.2);
      for (const seg2 of [[belt.x0, belt.x1], [bx + bw - 6, 162]]) {
        rr(g, seg2[0], belt.y, seg2[1] - seg2[0], 8, 4);
        inkFill(g, '#3a3a3a', 1.4);
        const off = travel % 10;
        for (let dx = seg2[0] + 6 + off; dx < seg2[1] - 4; dx += 10) {
          ln(g, dx, belt.y + 2.5, dx - 2, belt.y + 5.5, 1, '#8a8a8a');
        }
      }
      for (const t of tix) {
        ticket(g, t[0], t[1], t[2], 1);
      }
      if (prK > 0) {
        const px = lerp(bx + bw - 10, 126, E.out(prK));
        g.save();
        g.globalAlpha *= 1 - E.soft(seg(T, 5.5, 6));
        prCard(g, px, belt.y - 11, 1);
        g.restore();
        tickBadge(g, 150, belt.y - 34, payoff, 7, S.w);
        sparks(g, 150, belt.y - 34, payoff, 14, 5, C.greenInk);
      }
      const jig = busy > 0 ? Math.sin(S.t * 40) * 0.8 * busy : 0;
      rr(g, bx, -110 + jig, bw, 88, 6);
      inkFill(g, '#fde9df', 1.6);
      rr(g, bx - 1, belt.y - 18, 6, 26, 2);
      g.fillStyle = C.ink;
      g.fill();
      rr(g, bx + bw - 5, belt.y - 18, 6, 26, 2);
      g.fillStyle = C.ink;
      g.fill();
      asterisk(g, bx + bw / 2, -86 + jig, 13, rot, CLAUDE);
      text(g, 'claude', bx + bw / 2, -56 + jig, 9, '#9a4a2f');
      if (busy > 0.05) {
        for (let i = 0; i < 3; i++) {
          const on = Math.floor(S.t * 5) % 3 === i;
          circle(g, bx + bw / 2 - 6 + i * 6, -118, 1.8);
          g.fillStyle = on ? CLAUDE : C.faint;
          g.fill();
        }
      }
      ln(g, bx + 8, -22, bx + 6, 0, 2.2);
      ln(g, bx + bw - 8, -22, bx + bw - 6, 0, 2.2);
      return fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        mid: (gg, J) => {
          for (let i = 0; i < stack; i++) {
            gg.save();
            gg.translate(J.handB[0] + 2, J.handB[1] + 2 - i * 3);
            gg.rotate(-0.08 + i * 0.06);
            rr(gg, -14, -7, 28, 14, 2.5);
            inkFill(gg, C.paper, 1.2);
            circle(gg, -7, 0, 2.8);
            inkFill(gg, null, 1.2, C.greenInk);
            gg.restore();
          }
        },
      });
    },
  };

  // ---------- claude-statusline: the sign fitter ----------
  const SL = {
    wx: -60, wy: -180, ww: 236, wh: 72, bar: -121,
    slots: [[-28, 46], [30, 54], [114, 104]],
    stops: [-56, 4, 86],
  };
  function slChip(g, i, cx, cy, s, meter) {
    const [, w] = SL.slots[i];
    g.save();
    g.translate(cx, cy);
    g.scale(s, s);
    const fills = ['#bfdbfe', '#bbf7d0', '#ede9fe'];
    rr(g, -w / 2, -7, w, 14, 4);
    inkFill(g, fills[i], 1.2);
    if (i === 0) {
      rr(g, -w / 2 + 5, -3.5, 8, 6, 1);
      inkFill(g, C.butter, 0.9);
      text(g, '~/app', 5, 3.3, 9, '#1e3a5f');
    } else if (i === 1) {
      const bx = -w / 2 + 8;
      ln(g, bx, -4, bx, 4, 1.2, C.greenInk);
      R.strokePath(g, [[bx + 5, -4], [bx + 5, -1], [bx, 2]], 1.2, C.greenInk);
      text(g, 'main', 6, 3.3, 9, '#14532d');
    } else {
      text(g, '5h', -w / 2 + 11, 3.3, 9, '#4c1d95');
      rr(g, -w / 2 + 22, -3, 46, 6, 3);
      inkFill(g, C.paper, 1);
      if (meter > 0.01) {
        rr(g, -w / 2 + 22, -3, 46 * meter, 6, 3);
        inkFill(g, meter > 0.7 ? C.redInk : C.amber, 1);
      }
      text(g, Math.round(meter * 100) + '%', w / 2 - 15, 3.3, 9, '#4c1d95');
    }
    g.restore();
  }
  SC['p:claude-statusline'] = {
    dur: 6.4,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const { wx, wy, ww, wh, bar, slots, stops } = SL;
      const LOOK = P({ hF: [10, -58], hB: [-2, -58], head: [8, -118], chest: [2, -90] });
      const grip = (i) => [stops[i] + 26, bar + 6];
      let x = stops[0], sx = 1, pose, meter = 0.38 + Math.sin(S.t * 0.4) * 0.05, placed = [1, 1, 1], inHand = -1, carry = 0, payoff = -1, stack = 0, lift = 0;
      if (T < 0) {
        const tap = Math.max(0, Math.sin(S.t * 6)) * pulse(S.t, 5, 1, 1.6);
        pose = breathe(P({ fF: [6, -2.5 - tap * 3] }, LOOK), S.t);
      } else {
        const fadeOut = 1 - E.soft(seg(T, 0, 0.3));
        const snaps = [0.75, 1.95, 3.3];
        placed = snaps.map((t) => (T >= t ? 1 : fadeOut));
        stack = 3 - snaps.filter((t) => T >= t - 0.35).length;
        const UP = (i, dy) => P({ hF: lp([grip(i)[0], grip(i)[1] + (dy || 0)], stops[i], 0), hB: [-2, -58], head: [9, -119], chest: [3, -91] });
        const legsAt = [[0.8, 1.5, stops[0], stops[1]], [2.0, 2.85, stops[1], stops[2]]];
        pose = seq(T, [
          [0, LOOK], [0.4, UP(0)], [0.75, UP(0)], [1.05, LOOK],
          [1.5, LOOK], [1.85, UP(1)], [1.95, UP(1)], [2.25, LOOK],
          [2.85, LOOK], [3.2, UP(2)], [3.3, UP(2)], [3.45, UP(2, 14)], [3.6, UP(2)], [3.72, UP(2, 14)], [3.85, UP(2)], [4.2, LOOK],
        ]);
        if (T < 0.8) {
          inHand = T >= 0.3 && T < 0.75 ? 0 : -1;
          lift = E.soft(seg(T, 0.3, 0.75));
        } else if (T < 1.5) {
          const w = walkSeg(T, legsAt[0][0], legsAt[0][1], legsAt[0][2], legsAt[0][3]);
          x = w.x;
          pose = legs(pose, w.ph, w.amp, { stride: w.stride });
        } else if (T < 2.0) {
          x = stops[1];
          inHand = T < 1.95 ? 1 : -1;
          lift = E.soft(seg(T, 1.5, 1.95));
        } else if (T < 2.85) {
          const w = walkSeg(T, legsAt[1][0], legsAt[1][1], legsAt[1][2], legsAt[1][3]);
          x = w.x;
          pose = legs(pose, w.ph, w.amp, { stride: w.stride });
        } else if (T < 4.5) {
          x = stops[2];
          inHand = T < 3.3 ? 2 : -1;
          lift = E.soft(seg(T, 2.85, 3.3));
        } else {
          sx = sxv(Math.cos(Math.PI * E.soft(seg(T, 4.5, 4.7))));
          const w = walkSeg(T, 4.7, 6.1, stops[2], stops[0]);
          x = w.x;
          if (T > 4.7) {
            sx = sxv(-Math.cos(Math.PI * E.soft(seg(T, 6.1, 6.35))));
          }
          pose = legs(LOOK, w.ph, w.amp, { stride: w.stride });
        }
        pose = breathe(pose, S.t, 0.5);
        meter = T < 3.3 ? 0 : 0.42 * E.out(seg(T, 3.4, 4.2));
        if (T > 6.0) {
          meter = 0.42;
        }
        payoff = seg(T, 4.2, 4.9);
        carry = 1;
      }
      stand(g, wx, wy, ww, wh);
      win(g, wx, wy, ww, wh, { title: 'claude' });
      text(g, '> fix the nav bar', wx + 8, wy + 28, 9.5, C.ink, 'left');
      ln(g, wx + 8, wy + 39, wx + 120, wy + 39, 2, '#e3e3e3');
      rr(g, wx + 3, bar - 9, ww - 6, 18, 3);
      g.fillStyle = '#f3f3f3';
      g.fill();
      for (let i = 0; i < 3; i++) {
        const [cx, w] = slots[i];
        if (placed[i] < 1) {
          g.save();
          g.setLineDash([3, 3]);
          rr(g, cx - w / 2, bar - 7, w, 14, 4);
          inkFill(g, null, 1, C.faint);
          g.restore();
        }
        if (placed[i] > 0.01) {
          g.save();
          g.globalAlpha *= placed[i];
          slChip(g, i, cx, bar, 1, meter);
          g.restore();
        }
      }
      if (payoff > 0) {
        tickBadge(g, slots[2][0] + 46, bar - 22, payoff, 7, S.w);
        sparks(g, slots[2][0] + 46, bar - 22, payoff, 14, 5, C.greenInk);
      }
      return fig(g, pose, x, 0, {
        sx,
        wave: S.wave, wt: S.wt,
        mid: (gg, J) => {
          for (let i = 0; i < (T < 0 ? 0 : stack); i++) {
            gg.save();
            gg.translate(J.handB[0] + 1, J.handB[1] + 2 - i * 3);
            rr(gg, -9, -4, 18, 8, 3);
            inkFill(gg, ['#ede9fe', '#bbf7d0', '#bfdbfe'][i], 1.1);
            gg.restore();
          }
        },
        behind: (gg, J) => {
          if (inHand < 0 || !carry) {
            return;
          }
          inWorld(gg, J, () => {
            const h = J.W(J.handF);
            const [cx] = SL.slots[inHand];
            const at = L2([h[0] + cx - grip(inHand)[0], h[1] - 5], [cx, bar], lift);
            slChip(gg, inHand, at[0], at[1], 1, 0);
          });
        },
      });
    },
  };

  // ---------- copy-dom-css: the sticker peeler ----------
  const CD = {
    wx: -28, wy: -162, ww: 202, wh: 104,
    card: [-16, -134, 86, 52],
    els: [[-20, -146, 74, 9, 'nav'], [-18, -136, 90, 56, 'div.card'], [80, -136, 54, 16, 'span.tag'], [80, -114, 86, 34, 'p']],
  };
  function cdCard(g, x, y, w, h) {
    const s = w / 86;
    g.save();
    g.translate(x, y);
    g.scale(s, h / 52);
    rr(g, 0, 0, 86, 52, 7);
    inkFill(g, '#fbcfe8', 1.4);
    circle(g, 12, 14, 7);
    inkFill(g, C.butterSoft, 1.1);
    ln(g, 24, 11, 66, 11, 2.4, '#831843');
    ln(g, 24, 18, 54, 18, 1.8, '#d68aaf');
    ln(g, 8, 29, 76, 29, 1.8, '#d68aaf');
    rr(g, 8, 36, 32, 11, 5);
    inkFill(g, C.butterHi, 1.1);
    ln(g, 15, 41.5, 33, 41.5, 1.6, C.umber);
    g.restore();
  }
  function cursor(g, x, y, press) {
    g.save();
    g.translate(x, y);
    g.scale(1 - press * 0.12, 1 - press * 0.12);
    poly(g, [[0, 0], [0, 13], [3.4, 10], [6, 15.5], [8, 14.5], [5.6, 9.2], [10, 9]], true);
    inkFill(g, C.paper, 1.2);
    g.restore();
  }
  SC['p:copy-dom-css'] = {
    dur: 4.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -46;
      const { wx, wy, ww, wh, card, els } = CD;
      const clipC = [-72, -44];
      const lr = (a, b, k) => a.map((v, i) => (typeof v === 'number' ? lerp(v, b[i], k) : v));
      let hov, press = 0, copy = null, onBoard = 0, toast = 0, payoff = -1;
      const IDLE = P({ hF: [14, -60], hB: lp([clipC[0] + 6, clipC[1] - 8], x, 0), head: [8, -114], chest: [2, -90] });
      let pose;
      if (T < 0) {
        const tt = S.t * 0.45;
        const i = Math.floor(tt) % els.length, j = (i + 1) % els.length;
        hov = lr(els[i], els[j], E.io(clamp((tt % 1 - 0.7) / 0.3, 0, 1)));
        hov[4] = (tt % 1) > 0.85 ? els[j][4] : els[i][4];
        pose = breathe(IDLE, S.t);
      } else {
        const k = E.io(seg(T, 0.1, 0.8));
        hov = lr(els[3], els[1], k);
        hov[4] = k > 0.5 ? els[1][4] : els[3][4];
        const GRAB = P({ hF: lp([card[0] + 4, card[1] + 30], x, 0), hB: IDLE.hB, head: [9, -114], chest: [4, -90] });
        press = Math.sin(Math.PI * seg(T, 1.0, 1.2));
        const pk = E.io(seg(T, 1.3, 2.2));
        const r0 = [card[0], card[1], card[2], card[3]], r1 = [clipC[0] - 14, clipC[1] - 12, 28, 17];
        const kx = E.in(pk), ky = E.out(pk);
        const cr = [lerp(r0[0], r1[0], kx), lerp(r0[1], r1[1], ky), lerp(r0[2], r1[2], pk), lerp(r0[3], r1[3], pk)];
        const lift = -Math.sin(Math.PI * pk) * 6;
        const grip = [cr[0] + lerp(4, cr[2] - 4, pk * pk), cr[1] + cr[3] * 0.55 - lift];
        const gl = lp(grip, x, 0);
        const CARRY = P({ hF: gl, hB: IDLE.hB, head: [6, -113], chest: [2, -90], ef: lerp(0.15, 1, E.sm(clamp((gl[0] - 2) / 16, 0, 1))) });
        if (T < 1.3) {
          pose = seq(T, [[0, IDLE], [0.6, IDLE], [0.95, GRAB], [1.3, GRAB]]);
        } else if (T < 2.2) {
          pose = CARRY;
        } else {
          pose = mix(CARRY, IDLE, E.soft(seg(T, 2.2, 2.6)));
        }
        pose = breathe(pose, S.t, 0.5);
        if (T >= 1.3 && T < 2.2) {
          copy = [cr[0], cr[1] - lift, cr[2], cr[3], pk * -0.25 + Math.sin(Math.PI * pk) * 0.2];
        }
        onBoard = T >= 2.2 ? 1 - E.soft(seg(T, 4.3, 4.8)) : 0;
        toast = E.back(seg(T, 2.25, 2.5)) * (1 - E.soft(seg(T, 3.9, 4.3)));
        payoff = seg(T, 2.25, 3.0);
      }
      stand(g, wx, wy, ww, wh);
      win(g, wx, wy, ww, wh);
      rr(g, wx + 30, wy + 3, 90, 7, 3.5);
      inkFill(g, '#f3f3f3', 0.9, C.faint);
      ln(g, -18, -142, 30, -142, 2.4, C.ink);
      for (let i = 0; i < 3; i++) {
        ln(g, 120 + i * 16, -142, 130 + i * 16, -142, 1.8, C.faint);
      }
      cdCard(g, card[0], card[1], card[2], card[3]);
      rr(g, 82, -134, 50, 12, 6);
      inkFill(g, '#bfdbfe', 1.1);
      ln(g, 90, -128, 124, -128, 1.6, '#1e3a5f');
      for (let i = 0; i < 4; i++) {
        ln(g, 82, -110 + i * 8, 82 + [80, 72, 78, 50][i], -110 + i * 8, 1.8, '#e3e3e3');
      }
      g.save();
      g.setLineDash([3, 2]);
      rr(g, hov[0], hov[1], hov[2], hov[3], 3);
      inkFill(g, 'rgba(147,197,253,0.18)', 1.3, '#3b82f6');
      g.restore();
      const lw = twidth(g, hov[4], 9) + 8;
      const ly = hov[1] - 13 < wy + 13 ? hov[1] + hov[3] + 1 : hov[1] - 13;
      rr(g, hov[0], ly, lw, 12, 2);
      inkFill(g, '#1e3a8a', 1, '#1e3a8a');
      text(g, hov[4], hov[0] + 4, ly + 9, 9, C.paper, 'left');
      const cp = T >= 0 && T < 1.3 ? L2([hov[0] + hov[2] * 0.6, hov[1] + hov[3] * 0.6], [card[0] + 54, card[1] + 40], 0) : [hov[0] + hov[2] * 0.6, hov[1] + hov[3] * 0.6];
      cursor(g, cp[0], cp[1], press);
      if (press > 0.05) {
        g.save();
        g.globalAlpha *= press;
        circle(g, cp[0], cp[1], 4 + press * 6);
        inkFill(g, null, 1.2, '#3b82f6');
        g.restore();
      }
      const J = fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        mid: (gg, J2) => {
          inWorld(gg, J2, () => {
            rr(gg, clipC[0] - 17, clipC[1] - 20, 34, 42, 3);
            inkFill(gg, C.wood, 1.5);
            rr(gg, clipC[0] - 14, clipC[1] - 15, 28, 34, 1.5);
            inkFill(gg, C.paper, 1);
            rr(gg, clipC[0] - 7, clipC[1] - 23, 14, 6, 2);
            inkFill(gg, C.steel, 1.2);
            if (onBoard > 0.01) {
              gg.save();
              gg.globalAlpha *= onBoard;
              cdCard(gg, clipC[0] - 13, clipC[1] - 12, 26, 16);
              ln(gg, clipC[0] - 10, clipC[1] + 10, clipC[0] + 10, clipC[1] + 10, 1.4, C.faint);
              ln(gg, clipC[0] - 10, clipC[1] + 14, clipC[0] + 4, clipC[1] + 14, 1.4, C.faint);
              gg.restore();
            }
          });
        },
        held: (gg, J2) => {
          if (!copy) {
            return;
          }
          inWorld(gg, J2, () => {
            gg.save();
            gg.translate(copy[0] + copy[2] / 2, copy[1] + copy[3] / 2);
            gg.rotate(copy[4]);
            gg.fillStyle = 'rgba(0,0,0,0.12)';
            rr(gg, -copy[2] / 2 + 3, -copy[3] / 2 + 4, copy[2], copy[3], 6);
            gg.fill();
            cdCard(gg, -copy[2] / 2, -copy[3] / 2, copy[2], copy[3]);
            gg.restore();
          });
        },
      });
      if (toast > 0.01) {
        g.save();
        g.translate(-126, -112);
        g.scale(toast, toast);
        rr(g, -34, -10, 68, 18, 9);
        inkFill(g, C.ink, 1.2);
        text(g, 'copied!', 6, 3.3, 9.5, C.paper);
        g.restore();
        tickBadge(g, -152, -112, payoff, 6.5, S.w);
      }
      return J;
    },
  };

  // ---------- claupe: the puppeteer ----------
  SC['p:claupe'] = {
    dur: 4.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -132, y = -26;
      const wx = -40, wy = -116, ww = 172, wh = 74;
      const bar = [46, -158];
      let tilt = Math.sin(S.t * 1.3) * 0.05, prompt = 0, lines = 0, spin = -1, out = -1, payoff = -1;
      if (T >= 0) {
        const jig = seg(T, 0, 3.2) > 0 && T < 3.2 ? Math.sin(T * 9) * 0.12 : 0;
        tilt = Math.sin(S.t * 1.3) * 0.05 * (1 - seg(T, 0, 0.2)) + jig;
        prompt = seg(T, 0.3, 1.1);
        spin = T > 1.1 && T < 2.0 ? T : -1;
        lines = seg(T, 2.0, 3.0) * 3;
        out = E.out(seg(T, 3.1, 3.5)) * (1 - E.soft(seg(T, 4.3, 4.8)));
        payoff = seg(T, 3.4, 4.1);
        if (T > 4.3) {
          const f = 1 - E.soft(seg(T, 4.3, 4.8));
          prompt *= f > 0.5 ? 1 : 0;
          lines *= f > 0.5 ? 1 : 0;
        }
      }
      const hand = [x + 20 * FS, y - 128 * FS + tilt * 30];
      const ca = Math.cos(tilt), sa = Math.sin(tilt);
      const cb = (d) => [bar[0] + ca * d, bar[1] + sa * d];
      const L = cb(-82), Rr = cb(82);
      const sway = Math.sin(S.t * 1.1) * 1.5;
      const wtl = [wx + sway, wy + sa * -30 + 2], wtr = [wx + ww + sway, wy + sa * 30 + 2];
      rr(g, -168, -26, 76, 26, 3);
      inkFill(g, C.wood, 1.5);
      text(g, 'script.sh', -130, -9, 9, C.umber);
      const pose = breathe(P({ hF: lp(hand, x, y), hB: [-4, -58], head: [8, -118], chest: [2, -90] }), S.t, 0.6);
      ln(g, L[0], L[1], wtl[0] + 10, wtl[1], 1, C.ink);
      ln(g, Rr[0], Rr[1], wtr[0] - 10, wtr[1], 1, C.ink);
      g.save();
      g.translate(wx + ww / 2 + sway, wy + wh / 2 + 2);
      g.rotate(tilt * 0.9);
      g.translate(-(wx + ww / 2), -(wy + wh / 2));
      win(g, wx, wy, ww, wh, { dark: true, title: 'claude · headless' });
      const ps = '> review this diff';
      const n = Math.floor(ps.length * prompt);
      const cur = Math.sin(S.t * 6) > 0 ? '_' : '';
      text(g, (T < 0 ? '> ' : ps.slice(0, Math.max(2, n))) + (prompt < 1 ? cur : ''), wx + 10, wy + 29, 9.5, '#e5e5e5', 'left');
      if (spin >= 0) {
        asterisk(g, wx + 16, wy + 46, 6, spin * 6, CLAUDE);
        text(g, 'thinking', wx + 28, wy + 49, 9, '#9a9a9a', 'left');
      }
      for (let i = 0; i < 3; i++) {
        const k = clamp(lines - i, 0, 1);
        if (k > 0) {
          if (i === 0) {
            asterisk(g, wx + 14, wy + 44, 4, 0, CLAUDE);
          }
          ln(g, wx + 22, wy + 44 + i * 9, wx + 22 + [110, 86, 120][i] * k, wy + 44 + i * 9, 2, '#a3a3a3');
        }
      }
      g.restore();
      if (out > 0.01) {
        const oy = lerp(wy + wh, -14, out);
        g.save();
        g.globalAlpha *= Math.min(1, out * 2);
        ln(g, wx + ww / 2, wy + wh + 2, wx + ww / 2, oy - 8, 1.4, C.far);
        rr(g, wx + ww / 2 - 30, oy - 8, 60, 16, 3);
        inkFill(g, C.paper, 1.3);
        text(g, 'stdout', wx + ww / 2, oy + 3.4, 9, C.ink);
        g.restore();
        tickBadge(g, wx + ww / 2 + 40, -14, payoff, 7, S.w);
        sparks(g, wx + ww / 2 + 40, -14, payoff, 14, 5, C.greenInk);
      }
      return fig(g, pose, x, y, {
        wave: S.wave, wt: S.wt, floor: y,
        held: (gg, J) => {
          inWorld(gg, J, () => {
            const h = J.W(J.handF);
            ln(gg, h[0], h[1], bar[0], bar[1], 4.2, C.ink);
            ln(gg, h[0], h[1], bar[0], bar[1], 2, C.wood);
            ln(gg, L[0], L[1], Rr[0], Rr[1], 4.6, C.ink);
            ln(gg, L[0], L[1], Rr[0], Rr[1], 2.4, C.wood);
          });
        },
      });
    },
  };

  // ---------- balsamiq-sans-neue: the font smith ----------
  const BQ = { base: -16, size: 46, right: 108, ref: 'Helvetica, Arial, sans-serif' };
  let bqM = null;
  function bqMeasure(g) {
    if (bqM) {
      return bqM;
    }
    g.font = FONT(BQ.size);
    const mb = g.measureText('Aa'), cb = g.measureText('A').actualBoundingBoxAscent;
    g.font = `400 ${BQ.size}px ${BQ.ref}`;
    const cr = g.measureText('A').actualBoundingBoxAscent, wr = g.measureText('Aa').width;
    const sy = clamp(cr / (cb || cr), 0.8, 0.93);
    bqM = { w: mb.width, cap: cb || BQ.size * 0.72, capR: cr, wr, sy, sxF: 0.86 };
    return bqM;
  }
  SC['p:balsamiq-sans-neue'] = {
    dur: 4.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const m = bqMeasure(g);
      const x = -94, axle = [-62, -60], arm = 10;
      let k = 0, turn = S.t * 0.4, payoff = -1;
      if (T >= 0) {
        k = E.io(seg(T, 0.3, 2.4)) * (1 - E.io(seg(T, 3.7, 4.75)));
        turn = S.t * 0.4 + E.io(seg(T, 0.3, 2.4)) * TAU * 2 - E.io(seg(T, 3.7, 4.75)) * TAU * 2;
        payoff = seg(T, 2.45, 3.2);
      }
      const sxk = lerp(1, m.sxF, k), syk = lerp(1, m.sy, k);
      const lw = m.w * sxk;
      const jaw = BQ.right - lw - 4;
      rr(g, -48, -12, 180, 12, 3);
      inkFill(g, C.wood, 1.5);
      rr(g, -56, -96, 12, 84, 3);
      inkFill(g, C.steel, 1.5);
      ln(g, -44, axle[1], jaw - 12, axle[1], 4, C.ink);
      ln(g, -44, axle[1], jaw - 12, axle[1], 2, '#cfcfcf');
      for (let i = -42; i < jaw - 14; i += 5) {
        ln(g, i, axle[1] - 2, i + 2, axle[1] + 2, 0.8, C.far);
      }
      rr(g, jaw - 14, -96, 14, 84, 3);
      inkFill(g, C.steel, 1.5);
      rr(g, BQ.right, -96, 14, 84, 3);
      inkFill(g, C.steel, 1.5);
      const capY = BQ.base - m.capR;
      g.save();
      g.setLineDash([4, 3]);
      ln(g, -36, capY, 178, capY, 1.1, payoff > 0 && payoff < 1 ? C.greenInk : C.soft);
      g.restore();
      g.save();
      g.translate(BQ.right - 2, BQ.base);
      g.scale(sxk, syk);
      g.font = FONT(BQ.size);
      g.textAlign = 'right';
      g.textBaseline = 'alphabetic';
      g.fillStyle = C.ink;
      g.fillText('Aa', 0, 0);
      if (k > 0.01) {
        g.lineWidth = 2.4 * k;
        g.strokeStyle = C.paper;
        g.lineJoin = 'round';
        g.strokeText('Aa', 0, 0);
      }
      g.restore();
      g.font = `400 ${BQ.size}px ${BQ.ref}`;
      g.textAlign = 'center';
      g.fillStyle = C.far;
      g.fillText('Aa', 152, BQ.base);
      text(g, k > 0.5 ? 'neue' : 'balsamiq', (jaw + BQ.right) / 2, 15, 9, C.muted);
      text(g, 'normal', 152, 15, 9, C.muted);
      if (payoff > 0) {
        tickBadge(g, 178 - 10, capY - 12, payoff, 7, S.w);
        sparks(g, (jaw + BQ.right) / 2, capY - 4, payoff, 16, 6, C.greenInk);
      }
      const knob = [axle[0] + Math.cos(turn) * arm, axle[1] + Math.sin(turn) * arm];
      circle(g, axle[0], axle[1], 4);
      inkFill(g, C.steel, 1.3);
      ln(g, axle[0], axle[1], knob[0], knob[1], 2.6);
      const lean = T >= 0 ? Math.sin(turn) * 1.5 : 0;
      const pose = breathe(P({ hF: lp([knob[0] - 2, knob[1] + 2], x, 0), hB: [-3, -54], head: [8 + lean, -114], chest: [3 + lean, -90] }), S.t, 0.6);
      const J = fig(g, pose, x, 0, { wave: S.wave, wt: S.wt });
      circle(g, knob[0], knob[1], 2.6);
      inkFill(g, C.wood, 1.2);
      return J;
    },
  };

  // ---------- rundown: the thread squeezer ----------
  SC['p:rundown'] = {
    dur: 5.4,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -122;
      const fm = { x0: -88, x1: -32, y: -92, nx0: -64, nx1: -56, ny: -64, sy: -54 };
      const wx = -8, wy = -162, ww = 182, wh = 124;
      const READ = P({ hF: [24, -74], hB: [17, -72], head: [8, -110], chest: [3, -90] });
      const FEED = P({ hF: lp([fm.x0 + 8, fm.y - 4], x, 0), hB: lp([fm.x0 + 2, fm.y - 2], x, 0), head: [9, -114], chest: [4, -90] });
      let pose, scroll = S.t * 4, floorL = 64, feed = 0, card = -1, bullets = 0, ask = 0, reply = 0, payoff = -1, churn = 0;
      if (T < 0) {
        pose = breathe(P({ head: [8, -110 + Math.sin(S.t * 0.8) * 2] }, READ), S.t, 0.6);
      } else {
        feed = E.soft(seg(T, 0, 0.4)) * (1 - E.soft(seg(T, 4.6, 5.2)));
        pose = breathe(mix(READ, FEED, feed), S.t, 0.5);
        const pull = E.io(seg(T, 0.4, 2.0));
        scroll = S.t * 4 + pull * 120;
        floorL = lerp(64, 8, pull) + E.soft(seg(T, 4.6, 5.3)) * 56;
        churn = seg(T, 0.4, 2.2) > 0 && T < 2.2 ? 1 : 0;
        card = seg(T, 2.0, 2.6);
        bullets = seg(T, 2.6, 3.1) * 3;
        ask = E.back(seg(T, 3.2, 3.45));
        reply = seg(T, 3.6, 4.2);
        payoff = seg(T, 4.2, 4.9);
        if (T > 4.8) {
          const f = 1 - E.soft(seg(T, 4.8, 5.4));
          bullets *= f;
          ask *= f;
          reply *= f;
        }
      }
      stand(g, wx, wy, ww, wh);
      win(g, wx, wy, ww, wh, { title: 'rundown' });
      text(g, T >= 0 && T > 1.6 && T < 4.8 ? '4 points' : '800 comments', -146, 14, 9, C.muted);
      text(g, 'TL;DR', wx + 8, wy + 26, 9, C.amber, 'left');
      for (let i = 0; i < 3; i++) {
        const k = clamp(bullets - i, 0, 1);
        const by = wy + 36 + i * 9;
        circle(g, wx + 11, by, 1.6);
        g.fillStyle = k > 0 ? C.ink : C.faint;
        g.fill();
        ln(g, wx + 17, by, wx + 17 + [110, 96, 120][i] * (k > 0 ? E.out(k) : 1), by, 2, k > 0 ? '#9a9a9a' : '#efefef');
      }
      ln(g, wx + 6, wy + 66, wx + ww - 6, wy + 66, 1, C.line);
      if (ask > 0.01) {
        g.save();
        g.translate(wx + ww - 46, wy + 80);
        g.scale(ask, ask);
        rr(g, -38, -8, 76, 16, 7);
        inkFill(g, C.butter, 1.2);
        text(g, "who's right?", 0, 3.4, 9, C.umber);
        g.restore();
      }
      if (reply > 0.01) {
        rr(g, wx + 8, wy + 92, 110, 26, 7);
        inkFill(g, '#fafafa', 1.2);
        if (reply < 0.4) {
          for (let i = 0; i < 3; i++) {
            circle(g, wx + 20 + i * 7, wy + 105, 1.8);
            g.fillStyle = Math.floor(S.t * 6) % 3 === i ? C.ink : C.faint;
            g.fill();
          }
        } else {
          const k = seg(reply, 0.4, 1);
          text(g, '“', wx + 16, wy + 108, 14, C.amber);
          ln(g, wx + 24, wy + 101, wx + 24 + 84 * k, wy + 101, 2, '#9a9a9a');
          ln(g, wx + 24, wy + 109, wx + 24 + 60 * k, wy + 109, 2, '#9a9a9a');
        }
      }
      if (payoff > 0) {
        tickBadge(g, wx + ww - 12, wy + 106, payoff, 7, S.w);
        sparks(g, wx + ww - 12, wy + 106, payoff, 14, 5, C.greenInk);
      }
      const jig = churn ? Math.sin(S.t * 34) * 0.8 : 0;
      ln(g, fm.x0 + 6, fm.y + 4, fm.x0 - 2, 0, 2.2);
      ln(g, fm.x1 - 6, fm.y + 4, fm.x1 + 2, 0, 2.2);
      if (card >= 0 && card < 1) {
        const p = arcPt([fm.nx0 + 4, fm.sy + 6], [wx + 60, wy + 44], 30, E.io(card));
        g.save();
        g.translate(p[0], p[1]);
        g.rotate((1 - card) * 0.3);
        const s = lerp(0.5, 1, card);
        g.scale(s, s);
        rr(g, -26, -14, 52, 28, 3);
        inkFill(g, C.paper, 1.3);
        text(g, 'TL;DR', -20, -3, 9, C.amber, 'left');
        ln(g, -20, 4, 18, 4, 1.8, '#9a9a9a');
        ln(g, -20, 9, 10, 9, 1.8, '#9a9a9a');
        g.restore();
      }
      const J = fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J2) => {
          inWorld(gg, J2, () => {
            const h = L2(J2.W(J2.handF), J2.W(J2.handB), 0.5);
            const top = [h[0] + 2, h[1] - 6];
            const sw = 26;
            const hangX = top[0] - 6;
            gg.beginPath();
            gg.moveTo(top[0] - sw / 2, top[1]);
            gg.lineTo(top[0] + sw / 2, top[1]);
            gg.quadraticCurveTo(hangX + sw / 2 + 4, -20, hangX + sw / 2, -4);
            gg.lineTo(hangX - floorL, -4);
            gg.lineTo(hangX - floorL, 0);
            gg.lineTo(hangX + sw / 2 - 4, 0);
            gg.quadraticCurveTo(hangX - sw / 2, -6, hangX - sw / 2, -20);
            gg.closePath();
            inkFill(gg, C.paper, 1.3);
            gg.save();
            gg.clip();
            const off = scroll % 9;
            for (let yy = top[1] + 10 - off; yy < -8; yy += 9) {
              const i = Math.floor((yy + scroll) / 9);
              const ind = [0, 4, 8, 4, 0, 4][((i % 6) + 6) % 6];
              const t = clamp((yy - top[1]) / (-top[1]), 0, 1);
              const cx = lerp(top[0], hangX, t);
              ln(gg, cx - sw / 2 + 4 + ind, yy, cx + sw / 2 - 4 - hash(i) * 6, yy, 1.4, '#c9c9c9');
            }
            for (let xx = hangX - 6; xx > hangX - floorL; xx -= 6) {
              ln(gg, xx, -2, xx - 3, -2, 1.2, '#c9c9c9');
            }
            gg.restore();
            rr(gg, top[0] - sw / 2, top[1] - 1, sw, 7, 1);
            inkFill(gg, '#ff6600', 1.1);
            text(gg, 'Y', top[0] - sw / 2 + 4, top[1] + 5.6, 7.5, C.paper, 'left');
          });
        },
      });
      g.save();
      g.translate(jig, 0);
      poly(g, [[fm.x0, fm.y], [fm.x1, fm.y], [fm.nx1, fm.ny], [fm.nx1, fm.sy], [fm.nx0, fm.sy], [fm.nx0, fm.ny]], true);
      inkFill(g, C.steel, 1.6);
      g.beginPath();
      g.ellipse((fm.x0 + fm.x1) / 2, fm.y, (fm.x1 - fm.x0) / 2, 4, 0, 0, TAU);
      inkFill(g, '#d4d8dd', 1.4);
      g.restore();
      return J;
    },
  };

  // ---------- video-demo: the camera operator ----------
  function camcorder(g, x, y, rec) {
    g.save();
    g.translate(x, y);
    rr(g, -10, -8, 22, 14, 3);
    inkFill(g, '#3a3a3a', 1.4);
    rr(g, 12, -6, 8, 10, 2);
    inkFill(g, '#2b2b2b', 1.3);
    circle(g, 20, -1, 3);
    inkFill(g, C.sky, 1);
    rr(g, -6, -12, 10, 4, 1.5);
    inkFill(g, '#3a3a3a', 1.2);
    circle(g, -5, -1, 2.2);
    g.fillStyle = rec ? '#ef4444' : '#7a7a7a';
    g.fill();
    g.restore();
  }
  SC['p:video-demo'] = {
    dur: 5.2,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -104;
      const wx = 4, wy = -158, ww = 170, wh = 100;
      const btn = [44, -102, 44, 13];
      const full = [wx + 4, wy + 15, ww - 8, wh - 19];
      const zoomR = [btn[0] - 22, btn[1] - 20, btn[2] + 44, btn[3] + 38];
      const lr = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
      let rec = false, cur = [128 + Math.sin(S.t * 0.7) * 16, -76 + Math.cos(S.t * 0.9) * 8], click = 0, toast = 0, frame = full, frameA = 0, vo = 0, mp4 = 0, payoff = -1;
      const IDLE = P({ hF: [18, -66], hB: [10, -62], head: [6, -115] });
      const SHOOT = P({ hF: [22, -96], hB: [14, -92], head: [6, -112], chest: [3, -90] });
      let pose;
      if (T < 0) {
        pose = breathe(IDLE, S.t);
      } else {
        pose = breathe(seq(T, [[0, IDLE], [0.3, SHOOT], [3.6, SHOOT], [4.0, IDLE]]), S.t, 0.4);
        rec = T > 0.35 && T < 3.6 && Math.sin(T * 7) > -0.4;
        const target = [btn[0] + btn[2] * 0.6, btn[1] + btn[3] * 0.6];
        cur = L2(L2([150, -76], target, E.io(seg(T, 0.5, 1.3))), cur, E.soft(seg(T, 4.4, 5.1)));
        click = Math.sin(Math.PI * seg(T, 1.35, 1.55));
        toast = E.back(seg(T, 1.55, 1.8)) * (1 - E.soft(seg(T, 4.6, 5.0)));
        const z = E.io(seg(T, 1.7, 2.4)) * (1 - E.io(seg(T, 2.8, 3.4)));
        frame = lr(full, zoomR, z);
        frameA = E.soft(seg(T, 0.3, 0.5)) * (1 - E.soft(seg(T, 3.5, 3.7)));
        vo = T > 0.4 && T < 3.5 ? 1 : 0;
        mp4 = E.back(seg(T, 3.7, 4.0)) * (1 - E.soft(seg(T, 4.7, 5.2)));
        payoff = seg(T, 3.8, 4.5);
      }
      stand(g, wx, wy, ww, wh);
      win(g, wx, wy, ww, wh);
      ln(g, wx + 10, wy + 22, wx + 40, wy + 22, 2.4, C.ink);
      for (let i = 0; i < 3; i++) {
        ln(g, wx + 110 + i * 18, wy + 22, wx + 120 + i * 18, wy + 22, 1.8, C.faint);
      }
      ln(g, wx + 40, wy + 38, wx + 130, wy + 38, 3, '#d4d4d4');
      ln(g, wx + 56, wy + 46, wx + 114, wy + 46, 2, '#e3e3e3');
      rr(g, btn[0], btn[1] + click * 1, btn[2], btn[3], 6);
      inkFill(g, click > 0.2 || toast > 0.5 ? C.butterHi : C.butter, 1.3);
      text(g, 'Sign up', btn[0] + btn[2] / 2, btn[1] + 9.5 + click, 9, C.umber);
      for (let i = 0; i < 3; i++) {
        rr(g, wx + 12 + i * 52, wy + 76, 44, 18, 3);
        inkFill(g, ['#bfdbfe', '#fbcfe8', '#bbf7d0'][i], 1.1);
      }
      if (toast > 0.01) {
        g.save();
        g.translate(wx + ww - 32, wy + 46);
        g.scale(toast, toast);
        rr(g, -24, -8, 48, 15, 4);
        inkFill(g, C.green, 1.1, C.greenInk);
        text(g, 'welcome', 0, 3.4, 9, C.greenInk);
        g.restore();
      }
      cursor(g, cur[0], cur[1], click);
      const J = fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J2) => {
          const h = J2.handF;
          camcorder(gg, h[0] + 2, h[1] - 6, rec);
        },
      });
      if (frameA > 0.01) {
        const lens = J.W([J.handF[0] + 24, J.handF[1] - 7]);
        const [fx, fy, fw, fh] = frame;
        g.save();
        g.globalAlpha *= frameA * 0.35;
        poly(g, [lens, [fx, fy], [fx, fy + fh]], true);
        g.fillStyle = C.butter;
        g.fill();
        g.restore();
        g.save();
        g.globalAlpha *= frameA;
        const c = 7;
        const corners = [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]];
        for (const [cx0, cy0, dx, dy] of corners) {
          R.strokePath(g, [[cx0 + dx * c, cy0], [cx0, cy0], [cx0, cy0 + dy * c]], 1.8, '#ef4444');
        }
        if (rec) {
          circle(g, fx + 8, fy + 8, 2.4);
          g.fillStyle = '#ef4444';
          g.fill();
          text(g, 'REC', fx + 13, fy + 11, 9, '#ef4444', 'left');
        }
        g.restore();
      }
      if (vo) {
        const bx = -150, by = -160;
        rr(g, bx, by, 56, 22, 8);
        inkFill(g, C.paper, 1.3);
        poly(g, [[bx + 34, by + 22], [bx + 42, by + 30], [bx + 42, by + 22]]);
        inkFill(g, C.paper, 1.3);
        ln(g, bx + 35, by + 22, bx + 41, by + 22, 1.6, C.paper);
        for (let i = 0; i < 9; i++) {
          const hgt = 2 + Math.abs(Math.sin(S.t * 9 + i * 1.3) * Math.sin(S.t * 3.1 + i)) * 7;
          ln(g, bx + 8 + i * 5, by + 11 - hgt / 2, bx + 8 + i * 5, by + 11 + hgt / 2, 2, C.amber);
        }
      }
      if (mp4 > 0.01) {
        g.save();
        g.translate(-44, -26);
        g.scale(mp4, mp4);
        rr(g, -22, -14, 44, 28, 3);
        inkFill(g, '#2b2b2b', 1.4);
        for (let i = 0; i < 5; i++) {
          rr(g, -18 + i * 8, -12, 4, 3, 1);
          g.fillStyle = C.paper;
          g.fill();
          rr(g, -18 + i * 8, 9, 4, 3, 1);
          g.fill();
        }
        poly(g, [[-5, -6], [-5, 6], [6, 0]], true);
        inkFill(g, C.paper, 1.1);
        g.restore();
        if (mp4 > 0.6) {
          text(g, 'demo.mp4', -44, 8, 9, C.muted);
        }
        sparks(g, -44, -40, payoff, 14, 6, C.amber);
      }
      return J;
    },
  };
})();
