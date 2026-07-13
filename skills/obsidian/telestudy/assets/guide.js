/* The Reading Room — telescopic study guide renderer.
   Reads JSON from <script id="book-data" type="application/json"> and builds the page.
   Zero dependencies. */
(function () {
  "use strict";

  const dataEl = document.getElementById("book-data");
  if (!dataEl) return;
  let BOOK;
  try { BOOK = JSON.parse(dataEl.textContent); }
  catch (e) {
    document.body.innerHTML = "<div class='page'><p>Could not parse book data: " + e.message + "</p></div>";
    return;
  }

  const ROLES = {
    foundation:  { label: "Foundation",  color: "var(--slate)" },
    mechanism:   { label: "Mechanism",   color: "var(--gold)" },
    implication: { label: "Implication", color: "var(--oxblood)" },
    practice:    { label: "Practice",    color: "var(--moss)" },
    case:        { label: "Case study",  color: "var(--plum)" },
  };
  const roleOf = (idea) => ROLES[idea.role] ? idea.role : "mechanism";

  const booksURL = BOOK.sourceUrl || (BOOK.assetId ? "ibooks://assetid/" + BOOK.assetId : null);
  const sourceLabel = BOOK.sourceLabel || (BOOK.sourceUrl ? "Open the source" : "Open in Apple Books");
  const ideas = BOOK.ideas || [];
  const chapters = BOOK.chapters || [];
  const ideaById = {}; ideas.forEach((i) => (ideaById[i.id] = i));
  const chapterByN = {}; chapters.forEach((c) => (chapterByN[c.n] = c));
  // reverse edges: leadsTo
  const leadsTo = {};
  ideas.forEach((i) => (i.dependsOn || []).forEach((d) => {
    (leadsTo[d] = leadsTo[d] || []).push(i.id);
  }));

  /* ————— persistence ————— */
  const storeKey = "sg-" + (BOOK.slug || location.pathname);
  let state = { grasped: [], level: 1 };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(storeKey) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(storeKey, JSON.stringify(state)); } catch (e) {} };

  /* ————— helpers ————— */
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const paras = (arr) => (arr || []).map((p) => "<p>" + p + "</p>").join("");
  const ICONS = {
    book: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 3.5C2 3.5 3.5 2.5 5.5 2.5S8 3.5 8 3.5v10s-1-.9-2.5-.9S2 13.5 2 13.5v-10zM14 3.5c0 0-1.5-1-3.5-1S8 3.5 8 3.5v10s1-.9 2.5-.9 3.5.9 3.5.9v-10z"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.5 3l5 5-5 5"/></svg>',
    open: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 3.5H3v9.5h9.5V9.5M9.5 2.5H13.5V6.5M13 3L7.5 8.5"/></svg>',
  };
  const chapLabel = (n) => {
    const c = chapterByN[n];
    return c ? (c.label || "Ch. " + c.n) + (c.title ? " · " + c.title : "") : "Ch. " + n;
  };

  /* ————— page scaffold ————— */
  document.title = BOOK.title + " — Study Guide";
  const page = el("div", "page");
  document.body.appendChild(page);

  const mast = el("header", "masthead");
  mast.innerHTML =
    (BOOK.library === false ? '<div class="topline"><span></span>' : '<div class="topline"><a href="../index.html">&#8592; The Reading Room</a>') +
    '<span class="cat">' + esc(BOOK.category || "") + "</span></div>" +
    '<h1 class="book-title">' + esc(BOOK.title) + "</h1>" +
    (BOOK.subtitle ? '<p class="book-subtitle">' + esc(BOOK.subtitle) + "</p>" : "") +
    '<div class="book-byline">' + esc(BOOK.author) + (BOOK.year ? ' &nbsp;·&nbsp; <span class="year">' + esc(BOOK.year) + "</span>" : "") + "</div>";
  const actions = el("div", "mast-actions");
  if (booksURL) {
    const a = el("a", "btn");
    a.href = booksURL;
    a.innerHTML = ICONS.book + sourceLabel;
    actions.appendChild(a);
  }
  const prog = el("span", "progress-note");
  actions.appendChild(prog);
  const levels = el("div", "levels");
  levels.setAttribute("role", "group");
  levels.setAttribute("aria-label", "Reading depth");
  [["Skim", 0], ["Ideas", 1], ["Deep", 2]].forEach(([name, lv]) => {
    const b = el("button", null, name);
    b.dataset.level = lv;
    b.addEventListener("click", () => setGlobalLevel(lv));
    levels.appendChild(b);
  });
  actions.appendChild(levels);
  mast.appendChild(actions);
  page.appendChild(mast);

  /* ————— thesis ————— */
  if (BOOK.thesis && BOOK.thesis.length) {
    const s = el("section", "thesis");
    s.innerHTML = '<div class="section-label">The book in one breath</div>' + paras(BOOK.thesis);
    page.appendChild(s);
  }

  /* ————— idea cards ————— */
  const ideasSec = el("section", "ideas");
  ideasSec.innerHTML = '<div class="section-label">The ideas — click to telescope</div>';
  page.appendChild(ideasSec);

  ideas.forEach((idea, idx) => {
    const card = el("article", "idea-card");
    card.id = "idea-" + idea.id;
    const role = roleOf(idea);

    const head = el("button", "idea-head");
    head.setAttribute("aria-expanded", "false");
    head.innerHTML =
      '<span class="idea-num">' + String(idx + 1).padStart(2, "0") + "</span>" +
      '<span class="idea-title-wrap"><h3 class="idea-title">' + esc(idea.title) + "</h3>" +
      '<p class="idea-oneliner">' + esc(idea.oneLiner || "") + "</p></span>" +
      '<span class="role-tag role-' + role + '">' + ROLES[role].label + "</span>" +
      ICONS.chev;
    card.appendChild(head);

    const grasp = el("button", "grasp", "&#10003;");
    grasp.title = "Mark as grasped";
    grasp.setAttribute("aria-label", "Mark idea as grasped");
    grasp.setAttribute("aria-pressed", state.grasped.includes(idea.id) ? "true" : "false");
    if (state.grasped.includes(idea.id)) card.classList.add("grasped");
    grasp.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const on = grasp.getAttribute("aria-pressed") !== "true";
      grasp.setAttribute("aria-pressed", on ? "true" : "false");
      card.classList.toggle("grasped", on);
      state.grasped = on ? state.grasped.concat(idea.id) : state.grasped.filter((x) => x !== idea.id);
      save(); updateProgress();
    });
    head.insertBefore(grasp, head.querySelector(".chev"));

    const body = el("div", "idea-body");

    const lede = el("div", "lede", paras(idea.summary));
    body.appendChild(lede);

    if (idea.quote && idea.quote.text) {
      const q = el("blockquote", "pull", "&#8220;" + esc(idea.quote.text) + "&#8221;" +
        (idea.quote.context ? "<cite>" + esc(idea.quote.context) + "</cite>" : ""));
      body.appendChild(q);
    }

    if (idea.deeper && idea.deeper.length) {
      const t = el("button", "deeper-toggle");
      t.innerHTML = "Go deeper " + ICONS.chev;
      t.addEventListener("click", () => setCardLevel(card, card.classList.contains("deep") ? 1 : 2));
      body.appendChild(t);
      const dp = el("div", "deeper");
      idea.deeper.forEach((sec) => {
        if (sec.heading) dp.appendChild(el("h4", null, esc(sec.heading)));
        dp.insertAdjacentHTML("beforeend", paras(sec.body));
      });
      body.appendChild(dp);
    }

    const foot = el("div", "idea-foot");
    if (idea.chapters && idea.chapters.length) {
      const row = el("div", "chips-row", '<span class="row-label">Read the source</span>');
      idea.chapters.forEach((n) => {
        const a = el("a", "chip read-chip", ICONS.book + esc(chapLabel(n)));
        a.href = booksURL || "#chapters";
        a.title = "Opens the source — jump to " + chapLabel(n);
        row.appendChild(a);
      });
      foot.appendChild(row);
    }
    if (idea.dependsOn && idea.dependsOn.length) {
      const row = el("div", "chips-row", '<span class="row-label">Builds on</span>');
      idea.dependsOn.forEach((d) => ideaById[d] && row.appendChild(ideaChip(d)));
      foot.appendChild(row);
    }
    if (leadsTo[idea.id] && leadsTo[idea.id].length) {
      const row = el("div", "chips-row", '<span class="row-label">Feeds into</span>');
      leadsTo[idea.id].forEach((d) => row.appendChild(ideaChip(d)));
      foot.appendChild(row);
    }
    if (foot.children.length) body.appendChild(foot);
    card.appendChild(body);

    head.addEventListener("click", () => {
      setCardLevel(card, card.classList.contains("open") ? 0 : 1);
    });
    ideasSec.appendChild(card);
  });

  function ideaChip(id) {
    const idea = ideaById[id];
    const idx = ideas.indexOf(idea);
    const c = el("a", "chip", '<span style="font-family:var(--mono);font-size:10px">' + String(idx + 1).padStart(2, "0") + "</span>" + esc(idea.title));
    c.href = "#idea-" + id;
    c.addEventListener("click", (ev) => { ev.preventDefault(); revealIdea(id); });
    return c;
  }

  /* level: 0 closed, 1 open, 2 deep */
  function setCardLevel(card, lv) {
    card.classList.toggle("open", lv >= 1);
    card.classList.toggle("deep", lv >= 2);
    card.querySelector(".idea-head").setAttribute("aria-expanded", lv >= 1 ? "true" : "false");
  }
  function setGlobalLevel(lv) {
    state.level = lv; save();
    levels.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", +b.dataset.level === lv ? "true" : "false"));
    ideasSec.querySelectorAll(".idea-card").forEach((c) => setCardLevel(c, lv === 0 ? 0 : lv));
  }
  function revealIdea(id, deep) {
    const card = document.getElementById("idea-" + id);
    if (!card) return;
    setCardLevel(card, deep ? 2 : Math.max(1, card.classList.contains("deep") ? 2 : 1));
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    card.classList.add("flash");
    setTimeout(() => card.classList.remove("flash"), 1600);
  }
  function updateProgress() {
    const n = state.grasped.filter((g) => ideaById[g]).length;
    prog.textContent = n + " / " + ideas.length + " ideas grasped";
  }

  /* ————— ideas graph ————— */
  const graphSec = el("section", "graph-section");
  graphSec.innerHTML =
    '<div class="section-label">The ideas graph — what builds on what</div>' +
    '<p class="graph-hint">Arrows flow from foundations to what they support. Hover to trace a lineage; click a node to open that idea.</p>';
  const wrap = el("div", "graph-wrap");
  graphSec.appendChild(wrap);
  const legend = el("div", "graph-legend");
  Object.keys(ROLES).forEach((r) => {
    if (!ideas.some((i) => roleOf(i) === r)) return;
    legend.insertAdjacentHTML("beforeend",
      '<span class="key"><span class="swatch" style="background:' + ROLES[r].color + '"></span>' + ROLES[r].label + "</span>");
  });
  graphSec.appendChild(legend);
  page.appendChild(graphSec);

  function layoutGraph() {
    wrap.innerHTML = "";
    if (!ideas.length) return;
    // layer = longest dependency chain beneath the idea
    const depth = {};
    const depthOf = (id, seen) => {
      if (depth[id] != null) return depth[id];
      seen = seen || {};
      if (seen[id]) return 0; // cycle guard
      seen[id] = true;
      const deps = (ideaById[id].dependsOn || []).filter((d) => ideaById[d]);
      depth[id] = deps.length ? 1 + Math.max(...deps.map((d) => depthOf(d, seen))) : 0;
      return depth[id];
    };
    ideas.forEach((i) => depthOf(i.id));
    const nLayers = 1 + Math.max(...ideas.map((i) => depth[i.id]));
    const layers = Array.from({ length: nLayers }, () => []);
    ideas.forEach((i) => layers[depth[i.id]].push(i.id));

    // barycenter ordering: two passes
    const pos = {};
    layers.forEach((L) => L.forEach((id, k) => (pos[id] = k)));
    for (let pass = 0; pass < 2; pass++) {
      for (let li = 1; li < layers.length; li++) {
        layers[li].sort((a, b) => bary(a) - bary(b));
        layers[li].forEach((id, k) => (pos[id] = k));
      }
      for (let li = layers.length - 2; li >= 0; li--) {
        layers[li].sort((a, b) => baryDown(a) - baryDown(b));
        layers[li].forEach((id, k) => (pos[id] = k));
      }
    }
    function bary(id) {
      const deps = (ideaById[id].dependsOn || []).filter((d) => ideaById[d]);
      return deps.length ? deps.reduce((s, d) => s + pos[d], 0) / deps.length : pos[id];
    }
    function baryDown(id) {
      const kids = leadsTo[id] || [];
      return kids.length ? kids.reduce((s, d) => s + pos[d], 0) / kids.length : pos[id];
    }

    // geometry
    const maxRow = Math.max(...layers.map((L) => L.length));
    const W = Math.max(wrap.clientWidth - 20, Math.min(maxRow, 4) * 190, 560);
    const nodeW = Math.min(180, (W - 40) / Math.min(maxRow, 5) - 14);
    const nodeH = 46, rowGap = 96;
    const H = nLayers * (nodeH + rowGap) - rowGap + 40;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W); svg.setAttribute("height", H);

    const cx = {}, cy = {};
    layers.forEach((L, li) => {
      const rowW = L.length * nodeW + (L.length - 1) * 26;
      const x0 = (W - rowW) / 2;
      L.forEach((id, k) => {
        cx[id] = x0 + k * (nodeW + 26) + nodeW / 2;
        cy[id] = 20 + li * (nodeH + rowGap) + nodeH / 2;
      });
    });

    // defs: arrowheads per role color
    const defs = document.createElementNS(svgNS, "defs");
    Object.keys(ROLES).forEach((r) => {
      const m = document.createElementNS(svgNS, "marker");
      m.setAttribute("id", "arr-" + r);
      m.setAttribute("viewBox", "0 0 10 10"); m.setAttribute("refX", "9"); m.setAttribute("refY", "5");
      m.setAttribute("markerWidth", "7"); m.setAttribute("markerHeight", "7"); m.setAttribute("orient", "auto-start-reverse");
      const p = document.createElementNS(svgNS, "path");
      p.setAttribute("d", "M0,0 L10,5 L0,10 z"); p.setAttribute("fill", ROLES[r].color);
      m.appendChild(p); defs.appendChild(m);
    });
    svg.appendChild(defs);

    // edges (dep -> idea)
    const edgeEls = [];
    ideas.forEach((i) => (i.dependsOn || []).forEach((d) => {
      if (!ideaById[d]) return;
      const role = roleOf(ideaById[d]);
      const p = document.createElementNS(svgNS, "path");
      const x1 = cx[d], y1 = cy[d] + nodeH / 2, x2 = cx[i.id], y2 = cy[i.id] - nodeH / 2 - 5;
      const dy = Math.max(34, (y2 - y1) / 2);
      p.setAttribute("d", "M" + x1 + "," + y1 + " C" + x1 + "," + (y1 + dy) + " " + x2 + "," + (y2 - dy) + " " + x2 + "," + y2);
      p.setAttribute("class", "gedge");
      p.setAttribute("stroke", ROLES[role].color);
      p.setAttribute("marker-end", "url(#arr-" + role + ")");
      p.dataset.from = d; p.dataset.to = i.id;
      svg.appendChild(p); edgeEls.push(p);
    }));

    // nodes
    ideas.forEach((idea, idx) => {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "gnode");
      g.dataset.id = idea.id;
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", cx[idea.id] - nodeW / 2); rect.setAttribute("y", cy[idea.id] - nodeH / 2);
      rect.setAttribute("width", nodeW); rect.setAttribute("height", nodeH);
      rect.setAttribute("rx", 5);
      rect.setAttribute("stroke", ROLES[roleOf(idea)].color);
      g.appendChild(rect);

      // wrapped label (2 lines max)
      const words = idea.title.split(" ");
      const perLine = Math.max(10, Math.floor(nodeW / 6.4));
      let l1 = "", l2 = "";
      words.forEach((w) => {
        if (l2 || (l1 + " " + w).trim().length > perLine) l2 = (l2 + " " + w).trim();
        else l1 = (l1 + " " + w).trim();
      });
      if (l2.length > perLine) l2 = l2.slice(0, perLine - 1) + "…";
      const num = document.createElementNS(svgNS, "text");
      num.setAttribute("x", cx[idea.id] - nodeW / 2 + 8); num.setAttribute("y", cy[idea.id] - nodeH / 2 + 13);
      num.setAttribute("class", "gnum"); num.textContent = String(idx + 1).padStart(2, "0");
      g.appendChild(num);
      [l1, l2].forEach((line, li) => {
        if (!line) return;
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("x", cx[idea.id]); t.setAttribute("text-anchor", "middle");
        t.setAttribute("y", cy[idea.id] + (l2 ? (li ? 14 : -1) : 5));
        t.textContent = line;
        g.appendChild(t);
      });
      const title = document.createElementNS(svgNS, "title");
      title.textContent = idea.title + (idea.oneLiner ? " — " + idea.oneLiner : "");
      g.appendChild(title);

      g.addEventListener("click", () => revealIdea(idea.id));
      g.addEventListener("mouseenter", () => highlight(idea.id));
      g.addEventListener("mouseleave", unhighlight);
      svg.appendChild(g);
    });

    function lineage(id) {
      const up = new Set(), down = new Set();
      (function walkUp(x) { (ideaById[x].dependsOn || []).forEach((d) => { if (ideaById[d] && !up.has(d)) { up.add(d); walkUp(d); } }); })(id);
      (function walkDown(x) { (leadsTo[x] || []).forEach((d) => { if (!down.has(d)) { down.add(d); walkDown(d); } }); })(id);
      const all = new Set([id, ...up, ...down]);
      return all;
    }
    function highlight(id) {
      const lit = lineage(id);
      svg.classList.add("dimming");
      svg.querySelectorAll(".gnode").forEach((n) => n.classList.toggle("lit", lit.has(n.dataset.id)));
      edgeEls.forEach((e) => e.classList.toggle("lit", lit.has(e.dataset.from) && lit.has(e.dataset.to)));
    }
    function unhighlight() {
      svg.classList.remove("dimming");
      svg.querySelectorAll(".lit").forEach((n) => n.classList.remove("lit"));
    }
    wrap.appendChild(svg);
  }

  /* ————— chapters ————— */
  if (chapters.length) {
    const s = el("section", "chapters-section");
    s.id = "chapters";
    s.innerHTML = '<div class="section-label">Chapter map</div>';
    const list = el("ol", "chapter-list");
    chapters.forEach((c) => {
      const li = el("li", "chapter-row");
      const chips = (c.ideas || []).filter((id) => ideaById[id]).map((id) => {
        const idx = ideas.indexOf(ideaById[id]);
        return '<a class="chip" href="#idea-' + id + '" data-idea="' + id + '">' +
          '<span style="font-family:var(--mono);font-size:10px">' + String(idx + 1).padStart(2, "0") + "</span>" +
          esc(ideaById[id].title) + "</a>";
      }).join("");
      li.innerHTML =
        '<span class="chapter-no">' + esc(c.label || "Ch. " + c.n) + "</span>" +
        '<span class="chapter-main"><span class="chapter-title">' + esc(c.title) + "</span>" +
        (c.summary ? '<p class="chapter-summary">' + c.summary + "</p>" : "") +
        (chips ? '<span class="chapter-ideas">' + chips + "</span>" : "") + "</span>" +
        (booksURL ? '<a class="chapter-open" href="' + booksURL + '" title="' + sourceLabel + '">' + ICONS.open + "</a>" : "");
      list.appendChild(li);
    });
    list.addEventListener("click", (ev) => {
      const a = ev.target.closest("a[data-idea]");
      if (a) { ev.preventDefault(); revealIdea(a.dataset.idea); }
    });
    s.appendChild(list);
    page.appendChild(s);
  }

  /* ————— footer ————— */
  const foot = el("footer", "guide-foot");
  foot.innerHTML =
    "<span>A telescopic study guide — skim the ideas, dive where it matters, then read the source.</span>" +
    '<span>' + (BOOK.library === false ? "" : '<a href="../index.html">All guides</a>') +
    (booksURL ? ' &nbsp;·&nbsp; <a href="' + booksURL + '">' + sourceLabel.replace("Open in Apple Books", "Open the book") + '</a>' : "") + "</span>";
  page.appendChild(foot);

  /* ————— boot ————— */
  updateProgress();
  setGlobalLevel(typeof state.level === "number" ? state.level : 1);
  layoutGraph();
  let rto;
  window.addEventListener("resize", () => { clearTimeout(rto); rto = setTimeout(layoutGraph, 200); });
  if (location.hash.startsWith("#idea-")) {
    const id = location.hash.slice(6);
    setTimeout(() => revealIdea(id), 100);
  }
})();
