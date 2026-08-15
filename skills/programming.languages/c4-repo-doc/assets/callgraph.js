// callgraph.js - dependency-free force-directed SVG diagrams for c4-repo-doc.
// Drives every <svg class="cg" data-graph="KEY"> on the page. Data comes from
// window.GRAPHS = { KEY: {nodes, edges} }; the legacy single
// <svg id="callgraph"> + window.GRAPH pair also works.
// nodes: [{id, label, kind, anchor}]   edges: [{source, target, kind?}]
// kind "inherits" renders dashed. `anchor` = in-page id scrolled to on click.
// Controls (auto-injected above each SVG): symbol filter, drag-node,
// drag-background pan, wheel zoom, +/- zoom buttons, reset view.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = { function: '#4C9AFF', method: '#36B37E', class: '#FFAB00',
                   type: '#FF5630', module: '#8777D9' };

  function init(svg, GRAPH) {
    const W = 1200, H = 800;
    const vb0 = { x: 0, y: 0, w: W, h: H };
    let vb = Object.assign({}, vb0);
    const cols = Math.max(1, Math.ceil(Math.sqrt(GRAPH.nodes.length * W / H)));
    const nodes = GRAPH.nodes.map((n, i) => Object.assign({
      x: 70 + (i % cols) * 150, y: 50 + Math.floor(i / cols) * 60, vx: 0, vy: 0
    }, n));
    const byId = {};
    nodes.forEach(n => byId[n.id] = n);
    const links = GRAPH.edges
      .map(e => ({ s: byId[e.source], t: byId[e.target], kind: e.kind }))
      .filter(l => l.s && l.t);

    // controls
    const bar = document.createElement('div');
    bar.className = 'cg-controls';
    bar.style.cssText = 'display:flex;gap:6px;align-items:center;margin:6px 0;' +
      'font:13px system-ui,sans-serif';
    bar.innerHTML =
      '<input type="search" placeholder="Filter symbol…" ' +
      'style="flex:1;max-width:240px;padding:4px 8px;border:1px solid #bbb;' +
      'border-radius:6px">' +
      '<button data-z="in" title="Zoom in">+</button>' +
      '<button data-z="out" title="Zoom out">−</button>' +
      '<button data-z="reset" title="Reset zoom and center">Reset</button>' +
      '<span class="cg-count" style="color:#666"></span>';
    bar.querySelectorAll('button').forEach(b => b.style.cssText =
      'padding:3px 10px;border:1px solid #bbb;border-radius:6px;background:#fff;cursor:pointer');
    svg.parentNode.insertBefore(bar, svg);

    const gEdges = document.createElementNS(NS, 'g');
    const gNodes = document.createElementNS(NS, 'g');
    svg.appendChild(gEdges); svg.appendChild(gNodes);

    const lineEls = links.map(l => {
      const el = document.createElementNS(NS, 'line');
      el.setAttribute('stroke', l.kind === 'inherits' ? '#B37ED9' : '#999');
      el.setAttribute('stroke-opacity', '0.55');
      if (l.kind === 'inherits') el.setAttribute('stroke-dasharray', '6,4');
      gEdges.appendChild(el); return el;
    });
    const nodeEls = nodes.map(n => {
      const w = Math.max(46, n.label.length * 6.8 + 16), h = 22;
      n.w = w; n.h = h;
      const g = document.createElementNS(NS, 'g');
      g.style.cursor = 'pointer';
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', -w / 2); r.setAttribute('y', -h / 2);
      r.setAttribute('width', w); r.setAttribute('height', h);
      r.setAttribute('rx', 5);
      r.setAttribute('fill', COLORS[n.kind] || '#4C9AFF');
      r.setAttribute('stroke', '#fff'); r.setAttribute('stroke-width', '1.5');
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('y', 4);
      t.setAttribute('font-size', '11px'); t.setAttribute('fill', '#fff');
      t.textContent = n.label;
      g.appendChild(r); g.appendChild(t); gNodes.appendChild(g);
      g.addEventListener('click', () => {
        if (didDrag) return;
        const el = document.getElementById(n.anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return g;
    });

    // filter
    const input = bar.querySelector('input');
    const count = bar.querySelector('.cg-count');
    function applyFilter() {
      const q = input.value.trim().toLowerCase();
      let visible;
      if (!q) {
        visible = new Set(nodes.map(n => n.id));
      } else {
        visible = new Set(nodes.filter(n =>
          n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
          .map(n => n.id));
        const matches = new Set(visible);
        links.forEach(l => {
          if (matches.has(l.s.id)) visible.add(l.t.id);
          else if (matches.has(l.t.id)) visible.add(l.s.id);
        });
      }
      nodes.forEach((n, i) => nodeEls[i].style.display =
        visible.has(n.id) ? '' : 'none');
      links.forEach((l, i) => lineEls[i].style.display =
        (visible.has(l.s.id) && visible.has(l.t.id)) ? '' : 'none');
      count.textContent = q ? `${visible.size}/${nodes.length} symbols` : '';
    }
    input.addEventListener('input', applyFilter);
    applyFilter();

    function tick() {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.vx += (W / 2 - a.x) * 0.002; a.vy += (H / 2 - a.y) * 0.002;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 1;
          if (d2 < 40000) {
            const f = 800 / d2;
            a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
          }
        }
      }
      links.forEach(l => {
        let dx = l.t.x - l.s.x, dy = l.t.y - l.s.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 110) * 0.02;
        l.s.vx += dx / d * f; l.s.vy += dy / d * f;
        l.t.vx -= dx / d * f; l.t.vy -= dy / d * f;
      });
      nodes.forEach(n => { n.vx *= 0.85; n.vy *= 0.85; n.x += n.vx; n.y += n.vy; });
      links.forEach((l, i) => {
        lineEls[i].setAttribute('x1', l.s.x); lineEls[i].setAttribute('y1', l.s.y);
        lineEls[i].setAttribute('x2', l.t.x); lineEls[i].setAttribute('y2', l.t.y);
      });
      nodeEls.forEach((g, i) => g.setAttribute('transform',
        `translate(${nodes[i].x},${nodes[i].y})`));
    }

    // pan & zoom
    function applyVB() {
      svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    }
    function zoomAt(cx, cy, k) {
      vb.x = cx - (cx - vb.x) * k; vb.y = cy - (cy - vb.y) * k;
      vb.w *= k; vb.h *= k; applyVB();
    }
    function toSVG(e) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const p = toSVG(e);
      zoomAt(p.x, p.y, e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });
    bar.addEventListener('click', e => {
      const z = e.target.dataset.z;
      if (z === 'in') zoomAt(vb.x + vb.w / 2, vb.y + vb.h / 2, 0.8);
      if (z === 'out') zoomAt(vb.x + vb.w / 2, vb.y + vb.h / 2, 1.25);
      if (z === 'reset') { vb = Object.assign({}, vb0); applyVB(); }
    });

    let drag = null, pan = null, didDrag = false;
    svg.addEventListener('pointerdown', e => {
      const g = e.target.closest('g');
      const i = nodeEls.indexOf(g);
      didDrag = false;
      if (i >= 0) {
        drag = nodes[i];
      } else {
        const p = toSVG(e);
        pan = { sx: p.x, sy: p.y, vx: vb.x, vy: vb.y };
      }
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', e => {
      const p = toSVG(e);
      if (drag) {
        didDrag = true;
        drag.x = p.x; drag.y = p.y; drag.vx = drag.vy = 0;
      } else if (pan) {
        didDrag = true;
        vb.x = pan.vx - (p.x - pan.sx); vb.y = pan.vy - (p.y - pan.sy);
        applyVB();
      }
    });
    svg.addEventListener('pointerup', () => { drag = null; pan = null; });

    applyVB();
    let alpha = 1;
    (function loop() {
      if (alpha > 0.01 || drag) { tick(); alpha *= drag ? 1 : 0.995; }
      requestAnimationFrame(loop);
    })();
  }

  function boot() {
    const seen = new Set();
    document.querySelectorAll('svg.cg, #callgraph').forEach(svg => {
      if (seen.has(svg)) return;
      seen.add(svg);
      const key = svg.dataset.graph;
      const data = (window.GRAPHS && window.GRAPHS[key]) ||
                   (!key && window.GRAPH) || (key === 'main' && window.GRAPH);
      if (data && data.nodes && data.nodes.length) init(svg, data);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
