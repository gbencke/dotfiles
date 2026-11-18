# Craft notes

## The world

- One unit = one CSS pixel at native size (230px tall). Ground is `y = 0`, up is negative, `x = 0` is the centre.
- 192 units are visible above the ground and 38 below it. Keep every prop above `y = -185`.
- Set `width` on the scene (default 380). The stage scales to fit both height and `width`, so keep everything inside `±width/2`.
- A standing figure is about 112 units tall at the default scale (`FS = 0.88`). The head centre sits near `y = -102`, the shoulder near `y = -79`.
- **Reach is short: about 37 units from the shoulder.** If a hand must touch a prop, walk the figure there first (`walkSeg`). `reach()` clamps the arm, so a target that is too far just leaves the arm pointing.

## Scene shape

```js
SC['id'] = {
  dur: 6,           // seconds for one action
  width: 380,       // world units to fit across
  label: '…',       // screen-reader sentence
  loopOnly: false,  // true = no action, the idle is the whole scene
  draw(g, S) { … }, // called every frame
};
```

`S` contains:

| Field | Meaning |
|---|---|
| `t` | Seconds since the scene started, always running. Drives the idle. |
| `on` | Whether an action is playing. |
| `u` | Progress through the action, `0..1`. Use `T = S.u * this.dur` to get seconds. |
| `w` | Weight of the action: eases in over the first 7% and out over the last 7%. |
| `n` | How many actions have played. Use `n % k` to vary each play (the next database, the next site). |
| `since` | Seconds since the last action ended. |
| `st` | A scratch object kept between frames. |
| `wave`, `wt` | The "say hi" wave. Pass both to `fig()` as `{ wave: S.wave, wt: S.wt }`. |
| `hover` | Whether the mouse is over the scene. |

Draw order: back props → figures → things in front of hands (notes, held objects) → flying things and bubbles → sparks.

## Timing recipe

Everything is a function of `T`. Make windows with `seg(T, a, b)` (0→1 between `a` and `b`), shape them with an easing, and multiply pairs to make bumps:

```js
const reach = E.soft(seg(T, 0.6, 1.0)) * (1 - E.soft(seg(T, 1.6, 1.9)));  // in, hold, out
pose = mix(pose, REACH_POSE, reach);                                         // chain mixes in time order
const fade = 1 - seg(T, this.dur - 0.45, this.dur);                         // multiply results by this
```

- **No snaps**: every joint must move continuously. Never switch a pose with a bare `if (T < x)`; blend it with `mix(a, b, E.soft(seg(T, x, x + 0.2)))`. `E.back` starts from rest and overshoots at the end, so it's safe for limbs. After an action ends, idle `pulse()` gestures fade back in over ~0.8 s by themselves.
- **Easings** (`E`): `soft` (cosine) for body moves, `back` (overshoot) for things popping in, `out3` for things landing, `in` for slams and drops, `sm` (smoothstep).
- **Idle life**: `breathe(pose, t)` always. Add one `pulse(t, period, at, len)` gesture, like a chin scratch, glance or sip, every 5–7 s. Keep it small.
- **Walking**: `walkSeg(T, a, b, x0, x1)` returns `{ x, ph, amp, stride, dir }`. Apply it with `pose = legs(pose, ws.ph, ws.amp, { arms: false, stride: ws.stride })` *after* all the mixes. Always pass `stride`: a quick crossing takes longer strides instead of scuttling, and the feet only stay planted if `legs` knows the stride. To walk back, use a second `walkSeg` and pick whichever one covers the current `T`.
- **Walking against the way the figure faces** (walking home without turning round): step backwards with `{ ph: -ws.ph, amp: ws.amp, stride: ws.stride }`, e.g. `gait = ws.dir * sx < 0 ? { ph: -ws.ph, amp: ws.amp, stride: ws.stride } : ws`. Otherwise the figure moonwalks and its planted foot slides. Or turn the figure round (`sx = -1`) and walk forward.
- **Steps are smooth already**: the rig lifts and lands each foot at rest and eases a limb into full extension, so don't add your own foot easing.
- **Typical action beats**:

  | Seconds | Beat |
  |---|---|
  | 0–0.6 | Approach |
  | 0.6–1.3 | Act (reach, pull, stamp) |
  | 1.3–3 | The machine responds |
  | 3–4 | The result lands and stays |
  | 4–5 | Cheer or a small reaction |
  | Last 0.5 | Fade every result back to the idle state |

  Total 5–8 s. Shorter feels twitchy, longer gets skipped.
- Every state the action changes must return to idle by `T = dur`, either faded or walked back. Check the last frame against `idle:0`.

## Poses (local coordinates, facing right, ground 0)

`P({...})` overrides `BASE`. Keys: `head chest hip fF fB kF kB hF hB` (F = front limb, B = back limb; f = foot, k = knee, h = hand), plus `ef`/`eb` for how bent each elbow is (`1` natural, `0` straight). Elbows only ever bend the anatomical way; there is no backwards bend.

| Pose | Overrides |
|---|---|
| Rest | `{ hF: [12, -60], hB: [-4, -52] }` (the rig lets low resting hands hang from a nearly straight arm) |
| Chin / think | `{ hF: [10, -96], head: [7, -116], hB: [-4, -54] }` |
| Point / flick ahead | `{ hF: [40, -100], hB: [-4, -54], head: [10, -116] }` |
| Arm up, about to slam | `{ hF: [22, -128], hB: [-4, -54], head: [6, -117] }` |
| Cheer, both arms | `{ hF: [14, -132], hB: [-10, -130], head: [3, -118] }` |
| Typing at a desk | aim both hands at the keyboard: `hF: lp([keysX + 4, keysY + bob], x, 0, sx)`, `hB: lp([keysX - 6, keysY - bob], x, 0, sx)`, bob = `Math.sin(t * 22) * 2.2`; stand close enough that the keys are within reach |
| Lean in | `chest: [4, -89], head: [10, -113]` |

- **Touch a world point**: `hF: lp([wx, wy], x, 0, sx)`, which converts world coordinates to the figure's local ones.
- **Face left**: `fig(g, pose, x, 0, { sx: -1 })`. The pose stays in "facing right" coordinates.
- **Arms between poses**: `mix` swings each hand around the shoulder on big moves (more than about 15°), going round the front of the body, so raising both arms reads like a real throw-up instead of hands sliding through the face. Small moves stay straight, so `lp()` reaches still land exactly. Don't hand-animate `hF`/`hB` in a straight line for big moves; mix between poses.
- **Elbows**: a real elbow only bends one way, so the forearm always folds toward the front of the body. The rig enforces it; `ef`/`eb` set how bent the arm is (`0` = straight), never which way. Older scenes with `-1` now get the natural bend.
- **Relaxed back arm hangs**: a back hand placed low under the shoulder is let down to a nearly straight arm. A resting hand set a little high used to bunch the arm and push the elbow out behind like a broken wing. The near hand is never moved, since it does the precise work. If the back hand has to work under the shoulder (holding a jug at the hip, steadying a box), or swings through a run or pumping cycle (the relax would make it lurch as it passes under the shoulder), add `hang: 0` to those poses; it blends like `ef`/`eb`.
- **Back arm while the front works**: keep it hanging by the side (`hB` about `[-3, -50]`) or doing something in front of the body. Don't park it behind the back with the forearm folded forward to the hip; side-on that reads as a broken wing. A startle or "whoa" brings both hands up in front, not one flung out behind the head.
- **Mouth**: figures have no face, but `fig()` returns `J.mouth` (world space), the front of the head a little below its centre. A mic, a cup, a whistle or a straw goes there, not on the forehead or the centre of the head. For a held mic, place the hand so the mic's head lands on `J.mouth`.
- **Raised near arm**: `fig` nudges the near (front) arm forward when it would cross the face, so a cheer reads as a clean "Y". Hands that stop at the face (a sip, a chin scratch) are left alone. The far arm behind the head is fine.
- **Turning around**: flip `sx` from `1` to `-1` in one frame, at the moment the figure changes direction. Never squash it through 0; that reads as a card flipping. `sxv(v)` snaps any value to `1` or `-1`, so `sx = sxv(Math.cos(Math.PI * k))` turns at the halfway point of `k`.
- **Second figure**: `{ ink: '#d97757', far: '#e8b7a3' }`. `far` is the colour of the back limbs.
- **Robot (AI agent)**: add `bot: { col, dark, glow, blink, happy }` to the fig options. `glow` (0..1) lights the antenna and chest; `blink` closes the eyes (`pulse(t, 4.3, 1.2, 0.15) > 0.5`); `happy` turns the eyes into arcs. House style is orange `#d97757`/`#a8553a`/far `#e8b7a3`; a second agent is teal `#3d7a8c`/`#2a5866`/far `#a9c9d1`. A dark `col` (a black agent) gets a white visor and ink eyes automatically (`screen`/`eye` override). Label it `agent` (or `claude`/`codex`) under the figure.
- **Held objects**: `fig(..., { held: (g, J) => R.held(g, J, (hand) => drawAt(hand)) })`, or use `fig`'s return value, `J.w.handF`, in world space.
- **Hands go on top of what they grip**: `held` draws under the near arm, so the hand stays in front. A prop drawn after `fig()` in world space (a card, a sign) covers the hand; call `R.frontArm(g, J)` right after it to redraw the near arm on top. A handle, knob or crank the hand turns is drawn before the figure.
- **Other options**: `hat: true`, `cap` via `drawFig` style, `shadow: false`, `alpha`.

## Kit (all on `window.RIG`)

- **Pen**: `rr` (rounded rect path), `inkFill(g, fill, lw, stroke)`, `ln(g, x0, y0, x1, y1, lw, col)`, `circle`, `poly`, `wline` (wobbly polyline), `text(g, s, x, y, size, col, align)`, `star`, `strokePath`, `partial(pts, k)` (draw a path part-way, for ticks and signatures).
- **Motion**: `seg`, `E`, `mix`, `seq` (pose keyframes), `nseq` (number keyframes), `pulse`, `breathe`, `legs`, `walkSeg`, `gait(xf, T)` (walk along any `x(T)` function), `arcPt(a, b, h, k)` (a point on a hop arc), `lerp`, `L2`, `clamp`, `hash`, `wob`.
- **Props**:
  - `win(g, x, y, w, h, title)`: a browser window.
  - `term(...)`: a dark terminal.
  - `stand(g, x0, x1, yb)`: easel legs from `yb` to the ground.
  - `words(g, x, y, w, seed, col, lw)`: grey text lines.
  - `pill(g, cx, cy, label, fill, ink, size)`: sized from the text, with 4 units above and below.
  - `arrow(g, pts, { lw, col, head, k })`, `arcArrow(g, cx, cy, r, a0, a1, { lw, col })`, `arrowHead(g, tip, angle, len, lw, col)`: hand-drawn arrows with an open chevron head and softly curved barbs (the koboyo.com style). Never draw an arrowhead as a filled triangle. Media buttons (▶ play, ▶▶ fast-forward) are icons, not arrows, and stay solid.
  - `pole(g, a, b)`: wooden pole.
  - `tick(g, x, y, k, scale, col)`
  - `tickBadge(g, x, y, k, r, fill, ink)`: pops in a green tick circle.
  - `bubble(g, x, y, text, k, { tail, size, fill })`: speech bubble centred on `x` with its bottom at `y`; the tail tip points down at about `x + tail`. Put the body beside the speaker's head (not over props) and give `tail` the offset back to the head, e.g. `bubble(g, BOT - 22, -132, 'on it!', k, { tail: 14 })`. The runtime keeps the tail base inside the body and leans the tip out, so a large `tail` can't detach it.
  - `plane(g, from, to, k, arcHeight, size)`: paper plane.
  - `sparks(g, x, y, k, r, n, col)`: burst lines.
  - `floatText(g, s, x, y, k, col)`: "+1" that drifts up.
- **Palette** (`C`): `ink paper floor faint muted butter butterHi butterSoft umber amber wood steel red redInk green greenInk sky`.

## Prop recipes that read well

- **Board on legs**: a paper rect, a header line with a file name, `words()` rows, and one highlighted row (red `#ffebe9` / green `#dafbe1`, like a diff).
- **Machine with lever**: a tall box, a name plate on top, a row of bulbs that blink on success, and a slot reel that spins to the next item (`db-playground`).
- **Rail of frames**: a wooden rail with hanging frames; the figure carries a new frame in and hangs it, and a star pops on it (`awesome-minimal-sites`).
- **Desk**: a wood top on two legs, a laptop drawn side-on (base plus tilted dark lid) and a mug. Typing glyphs `{ } ;` float up from it.
- **Stamp**: a coloured rounded rect rotated about −0.16 that scales from 1.9× to 1× with `out3`, plus `sparks`.
- **Sticky note**: a butter rect at about 0.12 rad with two umber lines; it pops in with `E.back`.
- **Countdown, counter or scoreboard**: a number tweened with `Math.round(lerp(a, b, k))`.
- **Hand-offs between figures**: `plane()` or a small coloured strip flying along `arcPt`.

## Metaphor catalog (proven)

**In `examples/`:**

| Scene | Metaphor | Location |
|---|---|---|
| diffity-review | comment on a line → agent fixes it → approve | `diffity-review.js` |
| diffity-loop | terminal prompt → agent floods it → fold into Diffity, comment → fold back, agent fixes (two desks, a robot agent, a hold beat, page steps synced) | `diffity-loop.js` |
| diffity-agents | a spotlight rides a rail of model tags grouped by agent, lights the chosen robot, an effort knob powers it up | `diffity-agents.js` |
| copy-marker | highlight, copy the link, it opens highlighted | `scenes-p3.js:59` |
| github actions | push a commit down the workflow | `scenes-p3.js:224` |
| yaml-sample | feed YAML in, crank, JSON pops out | `scenes-p3.js:540` |
| promises | ring for a value, wait, it resolves | `scenes-p3.js:693` |
| data structures | push a block on the stack, pop it back | `scenes-p3.js:842` |
| pages-blog-action | drop a post in, the blog rebuilds | `scenes-p3.js:953` |
| markdown-it-class | label-gun classes onto tags | `scenes-p3.js:1096` |
| mongo-playground | one command grows a database full of data | `scenes-p3.js:1223` |
| node basic auth | swipe a card, get refused, encode it, the gate lifts | `scenes-p3.js:1344` |
| node session auth | log in once, a cookie opens the door | `scenes-p3.js:1479` |
| sendy | one click, a container rides the rails, letters fly | `scenes-p3.js:1649` |
| aws-cost-cli | the bill prints, toss it into Slack | `scenes-p3.js:1772` |
| db-playground | pull the lever, a database rises | `scenes-p3.js:1945` |
| awesome-minimal-sites | hang another site on the rail | `scenes-p3.js:2056` |
| mondex | the index clerk | `scenes-p4.js:114` |
| mongodumper | the night porter | `scenes-p4.js:246` |
| slack-msg | the stomper | `scenes-p4.js:357` |
| local-ses | the mail catcher | `scenes-p4.js:462` |
| gitkot | the swiper | `scenes-p4.js:580` |
| typingwise | the talker | `scenes-p4.js:686` |
| timelang | the date machine | `scenes-p4.js:799` |
| claude-queue | the night shift | `scenes-p4.js:957` |
| claude-statusline | the sign fitter | `scenes-p4.js:1108` |
| copy-dom-css | the sticker peeler | `scenes-p4.js:1251` |
| claupe | the puppeteer | `scenes-p4.js:1410` |
| balsamiq-sans-neue | the font smith | `scenes-p4.js:1495` |
| rundown | the thread squeezer | `scenes-p4.js:1581` |
| video-demo | the camera operator | `scenes-p4.js:1722` |

The example files define their own small helpers at the top. Most have the same names as kit helpers, with slightly different arguments, so check the top of the file before copying.

**Others on the story site** (`kamranahmed.info/public/story/crew/` and `/public/v/crew/`), for more ideas: driver.js the spotlight operator, roadmap.sh the pathfinder, time.fyi the juggler, notemap the connector (pinning notes and stringing them together), tablething the filing clerk, slim the tunneller, slasha the deployer, streamif the broadcaster, page-mascot the wrangler, tinyhand the pointer, toaster, paperboy, transformer press, hourglass, zipline, globe and pin, rake, tailor with scissors.

**Roles that work as metaphors**: clerk, porter, stamper, sign fitter, camera operator, juggler, tunneller, puppeteer, smith, inspector, catcher, swiper.

## Mistakes already made once

- A pond, rug or shadow with the ground line running through it: the runtime now draws the ground before the scene, so anything lying on the ground covers the line. Don't redraw the ground yourself.
- Text crammed against a box edge (a card title touching the top, a word filling a plank): give text at least 4 units of space above and below inside any box, and size boxes from the text (`pill`, or `tw(g, s, size)` plus padding). A 9px label wants a box at least 17 tall.
- A solid triangle arrowhead: use `arrow`/`arcArrow`/`arrowHead`.
- A mic held to the forehead: aim it at `J.mouth`.
- Typing into thin air or onto the desk edge: a fixed typing pose only lands on the laptop if the figure happens to stand at the right distance. Aim the hands at the keys with `lp()`.
- A badge or pill squeezed into a narrow header strip: use plain coloured text there instead.
- A card or sign drawn over the hand that holds it: `R.frontArm(g, J)` after drawing it.
- An elbow bent backwards (`ef`/`eb: -1`): the rig no longer allows it, and `motion.mjs` reports `bent-back-elbow` and `elbow-out-back` (a broken-wing back arm).

- Moving a hand from the hip to overhead in a straight line: it passes through the chest and face and the elbow sticks out sideways near the shoulder. Blend poses with `mix` (it arcs) and keep the raised arm's elbow in front.
- Turning a figure by squashing `sx` smoothly through 0: for a moment it is paper-thin, like a card flipping. Snap `sx` to `1` or `-1` instead.
- Text, a note or a held card drawn over the figure's face or across its shoulders (it reads as the figure standing behind the prop): hold props below the shoulder or beside the figure, and draw notes after the figure only if they sit away from the head. `motion.mjs` reports `head-covered` by sampling the head's pixels after each frame.
- The figure standing in front of the thing it explains: put it beside the prop and let it reach.
- Things cropped at the scene edges, or a bubble running off the right side: check `idle` and every bubble frame on the sheet.
- `rr` with a radius bigger than half the width draws a squiggle: keep bars at least 8 wide, or let `rr` clamp (the runtime's `rr` already clamps).
- A grey floor band on a white page looks like a box: use `no-floor`.
- A state that doesn't reset at the end makes the loop pop: multiply by `fade`.
- In the contact sheet, set `--cols` × `--fw` small enough to fit. The script sizes the viewport for you.
- Speech-bubble tails drawn as a separate triangle detach from the body when `tail` is bigger than half the bubble: the runtime bubble is now one outline. Don't hand-draw bubbles.
- A labelled tag row under a hanging prop (a lamp under a rail of tags): hang the prop below the tags and draw its rod before the tags, so the shade never covers a label.
- Bubbles over the sparks of a cheer: delay the bubble until the sparks are mostly gone, or put it on the other side.
- Scenes that vary per play (`S.n % k`): render every variant with `@n` on the sheet; the first play alone hides broken variants.
- Syncing page UI to a scene (steps that light up): set `g.canvas.parentElement.dataset.step` from `draw` when it changes and style with `:has(stick-scene[data-step='2'])`. In Astro scoped styles, wrap the stick-scene part in `:global(...)` when the element comes from another component.
