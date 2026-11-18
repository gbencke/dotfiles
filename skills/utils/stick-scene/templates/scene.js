// <product>: <one line: what the figure does that shows what the product does>
// Load after stick.js. Use as <stick-scene scene="<id>" play="view"></stick-scene>.
(function () {
  const SC = (window.SCENES = window.SCENES || {});
  const R = window.RIG;
  const { C, E, P, mix, legs, walkSeg, fig, inkFill, rr, ln, text, seg, breathe, pulse, lp, sparks, tickBadge, bubble, words } = R;

  // Fixed layout, in world units: ground is y = 0, up is negative, x = 0 is the centre.
  // Keep everything inside ±width/2 and above y = -185.
  const MACHINE = { x: -40, y: -150, w: 120, h: 110 };
  const HOME = -150, AT = -110;

  function machine(g, k) {
    ln(g, MACHINE.x + 20, MACHINE.y + MACHINE.h, MACHINE.x + 10, 0, 2.2);
    ln(g, MACHINE.x + MACHINE.w - 20, MACHINE.y + MACHINE.h, MACHINE.x + MACHINE.w - 10, 0, 2.2);
    rr(g, MACHINE.x, MACHINE.y, MACHINE.w, MACHINE.h, 6);
    inkFill(g, C.paper, 1.7);
    text(g, 'label', MACHINE.x + MACHINE.w / 2, MACHINE.y + 16, 9, C.umber);
    words(g, MACHINE.x + 14, MACHINE.y + 40, MACHINE.w - 28, 3);
    tickBadge(g, MACHINE.x + MACHINE.w - 10, MACHINE.y + 10, k);
  }

  SC['<id>'] = {
    dur: 6,
    width: 380,
    label: '<what happens, in one plain sentence, for screen readers>',
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const t = S.t;
      let x = HOME, gait = { ph: 0, amp: 0 };
      let pose = breathe(P({ hF: [12, -60], hB: [-4, -52] }), t);
      let doneK = 0;
      if (T < 0) {
        // Idle: small, cheap life. Breathing, a glance, a chin scratch every few seconds.
        pose = mix(pose, P({ hF: [10, -96], head: [7, -116], hB: [-4, -54] }), pulse(t, 5.5, 2, 2.2));
      } else {
        const fade = 1 - seg(T, this.dur - 0.45, this.dur);
        const ws = T < 3 ? walkSeg(T, 0, 0.6, HOME, AT) : walkSeg(T, 4.6, 5.3, AT, HOME);
        x = ws.x;
        gait = ws;
        const reach = E.soft(seg(T, 0.6, 1.0)) * (1 - E.soft(seg(T, 1.6, 1.9)));
        const cheer = E.back(seg(T, 2.4, 2.7)) * (1 - E.soft(seg(T, 3.4, 3.8)));
        pose = mix(pose, P({ hF: lp([MACHINE.x + 10, MACHINE.y + 60], x, 0, 1), hB: [-4, -54], head: [9, -114], chest: [3, -90] }), reach);
        pose = mix(pose, P({ hF: [14, -132], hB: [-10, -130], head: [3, -118] }), cheer);
        doneK = seg(T, 1.8, 2.3) * fade;
      }
      pose = legs(pose, gait.ph, gait.amp, { arms: false });

      machine(g, doneK);
      fig(g, pose, x, 0, { wave: S.wave, wt: S.wt });
      sparks(g, MACHINE.x + MACHINE.w / 2, MACHINE.y - 6, seg(T, 2.3, 2.9), 16, 6);
      bubble(g, x + 6, -134, 'done!', seg(T, 2.4, 2.6) * (1 - seg(T, 3.6, 3.8)));
    },
  };
})();
