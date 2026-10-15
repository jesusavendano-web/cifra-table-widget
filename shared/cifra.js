// Cifra · comportamiento de los componentes custom de los prototipos.
// En la app real esto vive en React; aquí es vanilla para que el HTML sea autocontenido.

(function () {
  const PAGES = [
    ['index.html', 'Dashboard'],
    ['customize.html', 'Customize'],
  ];

  const svgNS = 'http://www.w3.org/2000/svg';
  const fmt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  // ---------------------------------------------------------------- proto bar
  function protoBar() {
    const here = location.pathname.split('/').pop() || 'index.html';
    const bar = document.createElement('nav');
    bar.className = 'proto-bar';
    bar.setAttribute('aria-label', 'Prototipos');
    bar.innerHTML = '<strong>Cifra · ENG-2308 Table widget · WC 2.0-rc</strong>' +
      PAGES.map(([href, label]) => `<a href="${href}"${href === here ? ' aria-current="page"' : ''}>${label}</a>`).join('') +
      '<span class="spacer"></span><button type="button" aria-pressed="false" data-toggle-custom>Resaltar custom</button>';
    document.body.prepend(bar);
    const btn = bar.querySelector('[data-toggle-custom]');
    let on = false;
    try { on = localStorage.getItem('cifra-show-custom') === '1'; } catch (e) {}
    const apply = () => { document.body.classList.toggle('show-custom', on); btn.setAttribute('aria-pressed', String(on)); };
    apply();
    btn.addEventListener('click', () => {
      on = !on; apply();
      try { localStorage.setItem('cifra-show-custom', on ? '1' : '0'); } catch (e) {}
    });
  }

  // ---------------------------------------------------------------- tabs & segmented
  function tabs() {
    document.querySelectorAll('.c-tabs').forEach((group) => {
      group.addEventListener('click', (e) => {
        const tab = e.target.closest('.c-tabs__tab');
        if (!tab || tab.dataset.href) return;
        group.querySelectorAll('.c-tabs__tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
        const target = tab.getAttribute('aria-controls');
        if (target) {
          group.parentElement.querySelectorAll(':scope > [data-tabpanel]').forEach((p) => { p.hidden = p.id !== target; });
        }
      });
    });
    document.querySelectorAll('.c-segmented').forEach((group) => {
      group.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        const panels = group.dataset.panels;
        if (panels) {
          document.querySelectorAll(`[data-panel-group="${panels}"]`).forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.value; });
        }
      });
    });
  }

  // ---------------------------------------------------------------- date range picker
  // Réplica del selector de fechas de Shopify Analytics (s-shopifyql-date-picker): presets a la izquierda con
  // submenús, "Last N days" + incluir hoy, s-date-picker type="range" con 2 meses, pie con rango y Cancel/Apply.
  function datePickers() {
    const TODAY = new Date(2026, 9, 12); // fecha de los prototipos (12 oct 2026)
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const fmtD = (d) => M[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const UNITS = ['days', 'weeks', 'months', 'years'];

    const rangeFor = (st) => {
      const T = TODAY;
      switch (st.preset) {
        case 'today': return [T, T, 'Today'];
        case 'yesterday': return [add(T, -1), add(T, -1), 'Yesterday'];
        case 'last': {
          const end = st.today ? T : add(T, -1);
          const s = new Date(end);
          if (st.unit === 'days') s.setDate(s.getDate() - st.n);
          else if (st.unit === 'weeks') s.setDate(s.getDate() - st.n * 7);
          else if (st.unit === 'months') s.setMonth(s.getMonth() - st.n);
          else s.setFullYear(s.getFullYear() - st.n);
          const u = st.n === 1 ? st.unit.slice(0, -1) : st.unit;
          return [s, end, 'Last ' + st.n + ' ' + u];
        }
        case 'wtd': return [add(T, -T.getDay()), T, 'Week to date'];
        case 'mtd': return [new Date(T.getFullYear(), T.getMonth(), 1), T, 'Month to date'];
        case 'qtd': return [new Date(T.getFullYear(), Math.floor(T.getMonth() / 3) * 3, 1), T, 'Quarter to date'];
        case 'ytd': return [new Date(T.getFullYear(), 0, 1), T, 'Year to date'];
        case 'blackfriday': return [new Date(2025, 10, 28), new Date(2025, 10, 28), 'Black Friday'];
        case 'cybermonday': return [new Date(2025, 11, 1), new Date(2025, 11, 1), 'Cyber Monday'];
        default:
          if (st.preset.startsWith('q:')) {
            const [, y, q] = st.preset.split(':').map(Number);
            return [new Date(y, (q - 1) * 3, 1), new Date(y, q * 3, 0), 'Q' + q + ' ' + y];
          }
          return [fromIso(st.start), fromIso(st.end), fmtD(fromIso(st.start)) + '–' + fmtD(fromIso(st.end))];
      }
    };

    const quarters = () => {
      const out = []; let y = TODAY.getFullYear(), q = Math.floor(TODAY.getMonth() / 3) + 1;
      for (let i = 0; i < 4; i++) { q--; if (q === 0) { q = 4; y--; } out.push([y, q]); }
      return out;
    };

    const parse = (text) => {
      const t = (text || '').trim();
      let m;
      if (/^today$/i.test(t)) return { preset: 'today' };
      if (/^yesterday$/i.test(t)) return { preset: 'yesterday' };
      if ((m = t.match(/^last (\d+) (day|week|month|year)s?$/i))) return { preset: 'last', n: +m[1], unit: m[2].toLowerCase() + 's', today: true };
      if (/^month to date$/i.test(t)) return { preset: 'mtd' };
      if (/^year to date$/i.test(t)) return { preset: 'ytd' };
      return { preset: 'last', n: 30, unit: 'days', today: true };
    };

    document.querySelectorAll('button.c-pill[data-custom="DateRangePicker"]').forEach((pill, idx) => {
      // anchor + chevron
      let anchor = pill.closest('.c-popover-anchor');
      if (!anchor) { anchor = document.createElement('span'); anchor.className = 'c-popover-anchor'; pill.replaceWith(anchor); anchor.append(pill); }
      pill.removeAttribute('data-popover-trigger');
      const labelEl = pill.querySelector('[data-label], [data-cohort-text]') || (() => { const s = document.createElement('span'); s.setAttribute('data-label', ''); s.textContent = pill.textContent.trim(); [...pill.childNodes].forEach((n) => { if (n.nodeType === 3) n.remove(); }); pill.append(s); return s; })();
      const chev = document.createElement('s-icon'); chev.setAttribute('type', 'chevron-down'); chev.setAttribute('size', 'small'); pill.append(chev);
      pill.setAttribute('aria-haspopup', 'dialog'); pill.setAttribute('aria-expanded', 'false');
      anchor.querySelectorAll('.c-popover').forEach((p) => p.remove());

      let applied = parse(labelEl.textContent);
      let draft = { ...applied, n: applied.n || 30, unit: applied.unit || 'days', today: applied.today !== false };
      let view = 'root';
      let dirty = false;

      const pop = document.createElement('div');
      pop.className = 'c-popover c-dp'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Date range'); pop.id = 'dp-' + idx;
      anchor.append(pop);

      const render = () => {
        const [s, e, label] = rangeFor(draft);
        const item = (id, text, extra = '') => `<button type="button" class="c-dp__item" data-preset="${id}" ${draft.preset === id || (id === 'ptd' && ['wtd', 'mtd', 'qtd', 'ytd'].includes(draft.preset)) || (id === 'quarters' && draft.preset.startsWith('q:')) ? 'aria-current="true"' : ''}>${text}${extra}</button>`;
        const arrow = '<s-icon type="chevron-right" size="small"></s-icon>';
        let nav;
        if (view === 'ptd') {
          nav = `<button type="button" class="c-dp__back" data-back><s-icon type="chevron-left" size="small"></s-icon>Period to date</button>` +
            [['wtd', 'Week to date'], ['mtd', 'Month to date'], ['qtd', 'Quarter to date'], ['ytd', 'Year to date']].map(([id, t]) => item(id, t)).join('');
        } else if (view === 'quarters') {
          nav = `<button type="button" class="c-dp__back" data-back><s-icon type="chevron-left" size="small"></s-icon>Quarters</button>` +
            quarters().map(([y, q]) => item('q:' + y + ':' + q, 'Q' + q + ' ' + y)).join('');
        } else {
          nav = item('today', 'Today') + item('yesterday', 'Yesterday') + '<hr>' + item('last', 'Last') + item('ptd', 'Period to date', arrow) + '<hr>' +
            item('blackfriday', 'Black Friday') + item('cybermonday', 'Cyber Monday') + item('quarters', 'Quarters', arrow) + '<hr>' + item('custom', 'Custom range');
        }
        const viewMonth = new Date(e.getFullYear(), e.getMonth() - (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear() ? 0 : 1), 1);
        const lastControls = draft.preset === 'last' ? `
          <div class="c-dp__last">
            <span>Last</span>
            <s-number-field label="Number" labelAccessibilityVisibility="exclusive" value="${draft.n}" min="1" data-dp-n></s-number-field>
            <s-select label="Unit" labelAccessibilityVisibility="exclusive" value="${draft.unit}" data-dp-unit>${UNITS.map((u) => `<s-option value="${u}" ${u === draft.unit ? 'selected' : ''}>${u[0].toUpperCase() + u.slice(1)}</s-option>`).join('')}</s-select>
            <s-checkbox label="Include today" ${draft.today ? 'checked' : ''} data-dp-today></s-checkbox>
          </div>` : (draft.preset === 'custom' ? `
          <div class="c-dp__last">
            <s-date-field label="Start" labelAccessibilityVisibility="exclusive" value="${iso(s)}" data-dp-start></s-date-field>
            <span aria-hidden="true">→</span>
            <s-date-field label="End" labelAccessibilityVisibility="exclusive" value="${iso(e)}" data-dp-end></s-date-field>
          </div>` : '');
        pop.innerHTML = `
          <nav class="c-dp__nav" aria-label="Presets">${nav}</nav>
          <div class="c-dp__main">${lastControls}
            <s-date-picker type="range" visibleMonths="2" value="${iso(s)}--${iso(e)}" view="${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}" disallow="${iso(add(TODAY, 1))}--"></s-date-picker>
          </div>
          <div class="c-dp__footer"><span>${fmtD(s)}–${fmtD(e)}</span><span class="c-row" style="gap:8px"><s-button data-dp-cancel>Cancel</s-button><s-button variant="primary" data-dp-apply ${dirty ? '' : 'disabled'}>Apply</s-button></span></div>`;
        wire();
      };

      const change = () => { dirty = true; render(); };
      const wire = () => {
        pop.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
          const id = b.dataset.preset;
          if (id === 'ptd') { view = 'ptd'; render(); return; }
          if (id === 'quarters') { view = 'quarters'; render(); return; }
          if (id === 'last') draft = { ...draft, preset: 'last', n: draft.n || 30, unit: draft.unit || 'days', today: draft.today !== false };
          else draft = { ...draft, preset: id };
          if (id === 'custom') { const [s, e] = rangeFor(draft); draft = { ...draft, start: iso(s), end: iso(e) }; }
          view = 'root'; change();
        }));
        const back = pop.querySelector('[data-back]'); if (back) back.addEventListener('click', () => { view = 'root'; render(); });
        const n = pop.querySelector('[data-dp-n]');
        if (n) n.addEventListener('change', () => { draft.n = Math.max(1, parseInt(n.value, 10) || 1); change(); });
        const u = pop.querySelector('[data-dp-unit]'); if (u) u.addEventListener('change', () => { draft.unit = u.value; change(); });
        const t = pop.querySelector('[data-dp-today]'); if (t) t.addEventListener('change', () => { draft.today = !!t.checked; change(); });
        const dp = pop.querySelector('s-date-picker');
        dp.addEventListener('change', () => {
          const v = (dp.value || '').split('--');
          if (v.length === 2 && v[0] && v[1]) { draft = { preset: 'custom', start: v[0], end: v[1], n: draft.n, unit: draft.unit, today: draft.today }; view = 'root'; change(); }
        });
        const ds = pop.querySelector('[data-dp-start]'), de = pop.querySelector('[data-dp-end]');
        [ds, de].forEach((f) => f && f.addEventListener('change', () => { draft = { ...draft, preset: 'custom', start: ds.value, end: de.value }; change(); }));
        pop.querySelector('[data-dp-cancel]').addEventListener('click', close);
        pop.querySelector('[data-dp-apply]').addEventListener('click', () => {
          if (!dirty) return;
          applied = { ...draft };
          labelEl.textContent = rangeFor(applied)[2];
          close();
        });
      };

      const open = () => {
        document.querySelectorAll('.c-popover[data-open="true"]').forEach((p) => { if (p !== pop) p.dataset.open = 'false'; });
        draft = { ...applied, n: applied.n || 30, unit: applied.unit || 'days', today: applied.today !== false }; view = 'root'; dirty = false; render();
        pop.dataset.open = 'true'; pill.setAttribute('aria-expanded', 'true'); chev.setAttribute('type', 'chevron-up');
      };
      const close = () => { pop.dataset.open = 'false'; pill.setAttribute('aria-expanded', 'false'); chev.setAttribute('type', 'chevron-down'); };
      pill.addEventListener('click', (ev) => { ev.stopPropagation(); pop.dataset.open === 'true' ? close() : open(); });
      pop.addEventListener('click', (ev) => ev.stopPropagation());
      document.addEventListener('click', () => { if (pop.dataset.open === 'true') close(); });
      document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && pop.dataset.open === 'true') { close(); pill.focus(); } });
    });
  }

  // ---------------------------------------------------------------- popovers
  function popovers() {
    document.querySelectorAll('[data-popover-trigger]').forEach((trigger) => {
      const pop = document.getElementById(trigger.dataset.popoverTrigger);
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = pop.dataset.open !== 'true';
        document.querySelectorAll('.c-popover[data-open="true"]').forEach((p) => { p.dataset.open = 'false'; });
        pop.dataset.open = String(open);
        trigger.setAttribute('aria-expanded', String(open));
      });
      pop.addEventListener('click', (e) => {
        e.stopPropagation();
        const preset = e.target.closest('.c-daterange__presets button');
        if (preset) {
          pop.querySelectorAll('.c-daterange__presets button').forEach((b) => b.setAttribute('aria-pressed', String(b === preset)));
        }
        if (e.target.closest('[data-popover-close]')) {
          if (e.target.closest('[data-apply]') && preset == null) {
            const sel = pop.querySelector('.c-daterange__presets [aria-pressed="true"]');
            const label = trigger.querySelector('[data-label]');
            if (sel && label) label.textContent = sel.dataset.label || sel.textContent.trim();
          }
          pop.dataset.open = 'false';
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.c-popover[data-open="true"]').forEach((p) => { p.dataset.open = 'false'; });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.c-popover[data-open="true"]').forEach((p) => { p.dataset.open = 'false'; });
    });
  }

  // ---------------------------------------------------------------- charts
  function el(name, attrs, parent) {
    const n = document.createElementNS(svgNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Datos de ejemplo: "rand:<semilla>:<largo>:<base>:<ruido>" genera una serie estable y suave
  // (random walk + media móvil, como datos diarios reales); si no, JSON.
  function series(str) {
    if (!str) return null;
    if (!str.startsWith('rand:')) return JSON.parse(str);
    const [, seed, len = 30, base = 100, noise = 60] = str.split(':').map(Number);
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const raw = Array.from({ length: len }, () => base + (rnd() - 0.5) * 2 * noise + (rnd() > 0.9 ? noise * 1.4 : 0));
    const smooth = (a) => a.map((_, i) => (a[Math.max(0, i - 1)] + a[i] * 2 + a[Math.min(a.length - 1, i + 1)]) / 4);
    const out = smooth(smooth(raw));
    return base >= 0 ? out.map((v) => Math.max(0, v)) : out;
  }

  // Curva de Shopify Analytics (medida del SVG real de s-shopifyql-metric-card, 12/10):
  // tangente horizontal en cada punto (picos redondos, nunca sobrepasa los datos), un tramo
  // plano de 0.5% del paso a cada lado del punto y una S con manijas del 59% del tramo.
  function smoothPath(pts) {
    const n = pts.length;
    if (n < 2) return '';
    const f = (v) => +v.toFixed(2);
    let d = '';
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const flat = (x1 - x0) * 0.005;
      const a = x0 + (i === 0 ? 0 : flat), b = x1 - (i === n - 2 ? 0 : flat);
      const h = (b - a) * 0.59;
      d += i === 0 ? `M${f(x0)},${f(y0)}` : `L${f(a)},${f(y0)}`;
      d += `C${f(a + h)},${f(y0)} ${f(b - h)},${f(y1)} ${f(b)},${f(y1)}`;
    }
    return d;
  }

  // Ejes con valores "redondos" (0, 20, 40, 60, 80…), como Shopify.
  function niceTicks(min, max, count = 4) {
    if (min === max) { max = min + 1; }
    const nice = (x, round) => {
      const e = Math.floor(Math.log10(x)), f = x / 10 ** e;
      const nf = round ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
      return nf * 10 ** e;
    };
    const step = nice(nice(max - min, false) / count, true);
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }

  function fmtAxis(v, prefix, suffix) {
    if (suffix === '%') return v.toLocaleString('en-US') + '%';
    const a = Math.abs(v);
    const n = a >= 1e6 ? (v / 1e6).toFixed(a % 1e6 ? 1 : 0) + 'M' : a >= 1000 ? (v / 1000).toFixed(a % 1000 ? 1 : 0) + 'K' : String(Math.round(v * 10) / 10);
    return (v < 0 && prefix ? '-' + prefix + n.replace('-', '') : prefix + n) + suffix;
  }
  function fmtValue(v, prefix, suffix) {
    if (suffix === '%') return v.toFixed(1) + '%';
    const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: prefix ? 2 : 0, maximumFractionDigits: prefix ? 2 : 1 });
    return (v < 0 ? '-' : '') + prefix + s + suffix;
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dayLabel(start, i, withYear) {
    const d = new Date(start + 'T00:00:00'); d.setDate(d.getDate() + i);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? ', ' + d.getFullYear() : ''}`;
  }

  function sparkline(node) {
    const cur = series(node.dataset.spark);
    const prev = series(node.dataset.prev);
    const w = 96, h = 28;
    const all = prev ? cur.concat(prev) : cur;
    const max = Math.max(...all, 1), min = Math.min(...all, 0);
    const sx = (i, n) => (i / (n - 1)) * w;
    const sy = (v) => h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'c-spark', 'aria-hidden': 'true', preserveAspectRatio: 'none' });
    if (prev) el('path', { d: smoothPath(prev.map((v, i) => [sx(i, prev.length), sy(v)])), fill: 'none', stroke: 'var(--c-chart-1)', 'stroke-width': 1.25, 'stroke-dasharray': '2 2', opacity: .7, 'vector-effect': 'non-scaling-stroke' }, svg);
    el('path', { d: smoothPath(cur.map((v, i) => [sx(i, cur.length), sy(v)])), fill: 'none', stroke: 'var(--c-chart-1)', 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
    node.replaceWith(svg);
  }

  let gradId = 0;
  function lineChart(node) {
    const cur = series(node.dataset.line);
    const prev = series(node.dataset.prev);
    const labels = JSON.parse(node.dataset.labels || '[]');
    const suffix = node.dataset.suffix || '';
    const prefix = node.dataset.prefix || '';
    const title = node.dataset.title || (node.closest('.c-card, .c-widget')?.querySelector('.c-card__title')?.textContent || '').trim() || node.dataset.label || '';
    const start = node.dataset.start || '2026-09-12';
    const prevStart = node.dataset.prevStart || '2026-08-13';
    const color = node.dataset.color || 'var(--c-chart-1)';
    const W = 600, H = 220, L = 48, R = 12, T = 12, B = 28;
    const all = prev ? cur.concat(prev) : cur;
    const ticks = niceTicks(Math.min(0, ...all), Math.max(...all));
    const min = ticks[0], max = ticks[ticks.length - 1];
    const sx = (i) => L + (i / (cur.length - 1)) * (W - L - R);
    const sy = (v) => T + (1 - (v - min) / (max - min || 1)) * (H - T - B);

    const wrap = document.createElement('div');
    wrap.className = 'c-chartwrap';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'c-chart', role: 'img', 'aria-label': title ? `${title} over time` : 'Line chart' });
    const gid = 'cg' + (++gradId);
    const defs = el('defs', {}, svg);
    const lg = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': 0.18 }, lg);
    el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }, lg);

    ticks.forEach((v) => {
      const y = sy(v);
      el('line', { x1: L, x2: W - R, y1: y, y2: y, stroke: v === 0 ? '#dcdcdc' : 'var(--c-chart-grid)' }, svg);
      const tx = el('text', { x: L - 8, y: y + 4, 'text-anchor': 'end' }, svg);
      tx.textContent = fmtAxis(v, prefix, suffix);
    });
    labels.forEach((lab, i) => {
      if (!lab) return;
      const idx = Math.round((i / (labels.length - 1)) * (cur.length - 1));
      const anchor = i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle';
      const tx = el('text', { x: sx(idx), y: H - 8, 'text-anchor': anchor }, svg);
      tx.textContent = lab;
    });
    const curPts = cur.map((v, i) => [sx(i), sy(v)]);
    const base = sy(Math.max(min, 0));
    el('path', { d: smoothPath(curPts) + `L${sx(cur.length - 1)},${base}L${sx(0)},${base}Z`, fill: `url(#${gid})` }, svg);
    if (prev) el('path', { d: smoothPath(prev.map((v, i) => [sx(i), sy(v)])), fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-dasharray': '4 4', 'stroke-linecap': 'round' }, svg);
    el('path', { d: smoothPath(curPts), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);

    // Hover: línea vertical + puntos + tooltip oscuro (patrón Shopify Analytics)
    const cross = el('line', { y1: T, y2: H - B, stroke: '#8a8a8a', 'stroke-width': 1, opacity: 0 }, svg);
    const dot = el('circle', { r: 4, fill: color, stroke: '#fff', 'stroke-width': 2, opacity: 0 }, svg);
    const dotPrev = prev ? el('circle', { r: 3.5, fill: '#fff', stroke: color, 'stroke-width': 2, opacity: 0 }, svg) : null;
    const tip = document.createElement('div');
    tip.className = 'c-charttip';
    tip.hidden = true;
    wrap.append(svg, tip);
    const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(cur.length - 1, Math.round(((x - L) / (W - L - R)) * (cur.length - 1))));
      const px = sx(i);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('opacity', 1);
      dot.setAttribute('cx', px); dot.setAttribute('cy', sy(cur[i])); dot.setAttribute('opacity', 1);
      if (dotPrev && prev[i] != null) { dotPrev.setAttribute('cx', px); dotPrev.setAttribute('cy', sy(prev[i])); dotPrev.setAttribute('opacity', 1); }
      tip.innerHTML = `<strong>${title}</strong>
        <div class="c-charttip__row"><i style="background:${color}"></i>${dayLabel(start, i, true)}</div>
        <span class="c-charttip__value">${fmtValue(cur[i], prefix, suffix)}</span>` +
        (prev && prev[i] != null ? `<div class="c-charttip__row"><i class="is-dashed" style="border-color:${color}"></i>${dayLabel(prevStart, i, true)}</div>
        <span class="c-charttip__value">${fmtValue(prev[i], prefix, suffix)}</span>` : '');
      tip.hidden = false;
      const left = (px / W) * r.width;
      tip.style.left = (left + 14 + tip.offsetWidth > r.width ? left - tip.offsetWidth - 14 : left + 14) + 'px';
      tip.style.top = Math.max(0, (sy(cur[i]) / H) * r.height - 20) + 'px';
    });
    hit.addEventListener('mouseleave', () => {
      tip.hidden = true;
      [cross, dot, dotPrev].forEach((n) => n && n.setAttribute('opacity', 0));
    });
    node.replaceWith(wrap);
  }

  function donut(node) {
    const data = JSON.parse(node.dataset.donut); // [[label, value], ...]
    const colors = ['var(--c-chart-1)', 'var(--c-chart-2)', 'var(--c-chart-3)', 'var(--c-chart-4)', 'var(--c-chart-5)'];
    const total = data.reduce((s, d) => s + d[1], 0);
    const r = 70, c = 2 * Math.PI * r;
    const wrap = document.createElement('div');
    wrap.className = 'c-donut';
    const svg = el('svg', { viewBox: '0 0 180 180', role: 'img', 'aria-label': node.dataset.label || 'Donut chart' });
    el('circle', { cx: 90, cy: 90, r, fill: 'none', stroke: '#e6e6e6', 'stroke-width': 24 }, svg);
    let offset = 0;
    if (total > 0) {
      data.forEach(([, v], i) => {
        const len = (v / total) * c;
        el('circle', { cx: 90, cy: 90, r, fill: 'none', stroke: colors[i % colors.length], 'stroke-width': 24,
          'stroke-dasharray': `${Math.max(len - 2, 0)} ${c - Math.max(len - 2, 0)}`, 'stroke-dashoffset': -offset, transform: 'rotate(-90 90 90)' }, svg);
        offset += len;
      });
    }
    const t = el('text', { x: 90, y: 96, 'text-anchor': 'middle', class: 'c-donut__total' }, svg);
    t.textContent = '$' + fmt(total);
    wrap.appendChild(svg);
    if (total > 0) {
      const list = document.createElement('div');
      list.className = 'c-donut__list';
      data.forEach(([label, v], i) => {
        const row = document.createElement('div');
        row.innerHTML = `<span class="c-legend__swatch" style="background:${colors[i % colors.length]}"></span><span>${label}</span><span>$${fmt(v)}</span><span>${Math.round((v / total) * 100)}%</span>`;
        list.appendChild(row);
      });
      wrap.appendChild(list);
    }
    node.replaceWith(wrap);
  }

  // ---------------------------------------------------------------- tooltip de definición de métrica
  // Patrón Shopify Analytics: título con subrayado punteado → tooltip oscuro con nombre, descripción y
  // fórmula (resultado en azul, operandos en verde). En la app sale del catálogo de métricas de Cifra
  // (campos `description` + `equation` del API); aquí son textos de ejemplo salvo Net Profit (texto real).
  const METRIC_DEFS = {
    'Gross Sales': ['Product price multiplied by quantity ordered, before discounts, returns, taxes and shipping.', 'Gross sales = product price × quantity'],
    'Total Discounts': ['Order and line item discounts applied to orders in the period.', 'Total discounts = order discounts + line item discounts'],
    'Total Returns': ['Value of the items customers returned in the period.', 'Total returns = returned items value'],
    'Net Sales': ['Gross sales minus discounts and returns. Excludes Shopify order taxes.', 'Net sales = gross sales − discounts − returns'],
    'Cost of Goods': ['What the products you sold cost you, from Cifra product costs or Shopify cost per item.', 'Cost of goods = unit cost × quantity sold'],
    'Shipping Charged': ['Shipping fees your customers paid on their orders.', 'Shipping charged = shipping lines'],
    'Payment Gateway Fees': ['Processing fees charged by your payment gateways.', 'Payment gateway fees = percentage fee + fixed fee'],
    'Blended Ad Spend': ['Total spend across every connected ad platform.', 'Blended ad spend = Meta ad spend + Google Ads spend'],
    'Gross Profit': ['Net sales minus the cost of the goods you sold.', 'Gross profit = net sales − cost of goods'],
    'Net Profit': ['Net Sales minus every cost Cifra tracks: cost of goods, custom expenses, shipping, payment gateway fees and ad spend.', 'Net profit = net sales − cost of goods − custom expenses − shipping expense − payment gateway fees − blended ad spend'],
    'Gross Profit Margin': ['Share of net sales you keep after cost of goods.', 'Gross profit margin = gross profit / net sales'],
    'Net Profit Margin': ['Share of net sales you keep after every cost.', 'Net profit margin = net profit / net sales'],
    'Discounts by Code': ['Discount amount broken down by discount code.', ''],
    'Payment Fees by Gateway': ['Payment gateway fees broken down by gateway.', ''],
    'Expenses by Category': ['Custom expenses broken down by category.', ''],
  };
  function formulaHtml(f) {
    if (!f) return '';
    const [lhs, rhs] = f.split(' = ');
    const r = rhs.split(/(\s[+−×/-]\s)/).map((p) => /^\s[+−×/-]\s$/.test(p) ? `<span class="op">${p}</span>` : `<span class="arg">${p}</span>`).join('');
    return `<code><span class="res">${lhs}</span><span class="op"> = </span>${r}</code>`;
  }
  function metricTips() {
    const tip = document.createElement('div');
    tip.className = 'c-metrictip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
    const show = (target) => {
      const name = (target.dataset.metric || target.textContent).trim();
      const def = METRIC_DEFS[name];
      if (!def) return;
      tip.innerHTML = `<strong>${name}${def[1] ? '' : ''}</strong><p>${def[0]}</p>${formulaHtml(def[1])}`;
      tip.hidden = false;
      const r = target.getBoundingClientRect();
      const top = r.top - tip.offsetHeight - 8;
      tip.style.top = (top < 8 ? r.bottom + 8 : top) + 'px';
      tip.style.left = Math.max(8, Math.min(r.left - 12, innerWidth - tip.offsetWidth - 8)) + 'px';
    };
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('.c-card__title, [data-metric]');
      if (t) show(t); else tip.hidden = true;
    });
    document.addEventListener('focusin', (e) => { const t = e.target.closest('.c-card__title, [data-metric]'); if (t) show(t); });
    document.addEventListener('scroll', () => { tip.hidden = true; }, true);
  }

  // ---------------------------------------------------------------- table sort
  function sortable() {
    document.querySelectorAll('.c-datatable[data-sortable]').forEach((wrap) => {
      const table = wrap.querySelector('table');
      table.querySelectorAll('thead th button').forEach((btn, col) => {
        btn.addEventListener('click', () => {
          const th = btn.closest('th');
          const dir = th.getAttribute('aria-sort') === 'descending' ? 'ascending' : 'descending';
          table.querySelectorAll('thead th').forEach((x) => x.removeAttribute('aria-sort'));
          th.setAttribute('aria-sort', dir);
          const body = table.tBodies[0];
          const rows = [...body.rows].filter((r) => !r.classList.contains('c-total'));
          const key = (r) => {
            const t = r.cells[col].firstChild.textContent.trim();
            const n = parseFloat(t.replace(/[^0-9.\-]/g, ''));
            return isNaN(n) ? t.toLowerCase() : n;
          };
          rows.sort((a, b) => (key(a) > key(b) ? 1 : -1) * (dir === 'ascending' ? 1 : -1));
          rows.forEach((r) => body.appendChild(r));
        });
      });
    });
  }


  // Gráfica de cohortes (una línea por cohorte). Se dibuja en píxeles reales del contenedor, sin escalar
  // un viewBox: así los trazos de 2px y las fuentes de 11px miden lo mismo que en Shopify Analytics.
  const COHORT_COLORS = ["#13acf0", "#6a42e9", "#597eed", "#d147ac", "#23baba", "#9b3cdd", "#9e84f2", "#128ac0", "#d75eb7", "#305ee8", "#af63e4", "#33dbdb"];
  function cohortChart(node) {
    const series = JSON.parse(node.dataset.series);
    const prefix = node.dataset.prefix || "";
    const title = node.dataset.title || "Cohort chart";
    const H = 290, L = 56, R = 20, T = 10, B = 40;
    const draw = () => {
      const W = node.clientWidth;
      if (!W) return;
      const max = Math.max(...series.flat(), 1);
      const ticks = niceTicks(0, max, 4);
      const top = ticks[ticks.length - 1];
      const n = 12;
      const sx = (i) => L + (i / (n - 1)) * (W - L - R);
      const sy = (v) => T + (1 - v / top) * (H - T - B);
      const svg = el("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": title });
      ticks.forEach((v) => {
        el("line", { x1: L, x2: W - R, y1: sy(v), y2: sy(v), stroke: "#eeeeef" }, svg);
        el("text", { x: L - 8, y: sy(v) + 4, "text-anchor": "end" }, svg).textContent = fmtAxis(v, prefix, "");
      });
      for (let i = 0; i < 11; i++) {
        el("text", { x: sx(i), y: H - 12, "text-anchor": "middle" }, svg).textContent = i === 0 ? "First order" : "Month " + i;
      }
      series.forEach((arr, k) => {
        el("path", { d: smoothPath(arr.map((v, i) => [sx(i), sy(v)])), fill: "none", stroke: COHORT_COLORS[k % COHORT_COLORS.length], "stroke-width": 1.5, "stroke-linecap": "round" }, svg);
      });
      node.replaceChildren(svg);
    };
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(node);
  }
  window.CifraCharts = { sparkline, lineChart, donut, cohortChart };

  // ---------------------------------------------------------------- assets reales de Cifra
  // Extraídos de app.dev.getcifra.com: logos de marca (BrandIcon), TrendArrow y app icon.
  const TREND = { up: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 14 14\" fill=\"none\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"currentColor\" transform=\"translate(3.888889 3.888886)\" d=\"M 0.8484844215647498 0.0000030332918828585626 C 0.7370598545150086 0.0000030316315275496007 0.6267263625823094 0.021949723306510766 0.5237834876635244 0.06459005554587478 C 0.4208406127447395 0.1072303877852388 0.32730440447248477 0.16972930031280412 0.24851534361320352 0.24851836117208537 C 0.16972628275392226 0.32730742203136665 0.10722737444082467 0.42084364716149214 0.06458703798699295 0.5237865220802771 C 0.021946701533161216 0.626729396999062 2.1980161953328669e-16 0.7370628889317613 0 0.8484874559815025 C 1.256009254475924e-16 0.9599120230312438 0.021946701533161216 1.0702454475324596 0.06458703798699295 1.1731883224512445 C 0.10722737444082467 1.2761311973700293 0.16972628275392226 1.3696673887844135 0.24851534361320352 1.4484564496436947 C 0.32730440447248477 1.5272455105029759 0.4208406127447395 1.5897443893147996 0.5237834876635244 1.6323847215541636 C 0.6267263625823094 1.6750250537935276 0.7370598545150086 1.6969718117751247 0.8484844215647498 1.696971810114769 L 3.3260589972680434 1.696971810114769 L 0.38917150085852764 4.632727941095916 C 0.23929520087867404 4.793572258433461 0.15770135775914376 5.006311862248199 0.1615797419533005 5.226127152762602 C 0.16545812614745722 5.445942443277004 0.25450592288210416 5.655671113353146 0.40996298729053693 5.811128177761579 C 0.5654200516989697 5.966585242170011 0.7751486543436286 6.0556328534680794 0.9949639448580306 6.059511237662236 C 1.2147792353724327 6.063389621856393 1.427518569461239 5.981796031604925 1.5883628867987836 5.831919731625072 L 4.5252502483453325 2.897294561483394 L 4.5252502483453325 5.373737906621285 C 4.525250248345333 5.59876996641691 4.614643778148526 5.814585406773014 4.77376547395344 5.973707102577928 C 4.932887169758354 6.132828798382842 5.148702610114458 6.222222328186034 5.373734669910083 6.222222328186035 C 5.598766729705708 6.222222328186034 5.8145821700618106 6.132828798382842 5.9737038658667245 5.973707102577928 C 6.1328255616716385 5.814585406773014 6.222219091474831 5.59876996641691 6.222219091474832 5.373737906621285 L 6.222219091474832 0.8484874559815025 C 6.22251764278713 0.7369791390293872 6.200774687061466 0.626511306723898 6.158240100031466 0.5234336531276811 C 6.1157055130014655 0.4203559995314642 6.053218118614157 0.3267012129956627 5.974369549470781 0.24785264385228706 C 5.895520980327405 0.1690040747089114 5.8018660589286375 0.10651657917437807 5.6987884053324205 0.06398199214437757 C 5.5957107517362035 0.02144740511437706 5.485242986862199 -0.0002955180204146684 5.373734669910083 0.0000030332918828585626 L 0.8484844215647498 0.0000030332918828585626 Z\"/></svg>", down: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 14 14\" fill=\"none\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"currentColor\" transform=\"translate(3.888953 3.888857)\" d=\"M 6.222221586439332 0.8484847955029409 C 6.222221586439331 0.6234526376139051 6.132827792036059 0.40763718087282363 5.97370602926253 0.248515418099295 C 5.8145842664890015 0.08939365532576637 5.598768948825427 1.2560097393902876e-16 5.373736790936391 0 C 5.148704633047355 1.2560097393902876e-16 4.932888944510429 0.08939365532576637 4.7737671817369005 0.248515418099295 C 4.614645418963372 0.40763718087282363 4.525251995433451 0.6234526376139051 4.52525199543345 0.8484847955029409 L 4.52525199543345 3.3260604577112645 L 1.5894947587600825 0.38917164008304184 C 1.5118164652753405 0.30580881427636086 1.418143227011985 0.2389457092644891 1.3140631608103348 0.19257096943048957 C 1.2099830946086847 0.14619622959649003 1.0976286121373278 0.12126002142060285 0.9837021597856932 0.11924992208111718 C 0.8697757074340586 0.1172398227416315 0.756611434589308 0.1381970303281399 0.6509601982030446 0.18087130596305023 C 0.5453089618167812 0.22354558159796056 0.4493353642055311 0.2870625803083904 0.36876465842625805 0.36763328608766344 C 0.288193952646985 0.4482039918669365 0.22467687280800952 0.54417765901694 0.1820025971730992 0.6498288954032034 C 0.13932832153818886 0.7554801317894668 0.1183711255414727 0.8686443582750485 0.12038122488095837 0.982570810626683 C 0.12239132422044405 1.0964972629783176 0.14732753239633123 1.2088517454496746 0.19370227223033076 1.3129318116513247 C 0.2400770120643303 1.4170118778529748 0.30694020979453995 1.5106851161163304 0.3903030356012209 1.5883634096010724 L 3.3249289231155785 4.52525199543345 L 0.8484847955029409 4.52525199543345 C 0.6234526376139051 4.525251995433451 0.40763718087282363 4.614645418963372 0.248515418099295 4.7737671817369005 C 0.08939365532576637 4.932888944510429 2.512019478780575e-16 5.148704633047355 0 5.373736790936391 C 1.8840147120234649e-16 5.598768948825427 0.08939365532576637 5.8145842664890015 0.248515418099295 5.97370602926253 C 0.40763718087282363 6.132827792036059 0.6234526376139051 6.222221586439332 0.8484847955029409 6.222221586439332 L 5.373736790936391 6.222221586439332 C 5.598025927245111 6.22257228270963 5.81327966152584 6.133866353318419 5.972201025201798 5.975595258115504 L 5.973332930670836 5.973332930670836 L 5.975595258115504 5.972201025201798 C 6.133866353318419 5.81327966152584 6.22257228270963 5.598025927245111 6.222221586439332 5.373736790936391 L 6.222221586439332 0.8484847955029409 Z\"/></svg>" };
  function hydrate(root = document) {
    root.querySelectorAll('.c-source:not([data-hydrated])').forEach((el) => {
      const MARKS = { shopify: 'shopify-mark' }; // versión recortada al glifo: se ve nítida a 14-16px
      const key = el.dataset.source || 'shopify';
      const src = MARKS[key] || key;
      el.innerHTML = '<img src="assets/logos/' + src + '.svg" alt="">';
      el.setAttribute('data-hydrated', '');
    });
    root.querySelectorAll('.c-delta--up:not([data-hydrated]), .c-delta--down:not([data-hydrated])').forEach((el) => {
      const dir = el.classList.contains('c-delta--up') ? 'up' : 'down';
      el.innerHTML = TREND[dir] + el.textContent.replace(/^[\s↗↘↑↓]+/, '');
      el.setAttribute('data-hydrated', '');
    });
    root.querySelectorAll('.c-prompt__logo, .c-editor__appicon').forEach((el) => {
      el.innerHTML = '<img src="assets/img/cifra-icon-blue.svg" alt="">';
    });
  }
  window.CifraAssets = { hydrate };

  document.addEventListener('DOMContentLoaded', () => {
    protoBar();
    hydrate();
    metricTips();
    datePickers();
    tabs();
    popovers();
    document.querySelectorAll('[data-spark]').forEach(sparkline);
    document.querySelectorAll('[data-line]').forEach(lineChart);
    document.querySelectorAll('[data-donut]').forEach(donut);
    document.querySelectorAll('[data-cohort-chart]').forEach(cohortChart);
    sortable();
  });
})();
