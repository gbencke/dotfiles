(function () {
  const SC = (window.SCENES = window.SCENES || {});
  const R = window.RIG;
  const { C, FS, TAU, E, P, mix, seq, legs, walkSeg, fig, inkFill, rr, ln, poly, circle, text, lerp, L2, clamp, seg, breathe, partial, star, arcPt, sparks, hash, inWorld, pulse, lp, sxv } = R;

  const turn = (T, a, b, from) => sxv(from * Math.cos(Math.PI * E.soft(seg(T, a, b))));
  const pop = (T, a, b) => E.back(seg(T, a, b));
  function ytBadge(g, x, y) {
    rr(g, x - 8, y - 5.5, 16, 11, 3);
    inkFill(g, C.red, 1.1, C.redInk);
    poly(g, [[x - 2.4, y - 3], [x + 3.4, y], [x - 2.4, y + 3]], true);
    g.fillStyle = C.redInk;
    g.fill();
  }
  function tick(g, x, y, s, k, col) {
    if (k <= 0) {
      return;
    }
    R.strokePath(g, partial([[x - 5 * s, y], [x - 1.5 * s, y + 3.6 * s], [x + 6 * s, y - 4.6 * s]], k), 2 * s, col || C.greenInk);
  }
  function badge(g, x, y, k) {
    if (k <= 0.01) {
      return;
    }
    g.save();
    g.translate(x, y);
    g.scale(k, k);
    circle(g, 0, 0, 6.5);
    inkFill(g, C.green, 1.2, C.greenInk);
    tick(g, 0, 0.4, 0.7, 1);
    g.restore();
  }
  function win(g, x, y, w, h, fill) {
    rr(g, x, y, w, h, 5);
    inkFill(g, fill || C.paper, 1.6);
    ln(g, x, y + 12, x + w, y + 12, 1.3);
    for (let i = 0; i < 3; i++) {
      circle(g, x + 7 + i * 6.5, y + 6, 1.8);
      inkFill(g, C.paper, 0.9);
    }
  }
  function stand(g, x0, x1, yb, sp) {
    ln(g, x0, yb, x0 - (sp ?? 6), 0, 2.2);
    ln(g, x1, yb, x1 + (sp ?? 6), 0, 2.2);
  }
  function words(g, x, y, w, seed, col, lw) {
    let cx = x, i = 0;
    while (cx < x + w - 3) {
      const ww = Math.min(x + w - cx, 7 + hash(seed + i * 3.1) * 15);
      ln(g, cx, y, cx + ww, y, lw ?? 2, col || '#cfcfcf');
      cx += ww + 4;
      i++;
    }
  }
  function held(g, J, fn) {
    inWorld(g, J, () => fn(J.W(J.handF), J.W(J.handB)));
  }

  // ---------- copy-marker: highlight, copy the link, it opens highlighted ----------
  const CM = { lines: [58, 108, 104, 92, 100, 66], ly: (i) => -142 + i * 13, p2: [96, -158, 78, 90] };
  function cmMarker(g, x, y, ang) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    rr(g, -6, -3.3, 14, 6.6, 2.4);
    inkFill(g, C.paper, 1.3);
    rr(g, 3, -3.3, 5, 6.6, 1.2);
    inkFill(g, C.butterHi, 1.1);
    poly(g, [[8, -2.6], [13, -1], [13, 1.4], [8, 2.6]], true);
    inkFill(g, C.butterHi, 1.1);
    g.restore();
  }
  function cmPage2(g, hl, scroll, addr, T) {
    const [x, y, w, h] = CM.p2;
    stand(g, x + 18, x + w - 18, y + h);
    rr(g, x, y, w, h, 5);
    inkFill(g, C.paper, 1.6);
    ln(g, x, y + 18, x + w, y + 18, 1.3);
    rr(g, x + 5, y + 4, w - 10, 11, 5.5);
    inkFill(g, C.chip, 1);
    if (addr > 0.01) {
      g.save();
      g.globalAlpha *= addr;
      text(g, '#:~:text=', x + w / 2, y + 12.6, 9, C.amber);
      g.restore();
    } else {
      ln(g, x + 12, y + 9.5, x + 40, y + 9.5, 1.6, C.faint);
    }
    g.save();
    rr(g, x + 1, y + 19, w - 2, h - 20, 4);
    g.clip();
    const dy = (1 - scroll) * 16;
    for (let i = 0; i < 5; i++) {
      const yy = y + 32 + i * 11 + dy, ww = CM.lines[i] * 0.6;
      if (i === 2 && hl > 0) {
        rr(g, x + 5, yy - 4.5, ww * hl + 4, 9, 2);
        g.fillStyle = C.butter;
        g.fill();
      }
      words(g, x + 7, yy, ww, i * 9 + 3, i === 0 ? '#9a9a9a' : '#cfcfcf', i === 0 ? 2.6 : 2);
    }
    g.restore();
  }
  SC['p:copy-marker'] = {
    dur: 6.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const TX0 = -100, TX1 = 4, LY = CM.ly(2);
      const HOLD = P({ hF: [17, -72], hB: [-3, -52], head: [5, -115] });
      const SWIPE = (tx, xx) => P({ hF: lp([tx - 10.4, LY + 8], xx, 0), hB: [-3, -52], head: [9, -117], chest: [3, -90] });
      const PRESS = (k) => P({ hF: lp([12 - k * 2, -86], -26, 0), hB: [-3, -52], head: [9, -114], chest: [3, -90] });
      const WATCH = P({ hF: [16, -70], hB: [-3, -52], head: [9, -117] });
      let x = -130, sx = 1, pose, hl1 = 1, hl2 = 1, scroll = 1, addr = 1, menu = 0, item = 0, chip = -1, mk = 0, tipX = TX1;
      if (T < 0) {
        const look = pulse(S.t, 7, 3.5, 2.4);
        pose = breathe(HOLD, S.t);
        pose.head = [5 + look * 4, -115 - look * 1.5];
        mk = 0;
      } else {
        const clear = 1 - E.soft(seg(T, 0, 0.35));
        hl2 = T < 4.1 ? clear : E.soft(seg(T, 4.1, 4.55));
        scroll = T < 3.8 ? clear : E.soft(seg(T, 3.8, 4.2));
        addr = T < 3.75 ? clear : E.soft(seg(T, 3.75, 3.95));
        if (T < 0.5) {
          const k = E.soft(seg(T, 0.05, 0.5));
          pose = mix(HOLD, SWIPE(TX0, -130), k);
          mk = k;
          hl1 = clear;
          tipX = TX0;
        } else if (T < 2.3) {
          const w = walkSeg(T, 0.5, 2.3, -130, -26);
          x = w.x;
          tipX = x + 30;
          pose = legs(SWIPE(tipX, x), w.ph, w.amp, { stride: w.stride });
          hl1 = (tipX - TX0) / (TX1 - TX0);
          mk = 1;
        } else if (T < 3.05) {
          x = -26;
          const k = E.soft(seg(T, 2.45, 2.8));
          const p = E.soft(seg(T, 2.82, 2.9)) * (1 - E.soft(seg(T, 2.9, 3.0)));
          pose = mix(SWIPE(TX1, x), PRESS(p), k);
          mk = 1 - k * 0.6;
          menu = E.back(seg(T, 2.35, 2.6));
          item = seg(T, 2.7, 2.8);
        } else if (T < 4.8) {
          x = -26;
          const k = E.soft(seg(T, 3.05, 3.5));
          pose = breathe(mix(PRESS(0), WATCH, k), S.t);
          mk = 0.4 * (1 - k);
          menu = 1 - E.soft(seg(T, 3.0, 3.15));
          item = 1;
        } else if (T < 5.1) {
          x = -26;
          sx = turn(T, 4.8, 5.1, 1);
          pose = WATCH;
        } else if (T < 6.1) {
          const w = walkSeg(T, 5.1, 6.1, -26, -130);
          x = w.x;
          sx = -1;
          pose = legs(HOLD, w.ph, w.amp, { stride: w.stride });
        } else {
          sx = turn(T, 6.1, 6.4, -1);
          pose = mix(HOLD, breathe(HOLD, S.t), seg(T, 6.4, 6.8));
        }
        if (T >= 3.05 && T < 3.8) {
          chip = E.io(seg(T, 3.05, 3.75));
        }
      }
      ln(g, -94, -64, -102, 0, 2.2);
      ln(g, 4, -64, 12, 0, 2.2);
      rr(g, -112, -158, 134, 94, 4);
      inkFill(g, C.paper, 1.6);
      if (hl1 > 0.01) {
        const xe = T >= 0.5 && T < 2.3 ? tipX : lerp(TX0, TX1, 1);
        g.save();
        g.globalAlpha *= T >= 0.5 && T < 2.3 ? 1 : hl1;
        rr(g, TX0 - 3, LY - 5, Math.max(2, xe - TX0 + 5), 10, 2);
        g.fillStyle = C.butter;
        g.fill();
        g.restore();
      }
      CM.lines.forEach((w, i) => words(g, -100, CM.ly(i), w, i * 9 + 3, i === 0 ? '#9a9a9a' : '#cfcfcf', i === 0 ? 2.6 : 2));
      cmPage2(g, hl2, scroll, addr, T);
      const ang = lerp(-1.3, -0.65, mk);
      fig(g, pose, x, 0, {
        sx,
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (h) => cmMarker(gg, h[0], h[1] - 1, sx < 0 ? Math.PI - ang : ang)),
      });
      if (menu > 0.01) {
        g.save();
        g.translate(-2, -110);
        g.scale(menu, menu);
        g.fillStyle = 'rgba(0,0,0,0.08)';
        rr(g, 2, 3, 86, 30, 4);
        g.fill();
        rr(g, 0, 0, 86, 30, 4);
        inkFill(g, C.paper, 1.3);
        text(g, 'Copy', 7, 11.5, 9, C.muted, 'left');
        rr(g, 2, 16, 82, 12, 3);
        g.fillStyle = item > 0.5 ? C.butterSoft : '#f6f6f6';
        g.fill();
        text(g, 'Copy Marker URL', 7, 25.3, 9, item > 0.5 ? C.umber : C.ink, 'left');
        g.restore();
      }
      if (chip >= 0) {
        const p = arcPt([34, -94], [135, -147], 34, chip);
        const s = lerp(1, 0.85, chip);
        g.save();
        g.translate(p[0], p[1]);
        g.rotate(Math.sin(chip * Math.PI) * -0.2);
        g.scale(s, s);
        rr(g, -25, -7, 50, 14, 7);
        inkFill(g, C.butterSoft, 1.2, C.amber);
        text(g, '#:~:text=', 0, 3.2, 9, C.umber);
        g.restore();
      }
      if (T >= 0) {
        sparks(g, CM.p2[0] + 30, -104, seg(T, 4.45, 5.2), 16, 5, C.amber);
      }
    },
  };

  // ---------- github actions video: push a commit down the workflow ----------
  const GA = { st: [16, 60, 104], names: ['build', 'test', 'deploy'], scan: [[1.55, 2.05], [2.4, 2.9], [3.25, 3.75]] };
  function gaBox(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    rr(g, -11, -18, 22, 18, 2);
    inkFill(g, C.wood, 1.4);
    ln(g, -11, -13, 11, -13, 1, '#b9a27c');
    ln(g, -6, -6.5, 6, -6.5, 1.4, C.umber);
    circle(g, 0, -6.5, 2.6);
    inkFill(g, C.paper, 1.1, C.umber);
    g.restore();
  }
  function gaBoxX(T) {
    if (T < 0.35) {
      return -82;
    }
    if (T < 0.9) {
      return lerp(-82, -58, E.soft(seg(T, 0.35, 0.9)));
    }
    const legs3 = [[0.9, 1.55, -58, 16], [2.05, 2.4, 16, 60], [2.9, 3.25, 60, 104], [3.75, 4.0, 104, 126]];
    for (const [a, b, x0, x1] of legs3) {
      if (T < a) {
        return x0;
      }
      if (T < b) {
        return lerp(x0, x1, E.soft(seg(T, a, b)));
      }
    }
    return 126;
  }
  SC['p:github actions video'] = {
    dur: 5.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const bx = T < 0 ? -82 : gaBoxX(T);
      const moving = T >= 0.9 && T < 4.0 ? Math.abs(gaBoxX(T + 0.02) - gaBoxX(T - 0.02)) : 0;
      const roll = (S.st.roll = (S.st.roll || 0) + moving * 0.12);
      const page = T < 0 ? 1 : (1 - E.soft(seg(T, 0, 0.3))) * (T < 1 ? 1 : 0) + pop(T, 4.0, 4.35);
      const state = (i) => {
        if (T < 0 || T < 0.15) {
          return 2;
        }
        const [a, b] = GA.scan[i];
        return T < a ? 0 : T < b ? 1 : 2;
      };
      rr(g, -96, -40, 26, 40, 2);
      inkFill(g, '#f4f4f2', 1.5);
      ln(g, -96, -30, -70, -30, 1, C.faint);
      ln(g, -14, 0, -14, -106, 3);
      ln(g, 124, 0, 124, -106, 3);
      ln(g, -20, -104, 130, -104, 3.4);
      rr(g, 0, -126, 108, 18, 3);
      inkFill(g, C.paper, 1.4);
      text(g, 'deployment.yml', 48, -113.6, 9, '#3d3d3d');
      ytBadge(g, 96, -117);
      [-56, 40, 120].forEach((lx) => ln(g, lx, -34, lx + (lx > 100 ? 4 : -4), 0, 2.2));
      rr(g, -70, -41, 204, 8, 4);
      inkFill(g, C.steel, 1.4);
      for (let rx = -62; rx < 132; rx += 17) {
        circle(g, rx, -37, 2.4);
        inkFill(g, C.paper, 1);
        ln(g, rx, -37, rx + Math.cos(roll + rx) * 2.2, -37 + Math.sin(roll + rx) * 2.2, 1, C.ink);
      }
      GA.st.forEach((sx0, i) => {
        const s = state(i);
        if (s === 1) {
          const f = 0.35 + Math.sin(S.t * 18) * 0.15;
          g.save();
          g.globalAlpha *= f;
          poly(g, [[sx0 - 9, -86], [sx0 + 9, -86], [sx0 + 15, -58], [sx0 - 15, -58]], true);
          g.fillStyle = C.butterHi;
          g.fill();
          g.restore();
        }
        ln(g, sx0, -104, sx0, -100, 2);
        rr(g, sx0 - 18, -100, 36, 15, 3);
        inkFill(g, s === 2 ? C.green : s === 1 ? C.butter : C.chip, 1.3, s === 2 ? C.greenInk : C.ink);
        text(g, GA.names[i], sx0, -89.5, 9, s === 2 ? C.greenInk : '#3d3d3d');
        if (s === 2) {
          const k = T < 0 ? 1 : E.back(seg(T, GA.scan[i][1], GA.scan[i][1] + 0.25));
          badge(g, sx0 + 17, -100, k);
        }
      });
      if (page > 0.01) {
        ln(g, 158, -64, 158, 0, 2.4);
        g.save();
        g.translate(158, -84);
        g.scale(page, page);
        rr(g, -20, -22, 40, 42, 4);
        inkFill(g, C.paper, 1.5);
        ln(g, -20, -14, 20, -14, 1.2);
        rr(g, -14, -9, 16, 5, 1.5);
        g.fillStyle = C.butter;
        g.fill();
        words(g, -14, 2, 26, 4, '#cfcfcf', 1.8);
        words(g, -14, 8, 20, 9, '#cfcfcf', 1.8);
        rr(g, -12, 11, 24, 8, 4);
        inkFill(g, C.green, 0.9, C.greenInk);
        g.restore();
        if (page > 0.6) {
          text(g, 'live', 158, -66.8, 9, C.greenInk);
        }
      }
      let boxS = 1;
      if (T >= 3.9 && T < 4.3) {
        boxS = 1 - E.in(seg(T, 3.9, 4.15));
      }
      const drop = T >= 0 ? seg(T, 4.9, 5.25) : 1;
      let x = -122, pose;
      const REST = P({ hF: lp([-91, -57], -122, 0), hB: [-3, -51], head: [6, -116], chest: [3, -90] });
      const PUSH = (xx, b) => P({ hip: [-2, -57], chest: [9, -87], head: [17, -110], hF: lp([b - 11, -50], xx, 0), hB: lp([b - 11, -44], xx, 0), fF: [16, -2.5], fB: [-14, -2.5] });
      const WATCH = (lk) => P({ hF: [8, -56], hB: [-4, -54], head: [6 + lk * 4, -116 - lk * 2] });
      if (T < 0) {
        const lk = pulse(S.t, 6, 3, 1.8);
        pose = breathe(REST, S.t);
        pose.head = [6 + lk * 4, -116 - lk * 3];
      } else if (T < 0.35) {
        pose = mix(REST, PUSH(-122, -82), E.soft(seg(T, 0, 0.35)));
      } else if (T < 0.9) {
        const w = walkSeg(T, 0.35, 0.9, -122, -100);
        x = w.x;
        pose = legs(PUSH(x, bx), w.ph, w.amp * 0.6, { stride: w.stride });
      } else {
        const w = walkSeg(T, 4.6, 5.1, -100, -122);
        x = w.x;
        const lk = lerp(clamp((bx + 60) / 190, 0, 1), 0, E.soft(seg(T, 4.45, 5.1)));
        const cheer = E.soft(seg(T, 4.05, 4.3)) * (1 - E.soft(seg(T, 4.4, 4.7)));
        pose = mix(PUSH(-100, -58), breathe(WATCH(lk), S.t), E.soft(seg(T, 0.9, 1.3)));
        pose = mix(pose, P({ hF: [12, -134], hB: [-4, -54], head: [8, -119] }), cheer);
        pose = mix(pose, breathe(REST, S.t), E.soft(seg(T, 5.15, 5.6)));
        pose = legs(pose, w.ph, w.amp * 0.7, { stride: w.stride });
      }
      fig(g, pose, x, 0, { wave: S.wave, wt: S.wt });
      if (T < 0 || T < 4.3) {
        gaBox(g, bx, bx < -70 ? -40 : -41, boxS);
      }
      if (T >= 4.3) {
        const y = drop < 1 ? lerp(-150, -40, E.in(drop)) : -40 - Math.sin(Math.PI * seg(T, 5.25, 5.45)) * 5;
        gaBox(g, -82, y, 1);
      }
      if (T >= 0) {
        sparks(g, 158, -108, seg(T, 4.2, 4.9), 14, 5, C.amber);
      }
    },
  };

  // ---------- makers.ae: makers drop by the table in Dubai ----------
  function mkSkyline(g) {
    const col = '#f4f4f4', st = '#d9d9d9';
    [[66, 52, 16], [86, 78, 13], [142, 66, 16], [162, 44, 14]].forEach(([x, h, w]) => {
      rr(g, x - w / 2, -h, w, h, 1.5);
      inkFill(g, col, 1.1, st);
      for (let y = -h + 8; y < -6; y += 9) {
        ln(g, x - w / 2 + 4, y, x + w / 2 - 4, y, 1, '#e6e6e6');
      }
    });
    poly(g, [[103, 0], [103, -58], [106, -58], [106, -98], [109, -98], [109, -132], [111.5, -132], [113, -172], [114.5, -132], [117, -132], [117, -98], [120, -98], [120, -58], [123, -58], [123, 0]], true);
    inkFill(g, col, 1.1, st);
  }
  function mkBunting(g, t) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      pts.push([lerp(-176, -6, k), -156 + Math.sin(Math.PI * k) * 14]);
    }
    R.strokePath(g, pts, 1.1, C.muted);
    const cols = ['#bfdbfe', '#fbcfe8', '#bbf7d0', '#fed7aa', '#ede9fe'];
    for (let i = 0; i < 9; i++) {
      const a = pts[i], b = pts[i + 1];
      const m = L2(a, b, 0.5), sw = Math.sin(t * 2 + i) * 1.5;
      poly(g, [a, b, [m[0] + sw, m[1] + 11]], true);
      inkFill(g, cols[i % cols.length], 1, C.ink);
    }
  }
  function mkRobot(g, x, t, blink) {
    rr(g, x - 8, -70, 16, 18, 2.5);
    inkFill(g, C.steel, 1.3);
    rr(g, x - 6, -81, 12, 10, 2);
    inkFill(g, C.paper, 1.3);
    circle(g, x - 2.5, -76, 1.1);
    circle(g, x + 2.5, -76, 1.1);
    g.fillStyle = C.ink;
    g.fill();
    ln(g, x, -81, x, -87, 1.2);
    circle(g, x, -88.5, 2);
    inkFill(g, blink ? C.butterHi : C.paper, 1);
    circle(g, x, -61, 3);
    inkFill(g, C.butter, 1);
  }
  function mkLaptop(g, x, y, chart) {
    rr(g, x - 13, y - 18, 26, 17, 2);
    inkFill(g, '#2b2b2b', 1.3);
    for (let i = 0; i < 4; i++) {
      const h = (3 + hash(i * 3.3) * 8) * chart;
      ln(g, x - 7 + i * 5, y - 4, x - 7 + i * 5, y - 4 - h, 2.2, i === 3 ? C.butterHi : '#9ccc65');
    }
    rr(g, x - 15, y - 1, 30, 3, 1);
    inkFill(g, C.steel, 1.2);
  }
  function mkDrone(g, x, y, t, spin) {
    ln(g, x - 12, y, x + 12, y, 2.2);
    rr(g, x - 5, y - 3, 10, 6, 2);
    inkFill(g, C.butter, 1.2);
    [-12, 12].forEach((d) => {
      ln(g, x + d, y, x + d, y - 4, 1.4);
      const w = 7 * Math.abs(Math.cos(t * (spin ? 40 : 3) + d));
      ln(g, x + d - w, y - 4.5, x + d + w, y - 4.5, 1.6, C.muted);
    });
  }
  SC['p:makers.ae'] = {
    dur: 6.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      mkSkyline(g);
      mkBunting(g, S.t);
      text(g, 'makers.ae', -96, -124, 11, C.amber);
      const tinker = (t) => P({ hF: lp([-31 + Math.sin(t * 15) * 1.5, -63 + Math.cos(t * 11) * 1.5], -58, 0), hB: lp([-38, -55], -58, 0), head: [9, -112], chest: [3, -89] });
      const CHEER = (t, ph) => P({ hF: [12, -134 - Math.sin(t * 9 + ph) * 3], hB: [-8, -131 - Math.cos(t * 9 + ph) * 3], head: [3, -119] });
      const cheer = T >= 0 ? E.soft(seg(T, 2.9, 3.2)) * (1 - E.soft(seg(T, 3.7, 4.0))) : 0;
      let host;
      if (T < 0) {
        host = breathe(tinker(S.t), S.t);
      } else {
        const look = E.soft(seg(T, 1.0, 1.3)) * (1 - E.soft(seg(T, 4.2, 4.6)));
        const hi = E.soft(seg(T, 1.3, 1.6)) * (1 - E.soft(seg(T, 2.2, 2.5)));
        host = mix(breathe(tinker(S.t), S.t), breathe(P({ hF: [10, -56], hB: [-4, -54], head: [8, -116] }), S.t), look);
        host = mix(host, P({ hF: [16 + Math.sin(T * 12) * 6, -130], hB: [-4, -54], head: [5, -116] }), hi);
        host = mix(host, CHEER(S.t, 0), cheer);
      }
      ln(g, -36, -48, -40, 0, 2.4);
      ln(g, 60, -48, 64, 0, 2.4);
      mkRobot(g, -24, S.t, Math.sin(S.t * 5) > 0.3 || cheer > 0.5);
      fig(g, host, -58, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (h) => {
          if (cheer > 0.3) {
            return;
          }
          ln(gg, h[0] - 4, h[1] + 3, h[0] + 3, h[1] - 3, 3, C.amber);
          ln(gg, h[0] + 3, h[1] - 3, h[0] + 8, h[1] - 7, 1.4, C.ink);
        }),
      });
      rr(g, -44, -52, 112, 6, 2);
      inkFill(g, C.wood, 1.5);
      if (T < 0) {
        return;
      }
      const vis = (xx) => clamp((184 - xx) / 26, 0, 1);
      const visitor = (o) => {
        let x, sx = -1, pose;
        const w1 = walkSeg(T, o.in[0], o.in[1], o.x0, o.x1);
        const w2 = walkSeg(T, o.out[0], o.out[1], o.x1, o.x0);
        if (T < o.in[1]) {
          x = w1.x;
          pose = legs(o.hold(T), w1.ph, w1.amp, { stride: w1.stride });
        } else if (T < o.out[0]) {
          x = o.x1;
          sx = T < o.out[0] - 0.25 ? -1 : turn(T, o.out[0] - 0.25, o.out[0], -1);
          pose = mix(breathe(o.hold(T), S.t + o.ph), CHEER(S.t, o.ph), cheer);
        } else {
          x = w2.x;
          sx = 1;
          pose = legs(o.hold(T), w2.ph, w2.amp, { stride: w2.stride });
        }
        return { x, sx, pose, a: vis(x) };
      };
      const droneOut = E.io(seg(T, 2.1, 2.7)) * (1 - E.io(seg(T, 3.9, 4.4)));
      const show = E.soft(seg(T, 1.6, 1.9)) * (1 - E.soft(seg(T, 4.15, 4.45)));
      const lower = E.soft(seg(T, 2.1, 2.4)) * (1 - E.soft(seg(T, 4.05, 4.4)));
      const v1 = visitor({ in: [0, 1.7], out: [4.6, 6.4], x0: 200, x1: 92, ph: 1, hold: () => P({ hF: L2([16, -66], [22, -82], show), hB: L2([10, -64], [16, -80], show), head: [6, -115] }) });
      const v2 = visitor({ in: [0.3, 2.0], out: [4.7, 6.6], x0: 232, x1: 134, ph: 2, hold: () => P({ hF: L2([18, -112], [14, -96], lower), hB: [-3, -52], head: [6, -118] }) });
      let dronePos = null;
      if (v2.a > 0) {
        fig(g, v2.pose, v2.x, 0, {
          sx: v2.sx, alpha: v2.a,
          held: (gg, J) => held(gg, J, (h) => {
            dronePos = [h[0], h[1] - 6];
          }),
        });
      }
      if (v1.a > 0) {
        fig(g, v1.pose, v1.x, 0, {
          sx: v1.sx, alpha: v1.a, hat: true,
          held: (gg, J) => held(gg, J, (h) => {
            gg.save();
            gg.globalAlpha *= v1.a;
            mkLaptop(gg, h[0] + 5 * v1.sx, h[1] + 4, 0.3 + 0.7 * E.back(seg(T, 1.9, 2.3)) * (1 - E.soft(seg(T, 4.1, 4.4))));
            gg.restore();
          }),
        });
      }
      if (dronePos) {
        const hover = [14 + Math.sin(S.t * 1.7) * 10, -124 + Math.sin(S.t * 3.1) * 3];
        const p = L2(dronePos, hover, droneOut);
        g.save();
        g.globalAlpha *= v2.a;
        mkDrone(g, p[0], p[1], S.t, droneOut > 0.02);
        g.restore();
      }
      if (cheer > 0) {
        const cols = ['#bfdbfe', '#fbcfe8', '#bbf7d0', '#fed7aa', C.butterHi];
        const k = seg(T, 2.95, 3.9);
        for (let i = 0; i < 14; i++) {
          const a = -Math.PI / 2 + (hash(i * 7.1) - 0.5) * 2.2, sp = 50 + hash(i * 3.7) * 50;
          const px = 30 + Math.cos(a) * sp * k, py = -120 + Math.sin(a) * sp * k + 90 * k * k;
          g.save();
          g.globalAlpha *= 1 - k;
          g.translate(px, py);
          g.rotate(k * 8 + i);
          rr(g, -2.5, -1.5, 5, 3, 0.5);
          g.fillStyle = cols[i % cols.length];
          g.fill();
          g.restore();
        }
      }
    },
  };

  // ---------- yaml-sample: feed YAML in, crank, JSON pops out ----------
  function ySheet(g, cx, cy, rot, json) {
    const w = json ? 52 : 38, h = json ? 48 : 42;
    g.save();
    g.translate(cx, cy);
    g.rotate(rot || 0);
    rr(g, -w / 2, -h / 2, w, h, 2.5);
    inkFill(g, json ? '#fefcf3' : C.paper, 1.3);
    const L = json ? ['{', ' "a": 1,', ' "b": ["x"]', '}'] : ['a: 1', 'b:', '  - x'];
    L.forEach((s, i) => text(g, s, -w / 2 + 5, -h / 2 + 12 + i * 10.5, 9, json ? (i === 0 || i === 3 ? C.amber : '#3d3d3d') : (i === 2 ? C.amber : '#3d3d3d'), 'left'));
    g.restore();
  }
  function yMachine(g, shake, gear, light, crank) {
    ln(g, 4, -24, 0, 0, 2.4);
    ln(g, 58, -24, 62, 0, 2.4);
    g.save();
    g.translate(shake, 0);
    rr(g, -4, -84, 70, 60, 6);
    inkFill(g, C.steel, 1.6);
    rr(g, 5, -87, 26, 4, 1.5);
    inkFill(g, '#3a3a3a', 1.1);
    rr(g, 35, -87, 26, 4, 1.5);
    inkFill(g, '#3a3a3a', 1.1);
    rr(g, 4, -76, 44, 13, 2.5);
    inkFill(g, C.paper, 1.2);
    text(g, 'js-yaml', 26, -66.5, 9, '#3d3d3d');
    circle(g, 57, -70, 3.4);
    inkFill(g, light ? C.butterHi : C.faint, 1.1);
    g.save();
    g.translate(26, -43);
    g.rotate(gear);
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, r = i % 2 ? 8 : 11;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    inkFill(g, C.butterSoft, 1.2);
    circle(g, 0, 0, 2.6);
    inkFill(g, C.paper, 1);
    g.restore();
    ln(g, 48, -36, 58, -36, 1.4, C.faint);
    ln(g, 48, -31, 54, -31, 1.4, C.faint);
    ln(g, -4, -66, -10, -66, 2.6);
    circle(g, -10, -66, 3);
    inkFill(g, C.paper, 1.2);
    ln(g, -10, -66, crank[0], crank[1], 2.6);
    g.restore();
  }
  SC['p:yaml-sample'] = {
    dur: 6.2,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const READ = P({ hF: [32, -80], hB: [26, -76], head: [8, -112] });
      const FEED = (hy, xx) => P({ hF: lp([4, hy], xx, 0), hB: [-3, -52], head: [9, -115], chest: [3, -90] });
      const PICK = P({ hB: lp([-93, -68], -60, 0), hF: [6, -56], chest: [-5, -89], head: [-7, -114], eb: -1 });
      let x = -60, pose, sheet = null, sheetIn = null, jy = -96, ca = -Math.PI / 2, gear = S.t * 0.4, shake = 0, light = Math.sin(S.t * 2) > 0.6, pickK = -1;
      const knob = () => [-10 + Math.cos(ca) * 8, -66 + Math.sin(ca) * 8];
      if (T < 0) {
        pose = breathe(READ, S.t);
        pose.head = [8, -112 + Math.sin(S.t * 1.3) * 1.5];
        sheet = 'hand';
      } else {
        jy = T < 2.9 ? lerp(-96, -40, E.in(seg(T, 0, 0.45))) : lerp(-40, -110, E.back(seg(T, 2.9, 3.3)));
        if (T >= 3.3) {
          jy = -110 + E.soft(seg(T, 5.4, 6.0)) * 14;
        }
        if (T < 0.7) {
          const w = walkSeg(T, 0, 0.7, -60, -30);
          x = w.x;
          pose = legs(READ, w.ph, w.amp, { stride: w.stride });
          sheet = 'hand';
        } else if (T < 1.25) {
          x = -30;
          const up = E.soft(seg(T, 0.7, 0.95)), dn = E.in(seg(T, 0.95, 1.2));
          pose = mix(READ, FEED(lerp(-96, -84, dn), x), up);
          sheet = 'hand';
          if (dn > 0) {
            sheet = null;
            const hw = [4, lerp(-96, -84, dn)];
            sheetIn = [hw[0] + 14, hw[1] - 14];
          }
        } else if (T < 1.5) {
          x = -30;
          sheetIn = [18, lerp(-98, -40, E.in(seg(T, 1.2, 1.5)))];
          pose = mix(FEED(-84, x), P({ hF: lp(knob(), x, 0), hB: [-3, -52], head: [8, -114] }), E.soft(seg(T, 1.25, 1.5)));
        } else if (T < 2.9) {
          x = -30;
          const k = E.io(seg(T, 1.5, 2.8));
          ca = -Math.PI / 2 + k * TAU * 2.5;
          gear = S.t * 0.4 + k * 14;
          shake = Math.sin(T * 50) * 0.8 * Math.sin(Math.PI * k);
          light = Math.sin(T * 20) > 0;
          pose = P({ hF: lp(knob(), x, 0), hB: [-3, -52], head: [8, -114], chest: [3 + Math.cos(ca) * 1.5, -90] });
        } else if (T < 3.7) {
          x = -30;
          ca = Math.PI / 2;
          gear = S.t * 0.4 + 14;
          light = true;
          const k = E.soft(seg(T, 2.9, 3.3));
          pose = mix(P({ hF: lp(knob(), x, 0), hB: [-3, -52], head: [8, -114] }), P({ hF: [14, -122], hB: [-3, -52], head: [10, -119] }), k);
          pose = mix(pose, P({ hF: [10, -60], hB: [-3, -52], head: [5, -116] }), E.soft(seg(T, 3.4, 3.7)));
        } else if (T < 4.3) {
          ca = Math.PI / 2;
          gear = S.t * 0.4 + 14;
          const w = walkSeg(T, 3.7, 4.3, -30, -60);
          x = w.x;
          pose = legs(P({ hF: [10, -60], hB: [-3, -52], head: [5, -116] }), -w.ph, w.amp, { stride: w.stride });
        } else {
          ca = Math.PI / 2;
          gear = S.t * 0.4 + 14;
          const a = E.soft(seg(T, 4.3, 4.8)), b = E.soft(seg(T, 5.2, 5.8));
          pose = mix(mix(P({ hF: [10, -60], hB: [-3, -52], head: [5, -116] }), PICK, a), breathe(READ, S.t), b);
          pickK = T > 4.75 ? b : -1;
        }
      }
      rr(g, -110, -60, 30, 4, 1.5);
      inkFill(g, C.wood, 1.3);
      ln(g, -95, -56, -95, 0, 2.6);
      ln(g, -103, 0, -87, 0, 2.6);
      for (let i = 0; i < 3; i++) {
        rr(g, -107 + i * 2, -74 + i * 1.5, 22, 14, 1.5);
        inkFill(g, C.paper, 1);
      }
      g.save();
      g.beginPath();
      g.rect(-60, -200, 160, 114);
      g.clip();
      ySheet(g, 48, jy, 0.04, true);
      if (sheetIn) {
        ySheet(g, sheetIn[0], sheetIn[1], 0, false);
      }
      g.restore();
      yMachine(g, shake, gear, light, knob());
      if (T >= 2.9 && T < 3.9) {
        sparks(g, 48, -138, seg(T, 3.1, 3.8), 16, 5, C.amber);
      }
      fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (hf, hb) => {
          if (sheet === 'hand') {
            const up = T >= 0.7 && T < 1.25 ? E.soft(seg(T, 0.7, 0.95)) : 0;
            ySheet(gg, hf[0] + lerp(4, 14, up), hf[1] + lerp(2, -14, up), lerp(-0.08, 0, up), false);
          } else if (pickK >= 0) {
            const p = L2([hb[0] + 2, hb[1] - 6], [hf[0] + 4, hf[1] + 2], pickK);
            ySheet(gg, p[0], p[1], lerp(-0.4, -0.08, pickK), false);
          }
        }),
      });
      circle(g, knob()[0] + shake, knob()[1], 2.8);
      inkFill(g, C.wood, 1.2);
    },
  };

  // ---------- promises-examples: ring for getSum, wait on the promise, it resolves ----------
  function prTicket(g, cx, cy, rot, done, t) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot || 0);
    rr(g, -29, -19, 58, 38, 3);
    inkFill(g, done > 0.5 ? C.green : C.paper, 1.3, done > 0.5 ? C.greenInk : C.ink);
    text(g, 'Promise', 0, -3.5, 9, done > 0.5 ? C.greenInk : '#3d3d3d');
    if (done > 0.5) {
      text(g, 'value: 3', -3, 11, 9, C.greenInk);
      tick(g, 20, 7.5, 0.55, 1);
    } else {
      text(g, 'pending', -4, 11, 9, C.amber);
      for (let i = 0; i < 3; i++) {
        circle(g, 17 + i * 3.4, 8.5, 0.9 + Math.max(0, Math.sin(t * 7 - i * 0.9)) * 0.7);
        g.fillStyle = C.amber;
        g.fill();
      }
    }
    g.restore();
  }
  SC['p:promises-examples'] = {
    dur: 6.0,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -8;
      const DRUM = (t) => P({ hF: lp([8 + Math.max(0, Math.sin(t * 9)) * 2, -57 - Math.max(0, Math.sin(t * 9)) * 2.5], x, 0), hB: [-4, -52], head: [6, -115] });
      const BELL = (k) => P({ hF: lp([22, lerp(-66, -60, k)], x, 0), hB: [-4, -52], head: [9, -114], chest: [3, -90] });
      const WAIT = (t, tap) => P({ hF: [24, -70], hB: [-4, -54], head: [6 + pulse(t, 2.2, 0.4, 1.2) * 4, -115 - pulse(t, 2.2, 0.4, 1.2) * 3], fF: [10, -2.5 - tap * 4], kF: [28, -34] });
      const PROUD = P({ hF: [20, -112], hB: [-4, -54], head: [8, -118] });
      let pose, ticket = null, done = 0, open = 0, orb = -1, bellK = 0, rise = -1;
      if (T < 0) {
        pose = breathe(DRUM(S.t), S.t);
      } else {
        const tap = Math.max(0, Math.sin(T * 9));
        bellK = seg(T, 0.42, 0.5) * (1 - seg(T, 0.6, 0.75));
        open = E.soft(seg(T, 3.15, 3.5)) * (1 - E.soft(seg(T, 5.0, 5.4)));
        done = T > 4.1 ? 1 : 0;
        if (T < 0.75) {
          pose = mix(DRUM(S.t), BELL(bellK), E.soft(seg(T, 0, 0.4)));
          rise = seg(T, 0.5, 0.75);
        } else if (T < 1.15) {
          pose = mix(BELL(0), P({ hF: lp([8, -70], x, 0), hB: [-4, -52], head: [9, -114] }), E.soft(seg(T, 0.75, 1.0)));
          rise = 1;
          if (T > 1.0) {
            rise = -1;
            ticket = 'hand';
          }
        } else if (T < 4.1) {
          pose = mix(P({ hF: lp([8, -70], x, 0), hB: [-4, -52], head: [9, -114] }), breathe(WAIT(T, T > 1.6 && T < 3.3 ? tap : 0), S.t), E.soft(seg(T, 1.15, 1.6)));
          ticket = 'hand';
          if (T > 3.55) {
            orb = E.io(seg(T, 3.55, 4.1));
          }
        } else if (T < 5.2) {
          pose = mix(WAIT(T, 0), PROUD, E.back(seg(T, 4.1, 4.5)) * (1 - E.soft(seg(T, 4.9, 5.2))));
          ticket = 'hand';
        } else {
          pose = mix(WAIT(T, 0), DRUM(S.t), E.soft(seg(T, 5.2, 5.8)));
          ticket = T < 5.6 ? 'hand' : null;
        }
      }
      rr(g, 34, -128, 76, 66, 3);
      inkFill(g, '#f6f6f4', 1.5);
      rr(g, 42, -118, 60, 44, 2);
      inkFill(g, '#3a3a3a', 1.3);
      if (open > 0.1) {
        rr(g, 56, -86, 32, 6, 3);
        inkFill(g, C.paper, 1.1);
        if (orb < 0 && T < 4) {
          circle(g, 72, -94, 7);
          inkFill(g, C.butter, 1.2);
          text(g, '3', 72, -90.5, 10, C.umber);
        }
      }
      const sh = (1 - open) * 44;
      if (sh > 0.5) {
        g.save();
        rr(g, 42, -118, 60, sh, 2);
        g.clip();
        rr(g, 42, -118, 60, sh, 2);
        g.fillStyle = C.paper;
        g.fill();
        for (let yy = -118 + 6; yy < -118 + sh; yy += 6) {
          ln(g, 43, yy, 101, yy, 1, C.faint);
        }
        g.restore();
        rr(g, 42, -118, 60, sh, 2);
        inkFill(g, null, 1.2);
      }
      if (T >= 1.6 && T < 3.2) {
        for (let i = 0; i < 3; i++) {
          const k = ((T * 0.9 + i / 3) % 1);
          g.save();
          g.globalAlpha *= Math.sin(Math.PI * k) * 0.8;
          ln(g, 54 + i * 18, -124 - k * 12, 58 + i * 18, -128 - k * 12, 1.2, C.muted);
          g.restore();
        }
      }
      rr(g, 46, -150, 52, 16, 4);
      inkFill(g, C.butterSoft, 1.3);
      text(g, 'async', 72, -138.6, 9, C.umber);
      ytBadge(g, 108, -142);
      if (rise >= 0) {
        prTicket(g, 34, lerp(-46, -74, E.out(rise)), 0, 0, S.t);
      }
      rr(g, 12, -50, 112, 50, 2);
      inkFill(g, C.wood, 1.5);
      rr(g, 6, -55, 124, 6, 2.5);
      inkFill(g, C.woodDk, 1.4);
      rr(g, 26, -55, 16, 2.5, 1);
      g.fillStyle = C.ink;
      g.fill();
      text(g, 'getSum(1, 2)', 68, -27, 10, C.umber);
      g.beginPath();
      g.arc(22, -55 + bellK * 1.5, 6, Math.PI, 0);
      g.closePath();
      inkFill(g, C.butterHi, 1.3);
      circle(g, 22, -62 + bellK * 1.5, 1.4);
      inkFill(g, C.ink, 1);
      if (T >= 0) {
        sparks(g, 22, -60, seg(T, 0.45, 0.9), 10, 5, C.amber);
      }
      let tw = null;
      fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (h) => {
          if (ticket) {
            const fade = T >= 5.2 ? 1 - seg(T, 5.3, 5.6) : 1;
            gg.save();
            gg.globalAlpha *= fade;
            tw = [h[0] + 26, h[1] - 4];
            prTicket(gg, tw[0], tw[1], -0.06, done, S.t);
            gg.restore();
          }
        }),
      });
      if (orb >= 0 && tw) {
        const p = arcPt([72, -94], tw, 30, orb);
        circle(g, p[0], p[1], lerp(7, 4, orb));
        inkFill(g, C.butter, 1.2);
        text(g, '3', p[0], p[1] + 3.5, 10, C.umber);
      }
      if (T >= 4.1 && tw) {
        sparks(g, tw[0], tw[1] - 12, seg(T, 4.1, 4.8), 22, 7, C.greenInk);
      }
    },
  };

  // ---------- data structures in JS: push a block on the stack, pop it back ----------
  const DS = { cols: ['#bfdbfe', '#fbcfe8', '#bbf7d0', '#fed7aa'], tx: 52 };
  function dsBlock(g, cx, cy, n, rot) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot || 0);
    rr(g, -15, -9, 30, 18, 2.5);
    inkFill(g, DS.cols[(n - 1) % 4], 1.4);
    text(g, String(n), 0, 3.6, 10, '#3d3d3d');
    g.restore();
  }
  function dsBoard(g, log, k) {
    stand(g, 98, 158, -84, 4);
    rr(g, 84, -158, 90, 74, 4);
    inkFill(g, '#3b4a42', 1.6);
    rr(g, 84, -158, 90, 74, 4);
    inkFill(g, null, 3, C.woodDk);
    const ch = 'rgba(255,255,255,0.85)';
    text(g, 'Data Structures', 129, -144, 9, ch);
    for (let i = 0; i < 3; i++) {
      rr(g, 92 + i * 7, -134, 7, 7, 0.5);
      inkFill(g, null, 1, ch);
    }
    circle(g, 125, -130.5, 3);
    inkFill(g, null, 1, ch);
    ln(g, 128, -130.5, 134, -130.5, 1, ch);
    circle(g, 137, -130.5, 3);
    inkFill(g, null, 1, ch);
    ln(g, 156, -134, 151, -128, 1, ch);
    ln(g, 156, -134, 161, -128, 1, ch);
    [[156, -135], [151, -127], [161, -127]].forEach((p) => {
      circle(g, p[0], p[1], 2.2);
      g.fillStyle = '#3b4a42';
      g.fill();
      inkFill(g, null, 1, ch);
    });
    if (log) {
      g.save();
      g.beginPath();
      g.rect(88, -120, 82 * k, 26);
      g.clip();
      text(g, log, 94, -104, 10, C.butterHi, 'left');
      g.restore();
    }
    ytBadge(g, 160, -96);
  }
  SC['p:data structures in JS'] = {
    dur: 5.6,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = 10;
      const HB = (c) => [c[0] - 13, c[1] + 1];
      const HOLDC = (t) => [32, -76 - Math.max(0, Math.sin(t * 3.2)) * 7];
      const pose4 = (c, lean) => P({ hF: lp(HB(c), x, 0), hB: lp([c[0] - 14, c[1] + 6], x, 0), head: [6 + lean * 4, -115 - lean * 2], chest: [2 - lean * 2, -90] });
      const top = [DS.tx, -63];
      let blk = null, onStack = false, wob = 0, log = 'pop() → 4', logK = 1, pose;
      const arc = (k, a, b) => arcPt(a, b, 26, k);
      if (T < 0) {
        blk = HOLDC(S.t);
        pose = breathe(pose4(blk, 0), S.t, 0.5);
      } else if (T < 1.5) {
        const k = E.io(seg(T, 0.2, 1.2));
        blk = k < 1 ? arc(k, HOLDC(S.t), [DS.tx, -86]) : [DS.tx, lerp(-86, -63, E.in(seg(T, 1.2, 1.5)))];
        pose = pose4(blk, Math.sin(Math.PI * k));
        logK = 1 - seg(T, 0, 0.3);
      } else if (T < 3.0) {
        onStack = true;
        wob = Math.sin((T - 1.5) * 22) * Math.exp(-(T - 1.5) * 5) * 0.05;
        log = 'push(4)';
        logK = seg(T, 1.5, 2.0);
        const rel = E.soft(seg(T, 1.55, 1.95)) * (1 - E.soft(seg(T, 2.55, 2.95)));
        pose = mix(pose4(top, 0), breathe(P({ hF: [16, -60], hB: [-4, -54], head: [9, -114] }), S.t), rel);
      } else {
        const k = E.io(seg(T, 3.0, 3.9));
        blk = k <= 0 ? top : arc(k, top, HOLDC(S.t));
        if (T > 3.0 && T < 3.4) {
          wob = Math.sin((T - 3.0) * 22) * Math.exp(-(T - 3.0) * 6) * 0.03;
        }
        log = 'pop() → 4';
        logK = seg(T, 3.15, 3.7);
        pose = breathe(pose4(blk, Math.sin(Math.PI * k) * 0.6), S.t, 0.5);
      }
      dsBoard(g, log, logK);
      g.save();
      g.translate(DS.tx, 0);
      g.rotate(wob);
      for (let i = 1; i <= 3; i++) {
        dsBlock(g, 0, -9 - (i - 1) * 18, i, (hash(i * 4.1) - 0.5) * 0.04);
      }
      if (onStack) {
        dsBlock(g, 0, -63, 4, 0.01);
      }
      g.restore();
      text(g, 'stack', DS.tx, 14, 9, C.muted);
      fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => {
          if (blk) {
            inWorld(gg, J, () => dsBlock(gg, blk[0], blk[1], 4, 0));
          }
        },
      });
      if (T >= 0) {
        sparks(g, DS.tx, -74, seg(T, 1.5, 2.1), 16, 5, C.amber);
        if (T > 3.9) {
          badge(g, 162, -114, E.back(seg(T, 3.9, 4.2)) * (1 - E.soft(seg(T, 5.1, 5.5))));
        }
      }
    },
  };

  // ---------- pages-blog-action: drop a markdown post in, the blog rebuilds ----------
  const PB = {
    posts: [['Art of getting better', 'May 25'], ['Yellow fade in CSS', 'Apr 12'], ['Links in JavaScript', 'Mar 03'], ['Blog on GitHub Pages', 'Jun 01'], ['Writing every week', 'Jul 19']],
    rows: [-108, -90, -72],
  };
  function pbMd(g, cx, cy, rot) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot || 0);
    rr(g, -15, -19, 30, 38, 2);
    inkFill(g, C.paper, 1.3);
    text(g, '---', -11, -9, 9, C.muted, 'left');
    text(g, '#', -11, 4, 11, C.amber, 'left');
    ln(g, -4, 1, 9, 1, 1.8, '#9a9a9a');
    ln(g, -11, 9, 10, 9, 1.4, C.faint);
    ln(g, -11, 14, 6, 14, 1.4, C.faint);
    g.restore();
  }
  function pbBolt(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    poly(g, [[2, -8], [-5, 1], [0, 1], [-2, 8], [5, -1], [0, -1]], true);
    inkFill(g, C.butterHi, 1.1, C.umber);
    g.restore();
  }
  SC['p:pages-blog-action'] = {
    dur: 6.0,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const n = S.n, L = PB.posts.length;
      const WRITE = (t) => P({ hB: [18, -80], hF: [24 + Math.sin(t * 9) * 3, -82 + Math.sin(t * 13) * 1.5], head: [8, -112] });
      const BEND = (xx) => P({ hip: [-3, -57], chest: [11, -82], head: [20, -103], hB: lp([-44, -42], xx, 0), hF: [14, -44], ef: 0.4, fF: [14, -2.5], fB: [-12, -2.5] });
      let x = -112, pose, sheet = 'hand', sheetFall = -1, slide = 0, bolt = -1, sheetA = 1;
      if (T < 0) {
        pose = breathe(WRITE(S.t), S.t, 0.6);
      } else if (T < 0.6) {
        const w = walkSeg(T, 0, 0.6, -112, -84);
        x = w.x;
        pose = legs(WRITE(0), w.ph, w.amp, { stride: w.stride });
      } else if (T < 1.4) {
        x = -84;
        pose = mix(mix(WRITE(0), BEND(x), E.soft(seg(T, 0.6, 0.95))), breathe(P({ hF: [8, -58], hB: [-4, -54], head: [9, -116] }), S.t), E.soft(seg(T, 1.05, 1.4)));
        if (T > 1.0) {
          sheet = null;
          sheetFall = seg(T, 1.0, 1.25);
        }
      } else if (T < 3.3) {
        x = -84;
        sheet = null;
        const proud = E.soft(seg(T, 2.0, 2.4)) * (1 - E.soft(seg(T, 2.9, 3.3)));
        pose = mix(breathe(P({ hF: [8, -58], hB: [-4, -54], head: [9, -116] }), S.t), P({ hF: [8, -56], hB: [20, -122], head: [10, -118] }), proud);
      } else if (T < 4.0) {
        const w = walkSeg(T, 3.3, 4.0, -84, -112);
        x = w.x;
        sheet = null;
        pose = legs(P({ hF: [8, -58], hB: [-4, -54], head: [6, -116] }), -w.ph, w.amp, { stride: w.stride });
      } else {
        sheetA = E.soft(seg(T, 4.0, 4.5));
        pose = mix(P({ hF: [8, -58], hB: [-4, -54], head: [6, -116] }), breathe(WRITE(S.t), S.t, 0.6), E.soft(seg(T, 4.0, 4.6)));
      }
      if (T >= 1.25 && T < 1.8) {
        bolt = seg(T, 1.25, 1.55);
      }
      if (T >= 1.5) {
        slide = E.io(seg(T, 1.5, 2.1));
      }
      stand(g, 24, 154, -50);
      win(g, 4, -160, 170, 110);
      pbBolt(g, 164, -154, 0.6);
      text(g, 'my blog', 14, -132, 11, C.ink, 'left');
      text(g, 'about', 164, -132, 9, C.muted, 'right');
      ln(g, 14, -125, 164, -125, 1, C.line);
      g.save();
      rr(g, 5, -124, 168, 72, 4);
      g.clip();
      const idx = (k) => ((n + (slide > 0 ? 1 : 0) - k) % L + L) % L;
      for (let k = 0; k < 4; k++) {
        const y = PB.rows[0] + (k - (slide > 0 ? 1 : 0)) * 18 + slide * 18;
        const a = k === 0 && slide > 0 ? slide : y > -60 ? 1 - seg(y, -66, -56) : 1;
        if (a <= 0.01 || y > -50) {
          continue;
        }
        const p = PB.posts[idx(k)];
        g.save();
        g.globalAlpha *= a;
        if (k === 0 && slide > 0 && T < 3.6) {
          rr(g, 10, y - 11, 158, 15, 3);
          g.fillStyle = C.butterSoft;
          g.fill();
        }
        text(g, p[0], 14, y, 9, '#3d3d3d', 'left');
        text(g, p[1], 164, y, 9, C.muted, 'right');
        g.restore();
      }
      g.restore();
      rr(g, -66, -32, 40, 32, 2);
      inkFill(g, C.wood, 1.5);
      if (sheetFall >= 0 && sheetFall < 1) {
        g.save();
        g.beginPath();
        g.rect(-80, -200, 80, 168);
        g.clip();
        pbMd(g, -46, lerp(-48, -14, E.in(sheetFall)), 0.1);
        g.restore();
      }
      for (let i = 0; i < 3; i++) {
        rr(g, -60 + i * 9, -38 + i, 12, 8, 1);
        inkFill(g, C.paper, 1);
      }
      rr(g, -66, -32, 40, 32, 2);
      inkFill(g, C.wood, 1.5);
      text(g, 'posts/', -46, -12, 9, C.umber);
      if (bolt >= 0) {
        const pts = [[-40, -40], [-30, -66], [-20, -58], [-10, -88], [-2, -80], [6, -104]];
        g.save();
        g.globalAlpha *= 1 - seg(T, 1.6, 1.8);
        R.strokePath(g, partial(pts, E.out(bolt)), 4.5, C.butterHi);
        R.strokePath(g, partial(pts, E.out(bolt)), 1.4, C.umber);
        g.restore();
        pbBolt(g, -40, -44, 0.9 + Math.sin(T * 30) * 0.1);
      }
      fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (hf, hb) => {
          if (sheet) {
            gg.save();
            gg.globalAlpha *= sheetA;
            const tgt = T >= 0.6 && T < 1.0 ? E.soft(seg(T, 0.6, 0.95)) : 0;
            pbMd(gg, hb[0] + lerp(6, -2, tgt), hb[1] - lerp(4, 6, tgt), lerp(-0.1, 0.1, tgt));
            gg.restore();
          }
          if (T < 0.6 || T > 4.3) {
            ln(gg, hf[0], hf[1], hf[0] - 5, hf[1] + 6, 2.2, C.amber);
          }
        }),
      });
      if (T >= 0) {
        sparks(g, 150, -116, seg(T, 2.0, 2.7), 12, 5, C.amber);
      }
    },
  };

  // ---------- markdown-it-class: label-gun classes onto tags, they restyle ----------
  const MC = { rows: [{ y: -132, tag: '<h1>', cls: 'text-2xl' }, { y: -104, tag: '<p>', cls: 'text-md' }, { y: -80, tag: '<p>', cls: 'text-md' }] };
  function mcGun(g, x, y, ang, kick) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.translate(-kick * 3, 0);
    rr(g, -3, -2, 6, 12, 2);
    inkFill(g, C.muted, 1.2);
    rr(g, -9, -10, 26, 10, 3);
    inkFill(g, C.butter, 1.3);
    rr(g, 17, -7, 5, 4, 1);
    inkFill(g, C.steel, 1);
    circle(g, -4, -12, 5);
    inkFill(g, C.paper, 1.2);
    circle(g, -4, -12, 1.6);
    inkFill(g, C.faint, 0.8);
    g.restore();
  }
  function mcTag(g, x, y, rot, label, a) {
    g.save();
    g.globalAlpha *= a ?? 1;
    g.translate(x, y);
    g.rotate(rot);
    ln(g, 0, 0, 6, 0, 1, C.muted);
    poly(g, [[6, 0], [11, -7], [52, -7], [52, 7], [11, 7]], true);
    inkFill(g, C.butterSoft, 1.2, C.amber);
    circle(g, 11, 0, 1.3);
    inkFill(g, C.paper, 0.8);
    text(g, label, 32, 3.3, 9, C.umber);
    g.restore();
  }
  SC['p:markdown-it-class'] = {
    dur: 5.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -122;
      const sh = [x, -79];
      const aimAt = (pt) => {
        const dx = pt[0] - sh[0], dy = pt[1] - sh[1], d = Math.hypot(dx, dy);
        return { hand: [sh[0] + (dx / d) * 30, sh[1] + (dy / d) * 30], ang: Math.atan2(dy, dx) };
      };
      const LOW = { hand: [x + 16, -56 + Math.sin(S.t * 1.4) * 1.5], ang: 0.35 };
      const tgt = [[34, MC.rows[0].y - 4], [34, MC.rows[1].y - 4]];
      let aim = LOW, kick = 0, shots = [], stuck = [T < 0 ? 0 : -1, -1, -1], h1K = 0, pK = 0, fall = 0;
      const blendAim = (a, b, k) => ({ hand: L2(a.hand, b.hand, k), ang: lerp(a.ang, b.ang, k) });
      if (T >= 0) {
        const A0 = aimAt(tgt[0]), A1 = aimAt(tgt[1]);
        if (T < 1.4) {
          aim = blendAim(LOW, A0, E.soft(seg(T, 0, 0.4)));
        } else if (T < 2.7) {
          aim = blendAim(A0, A1, E.soft(seg(T, 1.4, 1.7)));
        } else {
          aim = blendAim(A1, LOW, E.soft(seg(T, 2.7, 3.2)));
        }
        kick = Math.max(pulse(T, 99, 0.45, 0.25, 0.3), pulse(T, 99, 1.75, 0.25, 0.3));
        if (T >= 0.45 && T < 0.85) {
          shots.push({ i: 0, k: E.out(seg(T, 0.45, 0.85)) });
        }
        if (T >= 1.75 && T < 2.15) {
          shots.push({ i: 1, k: E.out(seg(T, 1.75, 2.15)) });
        }
        stuck = [T >= 0.85 ? T - 0.85 : -1, T >= 2.15 ? T - 2.15 : -1, T >= 2.35 ? T - 2.35 : -1];
        h1K = E.soft(seg(T, 0.9, 1.3));
        pK = E.soft(seg(T, 2.2, 2.6));
        fall = seg(T, 4.8, 5.5);
        h1K *= 1 - E.soft(fall);
        pK *= 1 - E.soft(fall);
      } else {
        stuck = [-1, -1, -1];
      }
      stand(g, 10, 150, -48);
      rr(g, -10, -158, 180, 110, 4);
      inkFill(g, C.paper, 1.6);
      text(g, 'md.render(post)', -2, -146, 9, C.muted, 'left');
      ln(g, -10, -141, 170, -141, 1, C.line);
      MC.rows.forEach((r, i) => {
        rr(g, -2, r.y - 11, 30, 14, 4);
        inkFill(g, '#ede9fe', 1.1);
        text(g, r.tag, 13, r.y - 1, 9, '#5b4b8a');
        if (i === 0) {
          const s = lerp(9, 17, h1K);
          text(g, 'Hello', 92, r.y + h1K * 3, s, h1K > 0.5 ? '#2f5d8a' : C.ink, 'left');
          if (h1K > 0.5) {
            text(g, 'Hello', 92.6, r.y + h1K * 3, s, '#2f5d8a', 'left');
          }
        } else {
          text(g, i === 1 ? 'Some text' : 'More text', 92, r.y - 1 + pK * 2, lerp(9, 10.5, pK), pK > 0.5 ? '#4a4a4a' : C.ink, 'left');
          words(g, 92, r.y + 8 + pK * 4, i === 1 ? 70 : 54, i * 5, pK > 0.5 ? '#bdbdbd' : C.faint, 1.6);
        }
      });
      MC.rows.forEach((r, i) => {
        const t = stuck[i];
        if (t < 0) {
          return;
        }
        const sw = Math.sin(t * 9) * Math.exp(-t * 2.5) * 0.35 + Math.sin(S.t * 1.6 + i) * 0.03;
        const fy = fall > 0 ? fall * fall * 60 : 0;
        const pp = i === 2 ? E.back(seg(t, 0, 0.3)) : 1;
        g.save();
        g.translate(28, r.y - 4 + fy);
        g.scale(pp, pp);
        mcTag(g, 0, 0, sw + fall * 1.2 * (i % 2 ? 1 : -1) + 0.08, r.cls, 1 - fall);
        g.restore();
      });
      const pose = breathe(P({ hF: lp(aim.hand, x, 0), hB: [-4, -53], head: [7 + Math.cos(aim.ang) * 2, -115 + Math.sin(aim.ang) * 3], chest: [2, -90] }), S.t, 0.6);
      fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (h) => mcGun(gg, h[0], h[1], aim.ang, kick)),
      });
      shots.forEach((s) => {
        const from = [aim.hand[0] + Math.cos(aim.ang) * 20, aim.hand[1] + Math.sin(aim.ang) * 20];
        const p = L2(from, tgt[s.i], s.k);
        g.save();
        g.translate(p[0], p[1]);
        g.rotate(s.k * 6);
        rr(g, -12, -4, 24, 8, 2);
        inkFill(g, C.butterSoft, 1.1, C.amber);
        g.restore();
      });
      if (T >= 0) {
        sparks(g, 112, -146, seg(T, 0.95, 1.6), 14, 5, C.amber);
        sparks(g, 112, -118, seg(T, 2.3, 2.9), 12, 5, C.amber);
      }
    },
  };

  // ---------- mongo-playground: one command grows a MongoDB full of sample data ----------
  const MG = { cards: [{ name: 'books', at: 0.35, side: -1, y: -62 }, { name: 'airbnb', at: 0.62, side: 1, y: -88 }, { name: 'students', at: 0.85, side: -1, y: -112 }] };
  function mgLeaf(g, x, y0, h, sw) {
    if (h < 2) {
      return;
    }
    const top = [x + sw, y0 - h];
    g.beginPath();
    g.moveTo(x, y0);
    g.quadraticCurveTo(x - h * 0.34, y0 - h * 0.45, top[0], top[1]);
    g.quadraticCurveTo(x + h * 0.34, y0 - h * 0.45, x, y0);
    g.closePath();
    inkFill(g, C.green, 1.4, C.greenInk);
    ln(g, x, y0 + 3, x + sw * 0.6, y0 - h * 0.82, 1.4, C.greenInk);
  }
  SC['p:mongo-playground'] = {
    dur: 5.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -130;
      const CMD = ['$ docker', 'compose up'];
      const KEY = (t, k) => P({ hF: lp([-96 + Math.sin(t * 23) * 2 * k, -61 - Math.max(0, Math.sin(t * 23)) * 3 * k], x, 0), hB: lp([-104 + Math.sin(t * 19 + 1) * 2 * k, -60 - Math.max(0, Math.sin(t * 19 + 1)) * 3 * k], x, 0), head: [8, -112], chest: [3, -89] });
      let pose, typed = 0, grow = 0, pulseK = -1, cards = 0, enter = 0;
      if (T < 0) {
        const busy = pulse(S.t, 5, 1.5, 1.6);
        pose = breathe(mix(P({ hF: [12, -60], hB: [-3, -53], head: [9, -114] }), KEY(S.t, 1), busy), S.t, 0.6);
      } else {
        typed = seg(T, 0.15, 1.0);
        enter = E.in(seg(T, 1.05, 1.22)) * (1 - E.soft(seg(T, 1.3, 1.6)));
        pulseK = T >= 1.22 && T < 1.9 ? seg(T, 1.22, 1.9) : -1;
        const sink = E.io(seg(T, 5.1, 5.7));
        grow = E.out3(seg(T, 1.85, 2.8)) * (1 - sink);
        cards = seg(T, 2.2, 3.6) * (1 - sink);
        const hit = P({ hF: lp([-94, lerp(-80, -61, enter)], x, 0), hB: [-3, -53], head: [9, -113], chest: [4, -89] });
        const admire = P({ hF: [10, -58], hB: [-3, -53], head: [11, -117] });
        if (T < 1.0) {
          pose = mix(P({ hF: [12, -60], hB: [-3, -53], head: [9, -114] }), KEY(T, 1), E.soft(seg(T, 0, 0.2)));
        } else if (T < 1.7) {
          pose = mix(KEY(T, 0), hit, E.soft(seg(T, 1.0, 1.16)));
        } else {
          const cheer = E.soft(seg(T, 3.45, 3.8)) * (1 - E.soft(seg(T, 4.3, 4.6)));
          pose = breathe(mix(mix(hit, admire, E.soft(seg(T, 1.7, 2.1))), P({ hF: [14, -132], hB: [-3, -53], head: [11, -119] }), cheer), S.t, 0.6);
        }
        if (T > 5.0) {
          typed = 1 - seg(T, 5.2, 5.6);
        }
      }
      stand(g, -104, -50, -58, 2);
      rr(g, -112, -60, 70, 5, 2);
      inkFill(g, C.wood, 1.4);
      rr(g, -104, -106, 60, 42, 3);
      inkFill(g, '#2b2b2b', 1.4);
      rr(g, -108, -66, 66, 5, 2);
      inkFill(g, C.steel, 1.3);
      const shown = T < 0 ? 0 : typed * (CMD[0].length + CMD[1].length);
      const l0 = CMD[0].slice(0, Math.min(CMD[0].length, Math.floor(shown)));
      const l1 = CMD[1].slice(0, Math.max(0, Math.floor(shown) - CMD[0].length));
      text(g, l0 || '$', -97, -92, 9, C.butterHi, 'left');
      text(g, l1, -97, -80, 9, '#e5e5e5', 'left');
      if (Math.sin(S.t * 8) > 0 && shown < 1) {
        ln(g, -88, -96, -88, -89, 1.4, '#e5e5e5');
      }
      if (enter > 0.5) {
        rr(g, -100, -70, 10, 3, 1);
        g.fillStyle = C.butterHi;
        g.fill();
      }
      const cable = [[-42, -61], [-38, -61], [-38, -4], [26, -4]];
      R.strokePath(g, cable, 1.6, C.muted);
      if (pulseK >= 0) {
        const p = R.tip(partial(cable, pulseK));
        circle(g, p[0], p[1], 3.4);
        inkFill(g, C.butterHi, 1, C.umber);
      }
      const px = 50;
      const sw = Math.sin(S.t * 1.5) * 3;
      const H = lerp(14, 104, grow);
      MG.cards.forEach((c) => {
        const k = E.back(seg(cards, c.at - 0.3, c.at));
        if (k <= 0.01) {
          return;
        }
        const by = c.y, bx = px + c.side * 46 + sw * 0.6;
        const ax = px + sw * clamp((-28 - by) / H, 0, 1) * 0.6;
        R.strokePath(g, [[ax, by + 10], [lerp(ax, bx, 0.5), by + 4], [bx - c.side * 26, by]], 1.4, C.greenInk);
        g.save();
        g.translate(bx, by);
        g.scale(k, k);
        g.rotate(Math.sin(S.t * 1.8 + c.at * 9) * 0.05);
        rr(g, -29, -8, 58, 16, 4);
        inkFill(g, c.side < 0 ? '#bfdbfe' : '#fed7aa', 1.2);
        text(g, '{ ' + c.name + ' }', 0, 3.3, 9, '#3d3d3d');
        g.restore();
      });
      if (grow < 0.15) {
        const s = 1 - grow / 0.15;
        g.save();
        g.translate(px, -28);
        g.scale(s, s);
        ln(g, 0, 0, 0, -10, 1.6, C.greenInk);
        g.beginPath();
        g.ellipse(-5, -11, 5, 2.5, -0.4, 0, TAU);
        inkFill(g, C.green, 1.1, C.greenInk);
        g.beginPath();
        g.ellipse(5, -12, 5, 2.5, 0.4, 0, TAU);
        inkFill(g, C.green, 1.1, C.greenInk);
        g.restore();
      }
      mgLeaf(g, px, -28, H * Math.min(1, grow / 0.15), sw);
      poly(g, [[28, -30], [72, -30], [66, 0], [34, 0]], true);
      inkFill(g, '#fed7aa', 1.5);
      rr(g, 25, -34, 50, 7, 2);
      inkFill(g, '#fed7aa', 1.4);
      text(g, 'mongo', px, -12, 9, C.umber);
      fig(g, pose, x, 0, { wave: S.wave, wt: S.wt });
      if (T >= 0) {
        sparks(g, px, -140, seg(T, 3.5, 4.3), 18, 7, C.greenInk);
      }
    },
  };

  // ---------- node basic auth: swipe user:pass, get a 401, encode it, the gate lifts ----------
  function baCard(g, cx, cy, rot, enc, t) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot || 0);
    rr(g, -32, -13, 64, 26, 3);
    inkFill(g, enc > 0.5 ? C.butterSoft : C.paper, 1.3);
    if (enc > 0 && enc < 1) {
      const ch = 'abcdefghXYZ0123456789=+';
      let s = '';
      for (let i = 0; i < 8; i++) {
        s += ch[Math.floor(hash(i * 7.3 + Math.floor(t * 20)) * ch.length)];
      }
      text(g, s, 0, 3.5, 9, C.amber);
    } else if (enc >= 1) {
      text(g, 'Basic', 0, -2, 9, C.umber);
      text(g, 'dXNlcjpw', 0, 8.5, 9, C.amber);
    } else {
      text(g, 'user:pass', 0, 3.5, 9, '#3d3d3d');
    }
    g.restore();
  }
  SC['p:node basic auth'] = {
    dur: 6.4,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const HOLD = P({ hF: [16, -62], hB: [-4, -53], head: [6, -115] });
      const SWIPE = (k, xx) => P({ hF: lp([-26, lerp(-80, -62, k)], xx, 0), hB: [-4, -53], head: [9, -114], chest: [3, -90] });
      const LOOK = P({ hF: [14, -58], hB: [-4, -53], head: [11, -110] });
      let x = -104, pose, enc = 0, status = 0, lift = 0, alpha = 1, buzz = 0;
      if (T < 0) {
        pose = breathe(HOLD, S.t);
        pose.head = [6 + pulse(S.t, 6, 3, 1.6) * 4, -115];
      } else {
        enc = T < 1.4 ? 0 : T < 1.9 ? seg(T, 1.4, 1.9) * 0.99 : 1;
        status = T < 1.0 ? 0 : T < 2.3 ? -1 : 1;
        buzz = T >= 1.0 && T < 1.4 ? Math.sin(T * 70) * 1.2 * (1 - seg(T, 1.0, 1.4)) : 0;
        lift = E.back(seg(T, 2.45, 2.95)) * (1 - E.soft(seg(T, 4.7, 5.1)));
        const cheer = mix(HOLD, P({ hF: [34, -92], hB: [-4, -53], head: [8, -118] }), E.soft(seg(T, 2.5, 2.75)) * (1 - E.soft(seg(T, 2.85, 3.15))));
        if (T < 0.75) {
          const w = walkSeg(T, 0, 0.75, -104, -58);
          x = w.x;
          pose = legs(HOLD, w.ph, w.amp, { stride: w.stride });
        } else if (T < 1.4) {
          x = -58;
          pose = mix(HOLD, SWIPE(E.soft(seg(T, 0.85, 1.05)), x), E.soft(seg(T, 0.75, 0.9)) * (1 - E.soft(seg(T, 1.15, 1.4))));
        } else if (T < 2.0) {
          x = -58;
          pose = breathe(mix(HOLD, LOOK, E.soft(seg(T, 1.4, 1.62)) * (1 - E.soft(seg(T, 1.8, 2.0)))), S.t);
        } else if (T < 2.5) {
          x = -58;
          pose = mix(HOLD, SWIPE(E.soft(seg(T, 2.1, 2.3)), x), E.soft(seg(T, 2.0, 2.1)) * (1 - E.soft(seg(T, 2.35, 2.5))));
        } else if (T < 3.0) {
          x = -58;
          pose = cheer;
        } else if (T < 4.6) {
          const w = walkSeg(T, 3.0, 4.6, -58, 148);
          x = w.x;
          pose = legs(cheer, w.ph, w.amp, { stride: w.stride });
          alpha = 1 - seg(x, 128, 148);
        } else {
          pose = breathe(HOLD, S.t);
          enc = 0;
          status = 0;
          alpha = E.soft(seg(T, 5.4, 6.0));
        }
      }
      rr(g, 128, -104, 42, 104, 3);
      inkFill(g, '#f4f4f2', 1.6);
      const door = T >= 3.6 && T < 5.0 ? E.soft(seg(T, 3.6, 3.9)) * (1 - E.soft(seg(T, 4.6, 5.0))) : 0;
      rr(g, 136, -82, 26, 82, 2);
      inkFill(g, door > 0.05 ? C.butterSoft : C.paper, 1.4);
      if (door > 0.05) {
        g.save();
        g.translate(136, 0);
        g.scale(1 - door * 0.8, 1);
        rr(g, 0, -82, 26, 82, 2);
        inkFill(g, C.wood, 1.4);
        g.restore();
      } else {
        circle(g, 157, -40, 1.8);
        inkFill(g, C.ink, 1);
      }
      rr(g, 132, -100, 34, 13, 3);
      inkFill(g, C.paper, 1.1);
      text(g, '/admin', 149, -90.4, 9, '#3d3d3d');
      ln(g, -12, -60, -12, 0, 3.4);
      g.save();
      g.translate(buzz, 0);
      rr(g, -30, -88, 36, 30, 4);
      inkFill(g, C.steel, 1.5);
      rr(g, -26, -84, 28, 14, 2);
      inkFill(g, status < 0 ? C.red : status > 0 ? C.green : '#2b2b2b', 1.2);
      if (status !== 0) {
        text(g, status < 0 ? '401' : '200', -12, -73.5, 10, status < 0 ? C.redInk : C.greenInk);
      } else if (Math.sin(S.t * 5) > 0) {
        circle(g, -12, -77, 1.6);
        g.fillStyle = C.butterHi;
        g.fill();
      }
      ln(g, -24, -63, 0, -63, 2.4, '#3a3a3a');
      g.restore();
      ytBadge(g, -12, -46);
      rr(g, 30, -52, 12, 52, 2);
      inkFill(g, C.steel, 1.4);
      g.save();
      g.translate(36, -46);
      g.rotate(-lift * 1.35);
      rr(g, 0, -3.5, 86, 7, 3.5);
      inkFill(g, C.paper, 1.4);
      for (let i = 0; i < 4; i++) {
        rr(g, 10 + i * 20, -3.5, 10, 7, 0);
        g.fillStyle = C.red;
        g.fill();
      }
      rr(g, 0, -3.5, 86, 7, 3.5);
      inkFill(g, null, 1.4);
      g.restore();
      circle(g, 36, -46, 3.4);
      inkFill(g, C.paper, 1.3);
      fig(g, pose, x, 0, {
        alpha,
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (h) => {
          gg.save();
          gg.globalAlpha *= alpha;
          baCard(gg, h[0] + 9, h[1] - 6, -0.06, enc, S.t);
          gg.restore();
        }),
      });
      if (T >= 0) {
        sparks(g, -12, -92, seg(T, 2.3, 2.9), 12, 5, C.greenInk);
      }
    },
  };

  // ---------- node session auth: log in once, get a cookie, the cookie opens the door ----------
  function saCookie(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    circle(g, 0, 0, 10);
    inkFill(g, '#e9c48f', 1.4, C.umber);
    [[-5, -4], [4, -5], [-2, 5], [6, 3]].forEach((p) => {
      circle(g, p[0], p[1], 1.4);
      g.fillStyle = C.umber;
      g.fill();
    });
    text(g, 'sid', 0, 3, 9, C.umber);
    g.restore();
  }
  function saLogin(g, cx, cy, rot) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot || 0);
    rr(g, -22, -12, 44, 24, 3);
    inkFill(g, C.paper, 1.3);
    text(g, 'kamran', 0, -1.5, 9, '#3d3d3d');
    text(g, '••••', 0, 8.5, 9, C.muted);
    g.restore();
  }
  function saCabinet(g, open, hl, fileIn) {
    const x = 128, w = 44;
    rr(g, x, -80, w, 80, 3);
    inkFill(g, '#f4f4f2', 1.5);
    text(g, 'sessions', x + w / 2, -67, 9, C.muted);
    for (let i = 0; i < 3; i++) {
      const dy = -58 + i * 19, o = i === 0 ? open * 12 : 0;
      if (o > 0.5) {
        rr(g, x + 3 - o, dy, w - 6, 16, 2);
        g.fillStyle = '#e3e0d8';
        g.fill();
        for (let k = 0; k < 3; k++) {
          ln(g, x + 10 - o + k * 6, dy - 2, x + 10 - o + k * 6, dy + 6, 1.4, '#b8b2a5');
        }
        if (fileIn > 0) {
          rr(g, x + 26 - o, dy - 12 + (1 - fileIn) * -16, 14, 12, 1);
          inkFill(g, hl ? C.butter : C.paper, 1, hl ? C.amber : C.ink);
        }
      }
      rr(g, x + 3 - o, dy, w - 6, 16, 2);
      inkFill(g, C.paper, 1.2);
      rr(g, x + w / 2 - 6 - o, dy + 9, 12, 4, 2);
      inkFill(g, C.steel, 1);
    }
  }
  SC['p:node session auth'] = {
    dur: 7.0,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const HOLD = P({ hF: [18, -72], hB: [-4, -53], head: [6, -115] });
      const HATCH = (k, xx) => P({ hF: lp([lerp(-80, -70, k), -78], xx, 0), hB: [-4, -53], head: [9, -114], chest: [3, -90] });
      const SCAN = (xx) => P({ hF: lp([56, -76], xx, 0), hB: [-4, -53], head: [9, -114], chest: [3, -90] });
      let x = -102, sx = 1, pose, item = 'card', door = 0, drawer = 0, fileIn = 0, hl = false, beam = 0, cookieOut = -1, itemA = 1;
      if (T < 0) {
        pose = breathe(HOLD, S.t);
        pose.head = [6 + pulse(S.t, 6, 2.5, 1.5) * 3, -115];
      } else {
        drawer = E.soft(seg(T, 0.6, 0.85)) * (1 - E.soft(seg(T, 1.15, 1.4))) + E.soft(seg(T, 3.2, 3.45)) * (1 - E.soft(seg(T, 4.2, 4.5)));
        fileIn = T < 1.5 ? seg(T, 0.75, 1.05) : 1;
        hl = T > 3.4 && T < 4.4;
        beam = T > 3.0 && T < 3.5 ? 1 : 0;
        door = E.soft(seg(T, 3.5, 3.85)) * (1 - E.soft(seg(T, 4.6, 5.0)));
        if (T < 0.55) {
          pose = mix(HOLD, HATCH(E.soft(seg(T, 0.25, 0.5)), x), E.soft(seg(T, 0, 0.25)));
          item = T < 0.42 ? 'card' : null;
        } else if (T < 1.6) {
          item = null;
          pose = mix(mix(HATCH(1, x), HATCH(0, x), E.soft(seg(T, 0.55, 0.8))), HOLD, E.soft(seg(T, 1.38, 1.6)));
          if (T > 1.15) {
            cookieOut = seg(T, 1.15, 1.4);
          }
          if (T > 1.4) {
            cookieOut = -1;
            item = 'cookie';
          }
        } else if (T < 2.8) {
          item = 'cookie';
          const w = walkSeg(T, 1.6, 2.8, -102, 24);
          x = w.x;
          pose = legs(HOLD, w.ph, w.amp, { stride: w.stride });
        } else if (T < 4.9) {
          x = 24;
          item = 'cookie';
          const cheer = E.soft(seg(T, 3.85, 4.2)) * (1 - E.soft(seg(T, 4.5, 4.8)));
          pose = mix(mix(HOLD, SCAN(x), E.soft(seg(T, 2.8, 3.1)) * (1 - E.soft(seg(T, 3.5, 3.8)))), P({ hF: [14, -128], hB: [-4, -53], head: [9, -119] }), cheer);
        } else if (T < 5.15) {
          x = 24;
          item = 'cookie';
          sx = turn(T, 4.9, 5.15, 1);
          pose = HOLD;
        } else if (T < 6.4) {
          const w = walkSeg(T, 5.15, 6.4, 24, -102);
          x = w.x;
          sx = -1;
          item = 'cookie';
          pose = legs(HOLD, w.ph, w.amp, { stride: w.stride });
        } else {
          sx = turn(T, 6.4, 6.65, -1);
          item = T < 6.6 ? 'cookie' : 'card';
          itemA = T < 6.6 ? 1 - seg(T, 6.4, 6.6) : seg(T, 6.6, 6.9);
          pose = HOLD;
        }
      }
      rr(g, -84, -110, 40, 110, 3);
      inkFill(g, '#f4f4f2', 1.6);
      rr(g, -80, -90, 32, 26, 2);
      inkFill(g, '#3a3a3a', 1.3);
      rr(g, -84, -126, 40, 14, 3);
      inkFill(g, C.butterSoft, 1.2);
      text(g, 'login', -64, -115.6, 9, C.umber);
      ytBadge(g, -64, -40);
      if (cookieOut >= 0) {
        saCookie(g, lerp(-66, -60, cookieOut), -77, E.back(cookieOut));
      }
      rr(g, 72, -104, 44, 104, 3);
      inkFill(g, '#f4f4f2', 1.6);
      rr(g, 78, -96, 32, 96, 2);
      inkFill(g, door > 0.05 ? C.butterSoft : C.paper, 1.4);
      if (door > 0.05) {
        g.save();
        g.translate(78, 0);
        g.scale(1 - door * 0.8, 1);
        rr(g, 0, -96, 32, 96, 2);
        inkFill(g, C.wood, 1.4);
        g.restore();
        text(g, 'hi!', 94, -64, 10, C.umber);
      } else {
        circle(g, 104, -46, 1.8);
        inkFill(g, C.ink, 1);
      }
      rr(g, 78, -120, 32, 13, 3);
      inkFill(g, C.paper, 1.1);
      text(g, '/home', 94, -110.4, 9, '#3d3d3d');
      ln(g, 60, -70, 60, 0, 2.6);
      rr(g, 52, -84, 16, 16, 3);
      inkFill(g, beam ? C.butter : C.steel, 1.3);
      circle(g, 60, -76, 3);
      inkFill(g, beam ? C.butterHi : C.faint, 1);
      saCabinet(g, drawer, hl, fileIn);
      if (beam) {
        g.save();
        g.globalAlpha *= 0.5;
        R.strokePath(g, [[68, -78], [100, -78], [128, -60]], 1.4, C.amber);
        g.restore();
      }
      fig(g, pose, x, 0, {
        sx,
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (h) => {
          gg.save();
          gg.globalAlpha *= itemA;
          if (item === 'card') {
            saLogin(gg, h[0] + 8 * sx, h[1] - 6, -0.06);
          } else if (item === 'cookie') {
            saCookie(gg, h[0] + 3 * sx, h[1] - 6, 1);
          }
          gg.restore();
        }),
      });
      if (T >= 0) {
        sparks(g, 94, -110, seg(T, 3.8, 4.5), 22, 7, C.amber);
      }
    },
  };

  // ---------- sendy: one click, the container rides the rails, newsletters fly ----------
  function sdContainer(g, x, y, a) {
    g.save();
    g.globalAlpha *= a ?? 1;
    rr(g, x - 22, y - 26, 44, 26, 2);
    inkFill(g, '#bfdbfe', 1.4);
    for (let i = 1; i < 6; i++) {
      ln(g, x - 22 + i * 7.3, y - 23, x - 22 + i * 7.3, y - 3, 1, '#93b4d8');
    }
    rr(g, x - 14, y - 19, 28, 12, 2);
    inkFill(g, C.paper, 1);
    text(g, 'sendy', x, y - 9.8, 9, '#2f5d8a');
    g.restore();
  }
  function sdCart(g, x, roll) {
    rr(g, x - 26, -20, 52, 6, 2);
    inkFill(g, C.woodDk, 1.4);
    [-15, 15].forEach((d) => {
      circle(g, x + d, -11, 5);
      inkFill(g, C.steel, 1.3);
      ln(g, x + d, -11, x + d + Math.cos(roll) * 4, -11 + Math.sin(roll) * 4, 1.2);
    });
  }
  function sdEnvelope(g, x, y, rot, s) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(s, s);
    rr(g, -9, -6, 18, 12, 1.5);
    inkFill(g, C.paper, 1.2);
    poly(g, [[-9, -6], [0, 1], [9, -6]], false);
    inkFill(g, null, 1.1);
    g.restore();
  }
  SC['p:sendy'] = {
    dur: 6.0,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -146;
      const BTN = [-116, -60];
      const HOVER = P({ hF: lp([-118, -72 + Math.sin(S.t * 2) * 1.5], x, 0), hB: [-4, -53], head: [8, -114] });
      let pose, cx = -56, press = 0, cont = 1, contX = null, lit = false, sendK = -1, newC = 1;
      if (T < 0) {
        pose = breathe(HOVER, S.t, 0.6);
        pose.head = [8 + pulse(S.t, 6, 3, 1.5) * 4, -114];
      } else {
        const up = E.soft(seg(T, 0, 0.4)), slam = E.in(seg(T, 0.4, 0.65)), off = E.soft(seg(T, 0.8, 1.2));
        press = slam * (1 - E.soft(seg(T, 0.7, 0.9)));
        const hand = [-116, lerp(lerp(-72, -104, up), -64, slam)];
        const cheer = E.back(seg(T, 3.0, 3.6)) * (1 - E.soft(seg(T, 4.0, 4.3)));
        pose = mix(P({ hF: lp(hand, x, 0), hB: [-4, -53], head: [8, -116], chest: [3 + slam * 2, -90] }), breathe(P({ hF: [10, -58], hB: [-4, -53], head: [9, -116] }), S.t, 0.6), off);
        pose = mix(pose, P({ hF: [12, -132], hB: [-6, -130], head: [8, -119] }), cheer);
        if (T >= 4.6) {
          pose = mix(pose, HOVER, E.soft(seg(T, 4.6, 5.2)));
        }
        cx = T < 4.3 ? lerp(-56, 96, E.io(seg(T, 0.7, 2.4))) : lerp(96, -56, E.io(seg(T, 4.3, 5.4)));
        if (T >= 2.4 && T < 2.9) {
          contX = lerp(96, 150, E.in(seg(T, 2.4, 2.9)));
        }
        cont = T < 2.4 ? 1 : 0;
        lit = T > 2.85;
        sendK = T >= 2.9 && T < 4.6 ? seg(T, 2.9, 4.6) : -1;
        newC = T < 5.3 ? 0 : seg(T, 5.3, 5.8);
      }
      for (let rx = -80; rx < 128; rx += 11) {
        rr(g, rx - 4, -4, 8, 4, 1);
        inkFill(g, C.woodDk, 1);
      }
      ln(g, -86, -5, 128, -5, 2.2);
      const roll = cx * 0.2;
      sdCart(g, cx, roll);
      if (cont > 0) {
        sdContainer(g, cx, -20);
      }
      if (newC > 0) {
        sdContainer(g, cx, -20 - (1 - E.out(newC)) * 60, newC);
      }
      if (contX !== null) {
        sdContainer(g, contX, -20);
      }
      rr(g, 128, -112, 46, 112, 3);
      inkFill(g, '#f4f4f2', 1.6);
      rr(g, 134, -104, 34, 14, 3);
      inkFill(g, lit ? C.butter : C.paper, 1.2);
      text(g, 'sendy', 151, -93.6, 9, C.umber);
      for (let i = 0; i < 3; i++) {
        rr(g, 134, -82 + i * 12, 34, 8, 2);
        inkFill(g, C.paper, 1);
        circle(g, 163, -78 + i * 12, 1.6);
        g.fillStyle = lit && Math.sin(S.t * 9 + i * 2) > -0.2 ? '#7aa874' : C.faint;
        g.fill();
      }
      rr(g, 132, -36, 38, 36, 2);
      inkFill(g, '#e9e9e7', 1.3);
      if (sendK >= 0) {
        for (let i = 0; i < 6; i++) {
          const k = seg(sendK, i * 0.1, i * 0.1 + 0.5);
          if (k <= 0 || k >= 1) {
            continue;
          }
          const a = -2.0 - i * 0.22;
          const p = [151 + Math.cos(a) * 130 * k, -112 + Math.sin(a) * 60 * k - Math.sin(Math.PI * k) * 30];
          g.save();
          g.globalAlpha *= 1 - seg(k, 0.7, 1);
          sdEnvelope(g, p[0], p[1], Math.sin(k * 7 + i) * 0.4, lerp(0.6, 1.1, k));
          g.restore();
        }
      }
      ln(g, -116, -48, -116, 0, 4);
      rr(g, -136, -50, 40, 14, 3);
      inkFill(g, '#ede9fe', 1.4);
      text(g, 'Railway', -116, -40, 9, '#5b4b8a');
      g.beginPath();
      g.ellipse(BTN[0], -51 + press * 3, 11, 9 - press * 4, 0, Math.PI, 0);
      g.closePath();
      inkFill(g, C.red, 1.4, C.redInk);
      if (T >= 0) {
        sparks(g, BTN[0], -62, seg(T, 0.62, 1.1), 12, 5, C.amber);
      }
      fig(g, pose, x, 0, { wave: S.wave, wt: S.wt });
    },
  };

  // ---------- aws-cost-cli: run aws-cost, the bill prints, toss it into Slack ----------
  const AW = { rows: [['EC2', '$412'], ['S3', '$38'], ['RDS', '$96'], ['Total', '$546']] };
  function awBill(g, cx, cy, rot, s) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot || 0);
    g.scale(s, s);
    const w = 52, h = 50;
    poly(g, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], ...Array.from({ length: 9 }, (_, i) => [w / 2 - (i + 1) * (w / 9), h / 2 + (i % 2 ? 0 : 3)])], true);
    inkFill(g, C.paper, 1.3);
    AW.rows.forEach((r, i) => {
      const last = i === 3;
      text(g, r[0], -w / 2 + 5, -h / 2 + 12 + i * 10.5, 9, last ? C.umber : '#3d3d3d', 'left');
      text(g, r[1], w / 2 - 5, -h / 2 + 12 + i * 10.5, 9, last ? C.umber : '#3d3d3d', 'right');
    });
    ln(g, -w / 2 + 4, h / 2 - 15, w / 2 - 4, h / 2 - 15, 1, C.faint);
    g.restore();
  }
  function awMsg(g, y, a, full, react) {
    if (a <= 0.01) {
      return;
    }
    g.save();
    g.globalAlpha *= a;
    rr(g, 72, y, 12, 12, 3);
    inkFill(g, C.butter, 1.1);
    text(g, 'aws-cost', 89, y + 9, 9, C.ink, 'left');
    rr(g, 89, y + 14, 72, 30, 3);
    inkFill(g, '#fafafa', 1.1, C.faint);
    [[30, '#bfdbfe'], [6, '#bbf7d0'], [12, '#fed7aa']].forEach((b, i) => {
      rr(g, 93, y + 18 + i * 6, b[0] * full, 4, 1);
      g.fillStyle = b[1];
      g.fill();
    });
    text(g, '$546', 157, y + 40, 9, C.umber, 'right');
    if (react > 0.01) {
      g.save();
      g.translate(104, y + 52);
      g.scale(react, react);
      rr(g, -15, -6, 30, 12, 6);
      inkFill(g, C.green, 1, C.greenInk);
      tick(g, -6, 0, 0.5, 1);
      text(g, '3', 6, 3.3, 9, C.greenInk);
      g.restore();
    }
    g.restore();
  }
  SC['p:aws-cost-cli'] = {
    dur: 6.4,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -22;
      const TYPE = (t, k) => P({ hF: lp([-50 + Math.sin(t * 23) * 2 * k, -56 - Math.max(0, Math.sin(t * 23)) * 3 * k], x, 0, -1), hB: lp([-58 + Math.sin(t * 19) * 2 * k, -55 - Math.max(0, Math.sin(t * 19 + 1)) * 3 * k], x, 0, -1), head: [8, -113], chest: [3, -89] });
      const CATCH = P({ hF: lp([-62, -98], x, 0, -1), hB: [-4, -53], head: [9, -116], chest: [3, -90] });
      const HOLDB = P({ hF: [20, -72], hB: [-4, -53], head: [7, -115] });
      const WIND = P({ hF: [-26, -56], hB: [12, -60], head: [3, -116], chest: [-3, -90], ef: 0 });
      const THROW = P({ hF: [36, -100], hB: [-6, -56], head: [12, -114], chest: [6, -89] });
      let sx = -1, pose, typed = 0, rows = 0, bill = null, fly = -1, msg = 0, react = 0, oldUp = 0, clear = 0;
      if (T < 0) {
        pose = breathe(mix(P({ hF: lp([-48, -58], x, 0, -1), hB: lp([-58, -56], x, 0, -1), head: [7, -114] }), TYPE(S.t, 1), pulse(S.t, 5, 2, 1.2)), S.t, 0.6);
        msg = 1;
        react = 1;
      } else {
        typed = seg(T, 0.1, 0.8);
        rows = seg(T, 0.95, 1.6);
        clear = seg(T, 4.9, 5.3);
        if (T < 1.0) {
          pose = TYPE(T, 1);
        } else if (T < 2.3) {
          pose = mix(TYPE(T, 0), CATCH, E.soft(seg(T, 1.6, 1.95)));
          if (T > 1.7) {
            const k = E.io(seg(T, 1.7, 2.15));
            bill = { p: L2([-96, -96], [-70, -104], k), s: lerp(0.9, 1, k), rot: lerp(0, -0.1, k) };
          }
          if (T > 2.15) {
            bill = 'hand';
          }
        } else if (T < 2.75) {
          sx = turn(T, 2.3, 2.75, -1);
          pose = mix(CATCH, HOLDB, E.soft(seg(T, 2.3, 2.6)));
          bill = 'hand';
        } else if (T < 3.25) {
          sx = 1;
          pose = seq(T, [[2.75, HOLDB], [2.98, WIND], [3.18, THROW, E.sm], [3.25, THROW]]);
          bill = T < 3.16 ? 'hand' : null;
          if (T >= 3.16) {
            fly = 0;
          }
        } else if (T < 4.6) {
          sx = 1;
          pose = mix(THROW, breathe(P({ hF: [10, -58], hB: [-4, -53], head: [9, -116] }), S.t, 0.6), E.soft(seg(T, 3.3, 3.8)));
        } else if (T < 4.9) {
          sx = turn(T, 4.6, 4.9, 1);
          pose = P({ hF: [10, -58], hB: [-4, -53], head: [9, -116] });
        } else {
          pose = mix(P({ hF: [10, -58], hB: [-4, -53], head: [9, -116] }), breathe(P({ hF: lp([-48, -58], x, 0, -1), hB: lp([-58, -56], x, 0, -1), head: [7, -114] }), S.t, 0.6), E.soft(seg(T, 4.9, 5.4)));
        }
        if (T >= 3.16 && T < 3.75) {
          fly = E.out(seg(T, 3.16, 3.72));
        }
        msg = T >= 3.7 ? E.back(seg(T, 3.7, 4.0)) : 0;
        oldUp = T >= 3.7 ? E.io(seg(T, 3.6, 4.0)) : 0;
        react = T >= 3.7 ? E.back(seg(T, 4.2, 4.45)) : 0;
      }
      stand(g, -144, -40, -48, 4);
      rr(g, -150, -52, 116, 5, 2);
      inkFill(g, C.wood, 1.4);
      ln(g, -104, -62, -104, -52, 4);
      rr(g, -150, -150, 92, 88, 5);
      inkFill(g, '#2b2b2b', 1.6);
      for (let i = 0; i < 3; i++) {
        circle(g, -143 + i * 6.5, -144, 1.8);
        inkFill(g, '#555', 0.8, '#555');
      }
      rr(g, -64, -56, 26, 4, 1.5);
      inkFill(g, C.steel, 1.2);
      const cmd = '$ aws-cost';
      const shown = T < 0 ? 1 : Math.floor(typed * (cmd.length - 2)) + 2;
      text(g, cmd.slice(0, shown), -144, -124, 9, C.butterHi, 'left');
      if (T < 0 && Math.sin(S.t * 8) > 0) {
        ln(g, -134, -132, -134, -125, 1.4, '#e5e5e5');
      }
      const nr = Math.floor(rows * 4.99);
      g.save();
      g.globalAlpha *= 1 - clear;
      for (let i = 0; i < Math.min(4, nr); i++) {
        const r = AW.rows[i], c = i === 3 ? C.butterHi : '#e5e5e5', a = bill && T > 1.7 && T < 2.3 ? 0.35 : 1;
        g.save();
        g.globalAlpha *= a;
        text(g, r[0], -144, -110 + i * 11, 9, c, 'left');
        text(g, r[1], -66, -110 + i * 11, 9, c, 'right');
        g.restore();
      }
      g.restore();
      if (bill && bill !== 'hand') {
        awBill(g, bill.p[0], bill.p[1], bill.rot, bill.s);
      }
      stand(g, 66, 154, -56);
      rr(g, 46, -156, 128, 100, 5);
      inkFill(g, C.paper, 1.6);
      rr(g, 46, -156, 20, 100, 5);
      inkFill(g, '#ede9fe', 1.4);
      for (let i = 0; i < 3; i++) {
        rr(g, 51, -146 + i * 12, 10, 7, 2);
        inkFill(g, i === 0 ? C.paper : '#ddd6fe', 0.9, '#8b7fc0');
      }
      text(g, '# aws-costs', 72, -144, 9, '#3d3d3d', 'left');
      ln(g, 66, -138, 174, -138, 1, C.line);
      g.save();
      rr(g, 66, -137, 107, 80, 4);
      g.clip();
      awMsg(g, -132 - oldUp * 64, T < 0 ? 0 : 1 - oldUp, 1, 1);
      awMsg(g, -132 + (1 - msg) * 10, T < 0 ? 1 : clamp(msg, 0, 1), T < 0 ? 1 : E.out(seg(T, 3.8, 4.3)), react);
      g.restore();
      fig(g, pose, x, 0, {
        sx,
        wave: S.wave, wt: S.wt,
        held: (gg, J) => held(gg, J, (h) => {
          if (bill === 'hand') {
            const out = T < 0 ? 0 : E.soft(seg(T, 2.15, 2.55)) * (1 - E.soft(seg(T, 2.8, 3.1)));
            awBill(gg, h[0] + lerp(6, 28, out) * Math.sign(sx), h[1] + lerp(-10, -4, out), -0.1 * Math.sign(sx), 1);
          }
        }),
      });
      if (fly >= 0 && T < 3.75) {
        const p = arcPt([15, -98], [124, -110], 44, fly);
        awBill(g, p[0], p[1], fly * 4, lerp(1, 0.5, fly));
      }
      if (T >= 0) {
        sparks(g, 104, -78, seg(T, 4.2, 4.9), 12, 5, C.greenInk);
      }
    },
  };

  // ---------- db-playground: pull the lever, a database rises with sample data ----------
  const DB = {
    names: ['postgres', 'mysql', 'mongo', 'redis', 'sqlite', 'duckdb', 'mariadb', 'cassandra'],
    cols: ['#bfdbfe', '#fed7aa', '#bbf7d0', '#fecaca', '#ede9fe', '#fde68a', '#fbcfe8', '#c7d2fe'],
    pivot: [70, -74],
  };
  function dbCyl(g, x, h, i, rowsK) {
    const w = 58, top = -h;
    g.beginPath();
    g.moveTo(x - w / 2, top);
    g.lineTo(x - w / 2, -4);
    g.ellipse(x, -4, w / 2, 6, 0, Math.PI, 0, true);
    g.lineTo(x + w / 2, top);
    g.closePath();
    inkFill(g, DB.cols[i], 1.5);
    g.beginPath();
    g.ellipse(x, top, w / 2, 6, 0, 0, TAU);
    inkFill(g, C.paper, 1.4);
    g.beginPath();
    g.ellipse(x, top + 22, w / 2, 6, 0, 0, Math.PI);
    inkFill(g, null, 1.1, 'rgba(0,0,0,0.25)');
    text(g, DB.names[i], x, top + 18, 9, '#3d3d3d');
    rr(g, x - 20, top + 32, 40, 28, 2);
    inkFill(g, C.paper, 1);
    const n = Math.floor(rowsK * 3.99);
    for (let r = 0; r < n; r++) {
      ln(g, x - 16, top + 39 + r * 7, x - 2, top + 39 + r * 7, 1.6, C.faint);
      ln(g, x + 2, top + 39 + r * 7, x + 16, top + 39 + r * 7, 1.6, '#e3e3e3');
    }
    text(g, 'northwind', x, top + 72, 9, C.muted);
  }
  SC['p:db-playground'] = {
    dur: 5.6,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const N = DB.names.length, cur = S.n % N, nxt = (S.n + 1) % N;
      const x = 112, sx = -1;
      const UPA = -1.2, DNA = 0.9;
      let la = UPA, pose, reel = cur, cylI = cur, cylH = 1, rowsK = 1, bulbs = false, hold = 0;
      const knobAt = (a) => [DB.pivot[0] + Math.cos(a) * 30, DB.pivot[1] + Math.sin(a) * 30];
      const knob = () => knobAt(la);
      const REST = P({ hF: [10, -58], hB: [-4, -53], head: [8, -116] });
      if (T < 0) {
        pose = breathe(REST, S.t);
        pose.head = [8 + pulse(S.t, 6, 3, 1.6) * 3, -116 - pulse(S.t, 6, 3, 1.6) * 3];
        bulbs = Math.sin(S.t * 2) > 0.7;
      } else {
        const pull = E.io(seg(T, 0.6, 1.05)), back = E.back(seg(T, 1.1, 1.45));
        la = T < 1.1 ? lerp(UPA, DNA, pull) : lerp(DNA, UPA, back);
        hold = E.soft(seg(T, 0.15, 0.55)) * (1 - E.soft(seg(T, 1.05, 1.3)));
        const k = E.out3(seg(T, 1.0, 2.6));
        reel = cur + k * (N * 2 + ((nxt - cur + N) % N));
        bulbs = T > 2.6 && T < 3.6 && Math.sin(T * 24) > 0;
        if (T < 2.7) {
          cylI = cur;
          cylH = 1 - E.in(seg(T, 0.1, 0.6));
        } else {
          cylI = nxt;
          cylH = E.back(seg(T, 2.7, 3.2));
          rowsK = seg(T, 3.2, 3.9);
        }
        const cheer = E.back(seg(T, 2.62, 3.15)) * (1 - E.soft(seg(T, 3.7, 4.1)));
        const lean = lerp(1, -0.6, E.soft(seg(T, 0.6, 1.0)));
        pose = mix(REST, P({ hF: lp(T < 1.05 ? knob() : knobAt(DNA), x, 0, sx), hB: [-4, -53], head: [9 + lean * 7, -114 + Math.abs(lean) * 1.5], chest: [2 + lean * 6, -90] }), hold);
        pose = mix(pose, P({ hF: [10, -58], hB: [-6, -132], head: [8, -119] }), cheer);
      }
      g.save();
      g.beginPath();
      g.rect(-180, -200, 360, 200);
      g.clip();
      g.translate(0, (1 - cylH) * 100);
      dbCyl(g, -104, 96, cylI, rowsK);
      g.restore();
      rr(g, -2, -132, 68, 132, 6);
      inkFill(g, '#f4f4f2', 1.6);
      rr(g, 4, -150, 56, 20, 4);
      inkFill(g, C.butterSoft, 1.4);
      text(g, 'playground', 32, -136.5, 9, C.umber);
      for (let i = 0; i < 6; i++) {
        circle(g, 8 + i * 9.6, -126, 2);
        inkFill(g, bulbs === (i % 2 === 0) ? C.butterHi : C.paper, 0.9);
      }
      rr(g, 5, -114, 54, 26, 3);
      inkFill(g, C.paper, 1.4);
      g.save();
      rr(g, 6, -113, 52, 24, 3);
      g.clip();
      const base = Math.floor(reel), f = reel - base;
      for (let d = -1; d <= 1; d++) {
        const idx = (((base + d) % N) + N) % N;
        text(g, DB.names[idx], 32, -97.5 + (d - f) * 16, 9, d === 0 && f < 0.1 ? C.ink : '#6b6b6b');
      }
      g.restore();
      ln(g, 5, -101, 9, -101, 1.4, C.amber);
      ln(g, 55, -101, 59, -101, 1.4, C.amber);
      rr(g, 10, -78, 44, 22, 3);
      inkFill(g, C.paper, 1.2);
      text(g, 'make', 32, -64, 9, C.muted);
      rr(g, 14, -40, 36, 10, 3);
      inkFill(g, C.steel, 1.2);
      rr(g, 64, -82, 8, 16, 2);
      inkFill(g, C.steel, 1.3);
      const kp = knob();
      fig(g, pose, x, 0, { sx, wave: S.wave, wt: S.wt });
      ln(g, DB.pivot[0], DB.pivot[1], kp[0], kp[1], 3.4);
      circle(g, kp[0], kp[1], 5);
      inkFill(g, C.red, 1.4, C.redInk);
      if (T >= 0) {
        sparks(g, -104, -108, seg(T, 3.1, 3.8), 18, 7, C.amber);
      }
    },
  };

  // ---------- awesome-minimal-sites: hang another minimal site on the list ----------
  const AM = {
    names: ['time.fyi', 'notemap', 'bmrks', 'tweek.so', 'piet.page', 'allan.bio', 'aarv.me', 'morning.so', 'viewport', 'gather.do'],
    acc: ['#fde68a', '#bfdbfe', '#fbcfe8', '#bbf7d0', '#fed7aa', '#ede9fe'],
    rail: -134, slot: 52, x0: -52,
  };
  function amSite(g, cx, top, idx, rot) {
    const N = AM.names.length, i = ((idx % N) + N) % N;
    const h1 = hash(i * 5.1), h2 = hash(i * 2.7 + 1);
    ln(g, cx, AM.rail, cx - 12, top, 1, C.muted);
    ln(g, cx, AM.rail, cx + 12, top, 1, C.muted);
    circle(g, cx, AM.rail, 1.6);
    inkFill(g, C.ink, 0.8);
    g.save();
    g.translate(cx, top);
    g.rotate(rot || 0);
    rr(g, -21, 0, 42, 32, 2);
    inkFill(g, C.woodDk, 1.4);
    rr(g, -17, 4, 34, 24, 1);
    inkFill(g, C.paper, 1);
    if (h1 < 0.5) {
      ln(g, -12, 11, -12 + 10 + h2 * 8, 11, 2, '#3d3d3d');
      ln(g, -12, 17, 8, 17, 1.2, C.faint);
      ln(g, -12, 21, 2, 21, 1.2, C.faint);
    } else {
      ln(g, -8, 13, 8, 13, 2, '#3d3d3d');
      ln(g, -10, 19, 10, 19, 1.2, C.faint);
    }
    circle(g, 11 - h2 * 4, 9, 2.2);
    g.fillStyle = AM.acc[i % AM.acc.length];
    g.fill();
    g.restore();
    text(g, AM.names[i], cx, top + 44, 9, C.muted);
  }
  SC['p:awesome-minimal-sites'] = {
    dur: 5.8,
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const x = -86, n = S.n;
      const top = AM.rail + 8;
      const ADMIRE = (t) => P({ hF: [4, -50], hB: [-3, -50], head: [7 + Math.sin(t * 0.9) * 2, -116 - Math.max(0, Math.sin(t * 0.9)) * 3], ef: 0.4 });
      const BEND = P({ hip: [-3, -55], chest: [12, -80], head: [21, -101], hF: lp([-60, -36], x, 0), hB: lp([-65, -34], x, 0), fF: [14, -2.5], fB: [-12, -2.5] });
      const HANG = (c) => P({ hF: lp([c[0] - 10, c[1] + 26], x, 0), hB: lp([c[0] - 17, c[1] + 30], x, 0), head: [9, -118], chest: [2, -90] });
      const CHIN = P({ hF: [10, -98], hB: [-6, -58], head: [8, -118] });
      let pose, slide = 0, newF = null, newRot = 0, shine = 0, hung = -1;
      if (T < 0) {
        pose = breathe(ADMIRE(S.t), S.t);
      } else {
        const hangC = [AM.x0, top];
        if (T < 0.55) {
          pose = mix(ADMIRE(S.t), BEND, E.soft(seg(T, 0, 0.5)));
          newF = T > 0.4 ? [-60, -40] : null;
        } else if (T < 1.4) {
          const k = E.io(seg(T, 0.55, 1.3));
          newF = arcPt([-60, -40], hangC, 10, k);
          pose = mix(BEND, HANG(newF), E.soft(seg(T, 0.55, 0.9)));
          newRot = lerp(0.3, 0.14, k);
        } else if (T < 2.0) {
          hung = T - 1.3;
          pose = mix(HANG(hangC), breathe(P({ hF: [10, -60], hB: [-4, -54], head: [9, -117] }), S.t), E.soft(seg(T, 1.4, 1.75)));
          newRot = 0.14 + Math.sin(hung * 10) * Math.exp(-hung * 3) * 0.08;
        } else if (T < 2.5) {
          const tap = E.soft(seg(T, 2.0, 2.2)) * (1 - E.soft(seg(T, 2.3, 2.5)));
          pose = mix(P({ hF: [10, -60], hB: [-4, -54], head: [9, -117] }), P({ hF: lp([AM.x0 - 18, top + 30], x, 0), hB: [-4, -54], head: [10, -118] }), tap);
          newRot = T < 2.25 ? 0.14 : 0.14 * Math.exp(-(T - 2.25) * 14) * Math.cos((T - 2.25) * 30);
        } else {
          pose = mix(P({ hF: [10, -60], hB: [-4, -54], head: [9, -117] }), CHIN, E.soft(seg(T, 2.5, 2.9)) * (1 - E.soft(seg(T, 3.6, 4.0))));
          if (T > 4.0) {
            pose = mix(pose, ADMIRE(S.t), E.soft(seg(T, 4.0, 4.6)));
          }
          shine = seg(T, 2.6, 3.4);
          slide = E.io(seg(T, 3.6, 4.6));
          newRot = Math.sin(slide * Math.PI) * 0.04;
        }
      }
      ln(g, -76, AM.rail, 178, AM.rail, 2.4, C.woodDk);
      ln(g, -76, AM.rail - 1.5, 178, AM.rail - 1.5, 1, C.ink);
      for (let k = 1; k <= 4; k++) {
        const cx = AM.x0 + (k + slide) * AM.slot;
        const a = 1 - seg(cx, 150, 190);
        if (a <= 0.01) {
          continue;
        }
        g.save();
        g.globalAlpha *= a;
        amSite(g, cx, top, n + 1 - k, Math.sin(S.t * 1.2 + k) * 0.015 + Math.sin(slide * Math.PI) * 0.04);
        g.restore();
      }
      if (T >= 1.3) {
        amSite(g, AM.x0 + slide * AM.slot, top, n + 1, newRot);
      } else if (T < 0) {
        circle(g, AM.x0, AM.rail, 1.6);
        inkFill(g, C.ink, 0.8);
      }
      rr(g, -68, -26, 44, 26, 2);
      inkFill(g, C.wood, 1.5);
      for (let i = 0; i < 2; i++) {
        rr(g, -63 + i * 14, -36 + i * 2, 20, 14, 1.5);
        inkFill(g, C.woodDk, 1.1);
      }
      rr(g, -68, -26, 44, 26, 2);
      inkFill(g, C.wood, 1.5);
      text(g, 'awesome', -46, -9, 9, C.umber);
      fig(g, pose, x, 0, {
        wave: S.wave, wt: S.wt,
        held: (gg, J) => {
          if (!newF || T >= 1.3) {
            return;
          }
          inWorld(gg, J, () => {
            gg.save();
            gg.translate(newF[0], newF[1]);
            gg.rotate(newRot);
            rr(gg, -21, 0, 42, 32, 2);
            inkFill(gg, C.woodDk, 1.4);
            rr(gg, -17, 4, 34, 24, 1);
            inkFill(gg, C.paper, 1);
            ln(gg, -12, 13, 6, 13, 2, '#3d3d3d');
            gg.restore();
          });
        },
      });
      if (shine > 0 && shine < 1) {
        g.save();
        g.globalAlpha *= Math.sin(Math.PI * shine);
        star(g, AM.x0 + 18, top - 4, 6 + shine * 3, 5, 0.45);
        inkFill(g, C.butterHi, 1.1, C.amber);
        g.restore();
        sparks(g, AM.x0, top + 14, shine, 26, 7, C.amber);
      }
    },
  };
})();
